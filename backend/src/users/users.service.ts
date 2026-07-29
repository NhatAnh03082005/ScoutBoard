import {
  Injectable,
  ConflictException,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { User } from './entities/user.entity';
import { Role } from '../roles/entities/role.entity';
import { UserRole } from '../roles/entities/user-role.entity';
import { UserQueryDto, UserStatusEnum } from './dto/admin-user.dto';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Role)
    private readonly roleRepository: Repository<Role>,
    @InjectRepository(UserRole)
    private readonly userRoleRepository: Repository<UserRole>,
  ) {}

  async findByEmail(email: string): Promise<User | null> {
    return this.userRepository.findOne({
      where: { email: email.toLowerCase().trim() },
      relations: ['userRoles', 'userRoles.role'],
    });
  }

  async findById(id: string): Promise<User | null> {
    return this.userRepository.findOne({
      where: { id },
      relations: ['userRoles', 'userRoles.role'],
    });
  }

  async createUser(data: {
    email: string;
    passwordHash: string;
    fullName: string;
  }): Promise<User> {
    const existing = await this.findByEmail(data.email);
    if (existing) {
      throw new ConflictException('Email này đã được sử dụng');
    }

    const user = this.userRepository.create({
      email: data.email.toLowerCase().trim(),
      passwordHash: data.passwordHash,
      fullName: data.fullName.trim(),
      status: 'ACTIVE',
      failedLoginAttempts: 0,
      lockoutCount: 0,
      lockedUntil: null,
      lastFailedLoginAt: null,
    });

    const savedUser = await this.userRepository.save(user);

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

    return this.findById(savedUser.id) as Promise<User>;
  }

  // --- Admin Operations ---

  async findAllForAdmin(query: UserQueryDto) {
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

    const users = await queryBuilder.getMany();
    const nowMs = Date.now();

    // Compute effectiveStatus and isTemporarilyLocked for Admin UI
    return users.map((u) => {
      const { passwordHash, ...result } = u;

      const isTemporarilyLocked =
        u.lockedUntil !== null &&
        new Date(u.lockedUntil).getTime() > nowMs;

      let effectiveStatus: 'ACTIVE' | 'DISABLED' | 'LOCKED' = 'ACTIVE';
      if (u.status === 'DISABLED') {
        effectiveStatus = 'DISABLED';
      } else if (u.status === 'LOCKED' || isTemporarilyLocked) {
        effectiveStatus = 'LOCKED';
      } else {
        effectiveStatus = 'ACTIVE';
      }

      return {
        ...result,
        isTemporarilyLocked,
        effectiveStatus,
      };
    });
  }

  async updateStatus(
    targetUserId: string,
    status: UserStatusEnum,
    currentAdminId: string,
  ) {
    // Constraint A5.1: Admin cannot disable/lock self
    if (
      targetUserId === currentAdminId &&
      status !== UserStatusEnum.ACTIVE
    ) {
      throw new BadRequestException(
        'ADMIN không thể tự vô hiệu hóa hoặc khóa chính tài khoản của mình',
      );
    }

    const user = await this.userRepository.findOne({
      where: { id: targetUserId },
    });

    if (!user) {
      throw new NotFoundException('Tài khoản người dùng không tồn tại');
    }

    user.status = status;

    // Reset lockout metadata when Admin sets status to ACTIVE
    if (status === UserStatusEnum.ACTIVE) {
      user.failedLoginAttempts = 0;
      user.lockoutCount = 0;
      user.lockedUntil = null;
      user.lastFailedLoginAt = null;
    }

    await this.userRepository.save(user);

    return this.findById(targetUserId);
  }

  async unlockUser(targetUserId: string) {
    const user = await this.userRepository.findOne({
      where: { id: targetUserId },
    });

    if (!user) {
      throw new NotFoundException('Tài khoản người dùng không tồn tại');
    }

    user.status = 'ACTIVE';
    user.failedLoginAttempts = 0;
    user.lockoutCount = 0;
    user.lockedUntil = null;
    user.lastFailedLoginAt = null;

    await this.userRepository.save(user);

    return this.findById(targetUserId);
  }

  async updateRoles(targetUserId: string, roleCodes: string[]) {
    const user = await this.userRepository.findOne({
      where: { id: targetUserId },
    });

    if (!user) {
      throw new NotFoundException('Tài khoản người dùng không tồn tại');
    }

    const roles = await this.roleRepository.find({
      where: { code: In(roleCodes) },
    });

    if (roles.length !== roleCodes.length) {
      throw new BadRequestException('Một hoặc nhiều vai trò không hợp lệ');
    }

    // Clear existing roles and assign new ones
    await this.userRoleRepository.delete({ userId: targetUserId });

    const newRoles = roles.map((role) =>
      this.userRoleRepository.create({
        userId: targetUserId,
        roleId: role.id,
      }),
    );

    await this.userRoleRepository.save(newRoles);

    return this.findById(targetUserId);
  }
}
