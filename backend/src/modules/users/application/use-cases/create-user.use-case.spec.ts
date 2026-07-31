/* eslint-disable @typescript-eslint/unbound-method */
import { CreateUserUseCase } from './create-user.use-case';
import { UserRepository } from '../../domain/repositories/user.repository';
import { User } from '../../domain/entities/user';
import { UserEmailConflictError } from '../../domain/errors/users.errors';

describe('CreateUserUseCase', () => {
  let useCase: CreateUserUseCase;
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

    useCase = new CreateUserUseCase(mockUserRepository);
  });

  it('should throw UserEmailConflictError if email is already registered', async () => {
    const existingUser = new User(
      'user-1',
      'existing@example.com',
      'hash_123',
      'Existing User',
      'ACTIVE',
    );
    mockUserRepository.findByEmail.mockResolvedValue(existingUser);

    await expect(
      useCase.execute({
        email: 'existing@example.com',
        passwordHash: 'hash_123',
        fullName: 'New User',
      }),
    ).rejects.toThrow(UserEmailConflictError);

    expect(mockUserRepository.create).not.toHaveBeenCalled();
  });

  it('should create and return new user if email is available', async () => {
    const newUser = new User(
      'user-2',
      'new@example.com',
      'hash_456',
      'New User',
      'ACTIVE',
    );

    mockUserRepository.findByEmail.mockResolvedValue(null);
    mockUserRepository.create.mockResolvedValue(newUser);

    const result = await useCase.execute({
      email: 'new@example.com',
      passwordHash: 'hash_456',
      fullName: 'New User',
    });

    expect(mockUserRepository.findByEmail).toHaveBeenCalledWith(
      'new@example.com',
    );
    expect(mockUserRepository.create).toHaveBeenCalledWith({
      email: 'new@example.com',
      passwordHash: 'hash_456',
      fullName: 'New User',
    });
    expect(result).toBe(newUser);
  });
});
