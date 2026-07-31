/* eslint-disable @typescript-eslint/unbound-method */
import { UpdateUserRolesUseCase } from './update-user-roles.use-case';
import { UserRepository } from '../../domain/repositories/user.repository';
import { User } from '../../domain/entities/user';
import { UserNotFoundError } from '../../domain/errors/users.errors';
import { Role } from '../../domain/entities/role';

describe('UpdateUserRolesUseCase', () => {
  let useCase: UpdateUserRolesUseCase;
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

    useCase = new UpdateUserRolesUseCase(mockUserRepository);
  });

  it('should throw UserNotFoundError if target user does not exist', async () => {
    mockUserRepository.findById.mockResolvedValue(null);

    await expect(
      useCase.execute({
        targetUserId: 'non-existent-user',
        roles: ['ADMIN'],
      }),
    ).rejects.toThrow(UserNotFoundError);

    expect(mockUserRepository.updateRoles).not.toHaveBeenCalled();
  });

  it('should call repository.updateRoles and return updated user', async () => {
    const existingUser = new User(
      'user-1',
      'user1@example.com',
      'hash_123',
      'User One',
      'ACTIVE',
    );
    const updatedUser = new User(
      'user-1',
      'user1@example.com',
      'hash_123',
      'User One',
      'ACTIVE',
      0,
      0,
      null,
      null,
      [new Role('r-1', 'USER', 'User'), new Role('r-2', 'ADMIN', 'Admin')],
    );

    mockUserRepository.findById.mockResolvedValue(existingUser);
    mockUserRepository.updateRoles.mockResolvedValue(updatedUser);

    const result = await useCase.execute({
      targetUserId: 'user-1',
      roles: ['USER', 'ADMIN'],
    });

    expect(mockUserRepository.updateRoles).toHaveBeenCalledWith('user-1', [
      'USER',
      'ADMIN',
    ]);
    expect(result.getRoles().map((r) => r.code)).toEqual(['USER', 'ADMIN']);
  });
});
