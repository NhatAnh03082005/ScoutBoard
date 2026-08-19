import { VerifyEmailUseCase } from './verify-email.use-case';
import { UserRepository } from '../../../users/domain/repositories/user.repository';
import { User } from '../../../users/domain/entities/user';
import { Role } from '../../../users/domain/entities/role';
import { BadRequestException, NotFoundException } from '@nestjs/common';

describe('VerifyEmailUseCase', () => {
  let useCase: VerifyEmailUseCase;
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

    useCase = new VerifyEmailUseCase(mockUserRepository);
  });

  it('should throw NotFoundException if user does not exist', async () => {
    mockUserRepository.findByEmail.mockResolvedValue(null);

    await expect(
      useCase.execute({ email: 'unknown@example.com', code: '123456' }),
    ).rejects.toThrow(NotFoundException);
  });

  it('should return early if email is already verified', async () => {
    const user = new User(
      'u1',
      'test@example.com',
      'hash',
      'Test',
      'ACTIVE',
      0,
      0,
      null,
      null,
      [new Role('r1', 'USER', 'User')],
      new Date(),
      new Date(),
      true, // isEmailVerified = true
    );
    mockUserRepository.findByEmail.mockResolvedValue(user);

    const result = await useCase.execute({
      email: 'test@example.com',
      code: '123456',
    });

    expect(result.message).toContain('Email này đã được xác thực trước đó');
  });

  it('should throw BadRequestException if OTP code does not match', async () => {
    const user = new User(
      'u1',
      'test@example.com',
      'hash',
      'Test',
      'ACTIVE',
      0,
      0,
      null,
      null,
      [new Role('r1', 'USER', 'User')],
      new Date(),
      new Date(),
      false,
      '999999',
      new Date(Date.now() + 10 * 60 * 1000),
    );
    mockUserRepository.findByEmail.mockResolvedValue(user);

    await expect(
      useCase.execute({ email: 'test@example.com', code: '123456' }),
    ).rejects.toThrow(BadRequestException);
  });

  it('should throw BadRequestException if OTP code has expired', async () => {
    const user = new User(
      'u1',
      'test@example.com',
      'hash',
      'Test',
      'ACTIVE',
      0,
      0,
      null,
      null,
      [new Role('r1', 'USER', 'User')],
      new Date(),
      new Date(),
      false,
      '123456',
      new Date(Date.now() - 1000), // Expired
    );
    mockUserRepository.findByEmail.mockResolvedValue(user);

    await expect(
      useCase.execute({ email: 'test@example.com', code: '123456' }),
    ).rejects.toThrow(BadRequestException);
  });

  it('should successfully verify email and save user', async () => {
    const user = new User(
      'u1',
      'test@example.com',
      'hash',
      'Test',
      'ACTIVE',
      0,
      0,
      null,
      null,
      [new Role('r1', 'USER', 'User')],
      new Date(),
      new Date(),
      false,
      '123456',
      new Date(Date.now() + 10 * 60 * 1000),
    );
    mockUserRepository.findByEmail.mockResolvedValue(user);
    mockUserRepository.save.mockResolvedValue(user);

    const result = await useCase.execute({
      email: 'test@example.com',
      code: '123456',
    });

    expect(result.message).toContain('Xác thực email thành công');
    expect(mockUserRepository.save).toHaveBeenCalled();
    expect(user.getIsEmailVerified()).toBe(true);
  });
});
