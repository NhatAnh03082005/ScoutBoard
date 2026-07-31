import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import {
  UserRepository,
  UserQueryOptions,
} from '../../../../domain/repositories/user.repository';
import { User } from '../../../../domain/entities/user';
import { Role } from '../../../../domain/entities/role';
import { UserOrmEntity } from '../entities/user.orm-entity';
import { RoleOrmEntity } from '../entities/role.orm-entity';
import { UserRoleOrmEntity } from '../entities/user-role.orm-entity';
import { UserMapper } from '../mappers/user.mapper';

@Injectable()
export class TypeOrmUserRepository implements UserRepository {
  constructor(
    @InjectRepository(UserOrmEntity)
    private readonly userRepository: Repository<UserOrmEntity>,
    @InjectRepository(RoleOrmEntity)
    private readonly roleRepository: Repository<RoleOrmEntity>,
    @InjectRepository(UserRoleOrmEntity)
    private readonly userRoleRepository: Repository<UserRoleOrmEntity>,
  ) {}

  async findById(id: string): Promise<User | null> {
    const entity = await this.userRepository.findOne({
      where: { id },
      relations: ['userRoles', 'userRoles.role'],
    });

    return entity ? UserMapper.toDomain(entity) : null;
  }

  async findByEmail(email: string): Promise<User | null> {
    const entity = await this.userRepository.findOne({
      where: { email: email.toLowerCase().trim() },
      relations: ['userRoles', 'userRoles.role'],
    });

    return entity ? UserMapper.toDomain(entity) : null;
  }

  async create(data: {
    email: string;
    passwordHash: string;
    fullName: string;
  }): Promise<User> {
    const entity = this.userRepository.create({
      email: data.email.toLowerCase().trim(),
      passwordHash: data.passwordHash,
      fullName: data.fullName.trim(),
      status: 'ACTIVE',
      failedLoginAttempts: 0,
      lockoutCount: 0,
      lockedUntil: null,
      lastFailedLoginAt: null,
    });

    const savedUser = await this.userRepository.save(entity);

    // Assign default 'USER' role if exists
    const defaultRole = await this.roleRepository.findOne({
      where: { code: 'USER' },
    });

    if (defaultRole) {
      const userRole = this.userRoleRepository.create({
        userId: savedUser.id,
        roleId: defaultRole.id,
      });
      await this.userRoleRepository.save(userRole);
    }

    const fetched = await this.findById(savedUser.id);
    return fetched!;
  }

  async save(user: User): Promise<User> {
    const entity = UserMapper.toPersistence(user);
    await this.userRepository.save(entity);
    const updated = await this.findById(user.id);
    return updated!;
  }

  async findAllAdmin(query: UserQueryOptions): Promise<User[]> {
    const queryBuilder = this.userRepository
      .createQueryBuilder('user')
      .leftJoinAndSelect('user.userRoles', 'userRole')
      .leftJoinAndSelect('userRole.role', 'role')
      .orderBy('user.createdAt', 'DESC');

    if (query.search) {
      const searchPattern = `%${query.search.trim()}%`;
      queryBuilder.andWhere(
        '(user.email ILIKE :search OR user.fullName ILIKE :search)',
        { search: searchPattern },
      );
    }

    if (query.status) {
      queryBuilder.andWhere('user.status = :status', { status: query.status });
    }

    if (query.role) {
      queryBuilder.andWhere('role.code = :role', { role: query.role });
    }

    const entities = await queryBuilder.getMany();
    return entities.map((e) => UserMapper.toDomain(e));
  }

  async updateRoles(userId: string, roleCodes: string[]): Promise<User> {
    const roles = await this.roleRepository.find({
      where: { code: In(roleCodes) },
    });

    if (roles.length !== roleCodes.length) {
      throw new Error('Một hoặc nhiều vai trò không hợp lệ');
    }

    await this.userRoleRepository.delete({ userId });

    const newRoles = roles.map((role) =>
      this.userRoleRepository.create({
        userId,
        roleId: role.id,
      }),
    );

    await this.userRoleRepository.save(newRoles);

    const updatedUser = await this.findById(userId);
    return updatedUser!;
  }

  async findRoleByCode(code: string): Promise<Role | null> {
    const entity = await this.roleRepository.findOne({ where: { code } });
    if (!entity) return null;
    return new Role(entity.id, entity.code, entity.name, entity.createdAt);
  }
}
