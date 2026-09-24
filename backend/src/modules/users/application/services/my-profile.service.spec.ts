import { BadRequestException } from '@nestjs/common';
import { MyProfileService } from './my-profile.service';
import { UserOrmEntity } from '../../infrastructure/persistence/typeorm/entities/user.orm-entity';

describe('MyProfileService', () => {
  const createUserEntity = (): UserOrmEntity =>
    ({
      id: 'user-1',
      email: 'scout@example.com',
      passwordHash: 'old-hash',
      fullName: 'Old Name',
      avatarUrl: null,
      status: 'ACTIVE',
      failedLoginAttempts: 0,
      lockoutCount: 0,
      lockedUntil: null,
      lastFailedLoginAt: null,
      userRoles: [
        {
          role: {
            id: 'role-1',
            code: 'USER',
            name: 'User',
            createdAt: new Date('2026-01-01'),
          },
        },
      ],
      refreshTokens: [],
      createdAt: new Date('2026-01-01'),
      updatedAt: new Date('2026-01-01'),
    }) as UserOrmEntity;

  it('updates and trims the current user display name', async () => {
    const user = createUserEntity();
    const repository = {
      findOne: jest.fn().mockResolvedValue(user),
      save: jest.fn().mockResolvedValue(user),
    };
    const dataSource = { getRepository: jest.fn().mockReturnValue(repository) };
    const service = new MyProfileService(
      dataSource as any,
      { compare: jest.fn(), hash: jest.fn() } as any,
      {} as any,
    );

    const result = await service.updateProfile(user.id, '  New Scout Name  ');

    expect(user.fullName).toBe('New Scout Name');
    expect(repository.save).toHaveBeenCalledWith(user);
    expect(result.fullName).toBe('New Scout Name');
    expect(result.roles).toEqual(['USER']);
  });

  it('rejects a password change when the current password is wrong', async () => {
    const user = createUserEntity();
    const save = jest.fn();
    const userQueryBuilder = {
      setLock: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      getOne: jest.fn().mockResolvedValue(user),
    };
    const manager = {
      getRepository: jest.fn().mockReturnValue({
        createQueryBuilder: jest.fn().mockReturnValue(userQueryBuilder),
        save,
      }),
    };
    const dataSource = {
      transaction: jest.fn(async (callback) => callback(manager)),
    };
    const passwordHasher = {
      compare: jest.fn().mockResolvedValue(false),
      hash: jest.fn(),
    };
    const service = new MyProfileService(
      dataSource as any,
      passwordHasher as any,
      {} as any,
    );

    await expect(
      service.changePassword(user.id, 'wrong-password', 'new-password-123'),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(save).not.toHaveBeenCalled();
  });

  it('hashes the new password and revokes every active refresh token', async () => {
    const user = createUserEntity();
    const userQueryBuilder = {
      setLock: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      getOne: jest.fn().mockResolvedValue(user),
    };
    const revokeQueryBuilder = {
      update: jest.fn().mockReturnThis(),
      set: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      execute: jest.fn().mockResolvedValue({ affected: 2 }),
    };
    const userRepository = {
      createQueryBuilder: jest.fn().mockReturnValue(userQueryBuilder),
      save: jest.fn().mockResolvedValue(user),
    };
    const refreshRepository = {
      createQueryBuilder: jest.fn().mockReturnValue(revokeQueryBuilder),
    };
    const manager = {
      getRepository: jest
        .fn()
        .mockImplementation((entity) =>
          entity === UserOrmEntity ? userRepository : refreshRepository,
        ),
    };
    const dataSource = {
      transaction: jest.fn(async (callback) => callback(manager)),
    };
    const passwordHasher = {
      compare: jest.fn().mockResolvedValueOnce(true).mockResolvedValueOnce(false),
      hash: jest.fn().mockResolvedValue('new-hash'),
    };
    const service = new MyProfileService(
      dataSource as any,
      passwordHasher as any,
      {} as any,
    );

    const result = await service.changePassword(
      user.id,
      'current-password',
      'new-password-123',
    );

    expect(user.passwordHash).toBe('new-hash');
    expect(userRepository.save).toHaveBeenCalledWith(user);
    expect(revokeQueryBuilder.andWhere).toHaveBeenCalledWith(
      'revoked_at IS NULL',
    );
    expect(revokeQueryBuilder.execute).toHaveBeenCalled();
    expect(result.message).toContain('Please log in again');
  });
});
