import { Role } from './role';

export type UserStatus = 'ACTIVE' | 'DISABLED' | 'LOCKED';

export class User {
  constructor(
    public readonly id: string,
    private email: string,
    private passwordHash: string,
    private fullName: string,
    private status: UserStatus,
    private failedLoginAttempts: number = 0,
    private lockoutCount: number = 0,
    private lockedUntil: Date | null = null,
    private lastFailedLoginAt: Date | null = null,
    private roles: Role[] = [],
    public readonly createdAt?: Date,
    public readonly updatedAt?: Date,
  ) {}

  getEmail(): string {
    return this.email;
  }

  getPasswordHash(): string {
    return this.passwordHash;
  }

  getFullName(): string {
    return this.fullName;
  }

  getStatus(): UserStatus {
    return this.status;
  }

  getFailedLoginAttempts(): number {
    return this.failedLoginAttempts;
  }

  getLockoutCount(): number {
    return this.lockoutCount;
  }

  getLockedUntil(): Date | null {
    return this.lockedUntil;
  }

  getLastFailedLoginAt(): Date | null {
    return this.lastFailedLoginAt;
  }

  getRoles(): Role[] {
    return [...this.roles];
  }

  disable(): void {
    this.status = 'DISABLED';
  }

  activate(): void {
    this.status = 'ACTIVE';
    this.failedLoginAttempts = 0;
    this.lockoutCount = 0;
    this.lockedUntil = null;
    this.lastFailedLoginAt = null;
  }

  lock(): void {
    this.status = 'LOCKED';
  }

  assignRoles(roles: Role[]): void {
    this.roles = roles;
  }

  sanitize() {
    return {
      id: this.id,
      email: this.email,
      fullName: this.fullName,
      status: this.status,
      failedLoginAttempts: this.failedLoginAttempts,
      lockoutCount: this.lockoutCount,
      lockedUntil: this.lockedUntil,
      lastFailedLoginAt: this.lastFailedLoginAt,
      userRoles: this.roles.map((r) => ({
        role: {
          id: r.id,
          code: r.code,
          name: r.name,
          createdAt: r.createdAt,
        },
      })),
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    };
  }
}
