import { ResetPasswordUseCase } from './reset-password.use-case';
import { UserRepository } from '../../../users/domain/repositories/user.repository';
import { PasswordHasher } from '../ports/password-hasher.port';
import { User } from '../../../users/domain/entities/user';
import { Role } from '../../../users/domain/entities/role';
import { BadRequestException, NotFoundException } from '@nestjs/common';

describe('ResetPasswordUseCase', () => {
  let useCase: ResetPasswordUseCase;
  let mockUserRepository: jest.Mocked<UserRepository>;
  let mockPasswordHasher: jest.Mocked<PasswordHasher>;

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

    mockPasswordHasher = {
      hash: jest.fn().mockResolvedValue('new_hash_123'),
      compare: jest.fn(),
    };

    useCase = new ResetPasswordUseCase(mockUserRepository, mockPasswordHasher);
  });

  it('should throw NotFoundException if user not found', async () => {
    mockUserRepository.findByEmail.mockResolvedValue(null);

    await expect(
      useCase.execute({
        email: 'unknown@example.com',
        code: '123456',
        newPassword: 'newPassword123',
      }),
    ).rejects.toThrow(NotFoundException);
  });

  it('should throw BadRequestException if code does not match', async () => {
    const user = new User(
      'u1',
      'user@example.com',
      'old_hash',
      'User',
      'ACTIVE',
      0,
      0,
      null,
      null,
      [new Role('r1', 'USER', 'User')],
      new Date(),
      new Date(),
      true,
      null,
      null,
      '888888',
      new Date(Date.now() + 10 * 60 * 1000),
    );
    mockUserRepository.findByEmail.mockResolvedValue(user);

    await expect(
      useCase.execute({
        email: 'user@example.com',
        code: '123456',
        newPassword: 'newPassword123',
      }),
    ).rejects.toThrow(BadRequestException);
  });

  it('should throw BadRequestException if code is expired', async () => {
    const user = new User(
      'u1',
      'user@example.com',
      'old_hash',
      'User',
      'ACTIVE',
      0,
      0,
      null,
      null,
      [new Role('r1', 'USER', 'User')],
      new Date(),
      new Date(),
      true,
      null,
      null,
      '123456',
      new Date(Date.now() - 1000), // Expired
    );
    mockUserRepository.findByEmail.mockResolvedValue(user);

    await expect(
      useCase.execute({
        email: 'user@example.com',
        code: '123456',
        newPassword: 'newPassword123',
      }),
    ).rejects.toThrow(BadRequestException);
  });

  it('should successfully hash new password, reset password and save user', async () => {
    const user = new User(
      'u1',
      'user@example.com',
      'old_hash',
      'User',
      'ACTIVE',
      0,
      0,
      null,
      null,
      [new Role('r1', 'USER', 'User')],
      new Date(),
      new Date(),
      true,
      null,
      null,
      '123456',
      new Date(Date.now() + 10 * 60 * 1000),
    );
    mockUserRepository.findByEmail.mockResolvedValue(user);
    mockUserRepository.save.mockResolvedValue(user);

    const result = await useCase.execute({
      email: 'user@example.com',
      code: '123456',
      newPassword: 'newPassword123',
    });

    expect(mockPasswordHasher.hash).toHaveBeenCalledWith('newPassword123');
    expect(mockUserRepository.save).toHaveBeenCalled();
    expect(user.getPasswordHash()).toBe('new_hash_123');
    expect(result.message).toContain('Đặt lại mật khẩu thành công');
  });
});
