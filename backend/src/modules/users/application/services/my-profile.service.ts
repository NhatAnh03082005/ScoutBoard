import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { DataSource } from 'typeorm';
import {
  PASSWORD_HASHER,
  PasswordHasher,
} from '../../../auth/application/ports/password-hasher.port';
import { RefreshTokenOrmEntity } from '../../../auth/infrastructure/persistence/typeorm/entities/refresh-token.orm-entity';
import { UserOrmEntity } from '../../infrastructure/persistence/typeorm/entities/user.orm-entity';
import { UserMapper } from '../../infrastructure/persistence/typeorm/mappers/user.mapper';
import {
  AvatarStorageService,
  UploadedAvatarFile,
} from '../../infrastructure/storage/avatar-storage.service';

@Injectable()
export class MyProfileService {
  constructor(
    private readonly dataSource: DataSource,
    @Inject(PASSWORD_HASHER)
    private readonly passwordHasher: PasswordHasher,
    private readonly avatarStorage: AvatarStorageService,
  ) {}

  async updateProfile(userId: string, fullName: string) {
    const repository = this.dataSource.getRepository(UserOrmEntity);
    const user = await repository.findOne({
      where: { id: userId },
      relations: ['userRoles', 'userRoles.role'],
    });

    if (!user) throw new NotFoundException('User account was not found.');

    user.fullName = fullName.trim();
    await repository.save(user);
    return this.toProfile(user);
  }

  async changePassword(
    userId: string,
    currentPassword: string,
    newPassword: string,
  ): Promise<{ message: string }> {
    await this.dataSource.transaction(async (manager) => {
      const repository = manager.getRepository(UserOrmEntity);
      const user = await repository
        .createQueryBuilder('user')
        .setLock('pessimistic_write')
        .where('user.id = :userId', { userId })
        .getOne();

      if (!user) throw new NotFoundException('User account was not found.');

      const currentPasswordMatches = await this.passwordHasher.compare(
        currentPassword,
        user.passwordHash,
      );
      if (!currentPasswordMatches) {
        throw new BadRequestException('Current password is incorrect.');
      }

      const reusesCurrentPassword = await this.passwordHasher.compare(
        newPassword,
        user.passwordHash,
      );
      if (reusesCurrentPassword) {
        throw new BadRequestException(
          'New password must be different from the current password.',
        );
      }

      user.passwordHash = await this.passwordHasher.hash(newPassword);
      await repository.save(user);

      await manager
        .getRepository(RefreshTokenOrmEntity)
        .createQueryBuilder()
        .update(RefreshTokenOrmEntity)
        .set({ revokedAt: new Date() })
        .where('user_id = :userId', { userId })
        .andWhere('revoked_at IS NULL')
        .execute();
    });

    return { message: 'Password changed successfully. Please log in again.' };
  }

  async updateAvatar(userId: string, file: UploadedAvatarFile) {
    const repository = this.dataSource.getRepository(UserOrmEntity);
    const user = await repository.findOne({
      where: { id: userId },
      relations: ['userRoles', 'userRoles.role'],
    });

    if (!user) throw new NotFoundException('User account was not found.');

    user.avatarUrl = await this.avatarStorage.upload(userId, file);
    await repository.save(user);
    return this.toProfile(user);
  }

  async removeAvatar(userId: string) {
    const repository = this.dataSource.getRepository(UserOrmEntity);
    const user = await repository.findOne({
      where: { id: userId },
      relations: ['userRoles', 'userRoles.role'],
    });

    if (!user) throw new NotFoundException('User account was not found.');

    if (user.avatarUrl) await this.avatarStorage.remove(userId);
    user.avatarUrl = null;
    await repository.save(user);
    return this.toProfile(user);
  }

  private toProfile(entity: UserOrmEntity) {
    const profile = UserMapper.toDomain(entity).sanitize();
    return {
      ...profile,
      roles: profile.userRoles.map((userRole) => userRole.role.code),
    };
  }
}
