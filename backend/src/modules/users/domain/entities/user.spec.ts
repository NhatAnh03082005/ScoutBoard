import { User } from './user';
import { Role } from './role';

describe('User Domain Entity', () => {
  it('should initialize properties correctly and sanitize user object without exposing password hash', () => {
    const roleAdmin = new Role('role-1', 'ADMIN', 'Quản trị viên');
    const user = new User(
      'user-uuid-123',
      'admin@scoutboard.com',
      '$2a$10$hashedPassword',
      'System Admin',
      'ACTIVE',
      0,
      0,
      null,
      null,
      [roleAdmin],
    );

    expect(user.id).toBe('user-uuid-123');
    expect(user.getEmail()).toBe('admin@scoutboard.com');
    expect(user.getPasswordHash()).toBe('$2a$10$hashedPassword');
    expect(user.getRoles()).toEqual([roleAdmin]);

    const sanitized = user.sanitize();
    expect((sanitized as Record<string, unknown>).passwordHash).toBeUndefined();
    expect(sanitized.email).toBe('admin@scoutboard.com');
    expect(sanitized.userRoles).toHaveLength(1);
    expect(sanitized.userRoles[0].role.code).toBe('ADMIN');
  });

  it('should disable, lock, and activate user state correctly', () => {
    const user = new User(
      'user-1',
      'user@example.com',
      'hash',
      'Test User',
      'ACTIVE',
      3,
      1,
      new Date(),
      new Date(),
    );

    user.disable();
    expect(user.getStatus()).toBe('DISABLED');

    user.lock();
    expect(user.getStatus()).toBe('LOCKED');

    user.activate();
    expect(user.getStatus()).toBe('ACTIVE');
    expect(user.getFailedLoginAttempts()).toBe(0);
    expect(user.getLockoutCount()).toBe(0);
    expect(user.getLockedUntil()).toBeNull();
    expect(user.getLastFailedLoginAt()).toBeNull();
  });
});
