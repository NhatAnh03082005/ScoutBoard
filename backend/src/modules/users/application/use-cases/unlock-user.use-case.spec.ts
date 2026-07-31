/* eslint-disable @typescript-eslint/unbound-method */
import { UnlockUserUseCase } from './unlock-user.use-case';
import { UserRepository } from '../../domain/repositories/user.repository';
import { User } from '../../domain/entities/user';
import { UserNotFoundError } from '../../domain/errors/users.errors';

describe('UnlockUserUseCase', () => {
  let useCase: UnlockUserUseCase;
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

    useCase = new UnlockUserUseCase(mockUserRepository);
  });

  it('should throw UserNotFoundError if user does not exist', async () => {
    mockUserRepository.findById.mockResolvedValue(null);

    await expect(useCase.execute('non-existent-user')).rejects.toThrow(
      UserNotFoundError,
    );
  });

  it('should activate locked user and reset lockout metadata', async () => {
    const lockedUser = new User(
      'user-1',
      'locked@example.com',
      'hash_123',
      'Locked User',
      'LOCKED',
      5,
      2,
      new Date(Date.now() + 3600000),
      new Date(),
    );

    mockUserRepository.findById.mockResolvedValue(lockedUser);
    mockUserRepository.save.mockImplementation((user) => Promise.resolve(user));

    const result = await useCase.execute('user-1');

    expect(result.getStatus()).toBe('ACTIVE');
    expect(result.getFailedLoginAttempts()).toBe(0);
    expect(result.getLockoutCount()).toBe(0);
    expect(result.getLockedUntil()).toBeNull();
    expect(result.getLastFailedLoginAt()).toBeNull();
    expect(mockUserRepository.save).toHaveBeenCalledWith(lockedUser);
  });
});
