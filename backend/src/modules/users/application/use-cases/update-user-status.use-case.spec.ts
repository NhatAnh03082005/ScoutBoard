/* eslint-disable @typescript-eslint/unbound-method */
import { UpdateUserStatusUseCase } from './update-user-status.use-case';
import { UserRepository } from '../../domain/repositories/user.repository';
import { User } from '../../domain/entities/user';
import {
  CannotDisableSelfError,
  UserNotFoundError,
} from '../../domain/errors/users.errors';

describe('UpdateUserStatusUseCase', () => {
  let useCase: UpdateUserStatusUseCase;
  let mockUserRepository: jest.Mocked<UserRepository>;

  beforeEach(() => {
    mockUserRepository = {
      findById: jest.fn(),
      findByEmail: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
      findAllAdmin: jest.fn(),
      updateRoles: jest.fn(),
      findRoleByCode: jest.fn(),
    };

    useCase = new UpdateUserStatusUseCase(mockUserRepository);
  });

  it('should throw CannotDisableSelfError if admin attempts to disable themselves', async () => {
    await expect(
      useCase.execute({
        targetUserId: 'admin-1',
        status: 'DISABLED',
        adminId: 'admin-1',
      }),
    ).rejects.toThrow(CannotDisableSelfError);

    expect(mockUserRepository.findById).not.toHaveBeenCalled();
  });

  it('should throw UserNotFoundError if target user does not exist', async () => {
    mockUserRepository.findById.mockResolvedValue(null);

    await expect(
      useCase.execute({
        targetUserId: 'non-existent-user',
        status: 'DISABLED',
        adminId: 'admin-1',
      }),
    ).rejects.toThrow(UserNotFoundError);

    expect(mockUserRepository.findById).toHaveBeenCalledWith(
      'non-existent-user',
    );
  });

  it('should successfully disable another user and save changes', async () => {
    const targetUser = new User(
      'user-2',
      'user2@test.com',
      'hashed_pass',
      'User Two',
      'ACTIVE',
    );

    mockUserRepository.findById.mockResolvedValue(targetUser);
    mockUserRepository.save.mockImplementation((user) => Promise.resolve(user));

    const result = await useCase.execute({
      targetUserId: 'user-2',
      status: 'DISABLED',
      adminId: 'admin-1',
    });

    expect(result.getStatus()).toBe('DISABLED');
    expect(mockUserRepository.save).toHaveBeenCalledWith(targetUser);
  });

  it('should reset lockout metadata when admin activates a user', async () => {
    const lockedUser = new User(
      'user-3',
      'user3@test.com',
      'hashed_pass',
      'User Three',
      'LOCKED',
      5,
      2,
      new Date(Date.now() + 600000),
      new Date(),
    );

    mockUserRepository.findById.mockResolvedValue(lockedUser);
    mockUserRepository.save.mockImplementation((user) => Promise.resolve(user));

    const result = await useCase.execute({
      targetUserId: 'user-3',
      status: 'ACTIVE',
      adminId: 'admin-1',
    });

    expect(result.getStatus()).toBe('ACTIVE');
    expect(result.getFailedLoginAttempts()).toBe(0);
    expect(result.getLockoutCount()).toBe(0);
    expect(result.getLockedUntil()).toBeNull();
    expect(result.getLastFailedLoginAt()).toBeNull();
    expect(mockUserRepository.save).toHaveBeenCalledWith(lockedUser);
  });
});
