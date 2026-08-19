import { ForgotPasswordUseCase } from './forgot-password.use-case';
import { UserRepository } from '../../../users/domain/repositories/user.repository';
import { EmailService } from '../../infrastructure/services/email.service';
import { User } from '../../../users/domain/entities/user';
import { Role } from '../../../users/domain/entities/role';

describe('ForgotPasswordUseCase', () => {
  let useCase: ForgotPasswordUseCase;
  let mockUserRepository: jest.Mocked<UserRepository>;
  let mockEmailService: jest.Mocked<EmailService>;

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

    mockEmailService = {
      sendVerificationEmail: jest.fn().mockResolvedValue(true),
      sendPasswordResetEmail: jest.fn().mockResolvedValue(true),
    } as unknown as jest.Mocked<EmailService>;

    useCase = new ForgotPasswordUseCase(mockUserRepository, mockEmailService);
  });

  it('should return generic success message when user not found (enumeration safe)', async () => {
    mockUserRepository.findByEmail.mockResolvedValue(null);

    const result = await useCase.execute({ email: 'nonexistent@example.com' });

    expect(result.message).toContain('mã OTP xác thực đặt lại mật khẩu đã được gửi');
    expect(mockEmailService.sendPasswordResetEmail).not.toHaveBeenCalled();
  });

  it('should generate OTP, save user and send password reset email when user found', async () => {
    const user = new User(
      'u1',
      'user@example.com',
      'hash',
      'User',
      'ACTIVE',
      0,
      0,
      null,
      null,
      [new Role('r1', 'USER', 'User')],
    );
    mockUserRepository.findByEmail.mockResolvedValue(user);
    mockUserRepository.save.mockResolvedValue(user);

    const result = await useCase.execute({ email: 'user@example.com' });

    expect(mockUserRepository.save).toHaveBeenCalled();
    expect(mockEmailService.sendPasswordResetEmail).toHaveBeenCalled();
    expect(user.getPasswordResetCode()).toBeDefined();
    expect(result.message).toContain('mã OTP xác thực đặt lại mật khẩu đã được gửi');
  });
});
