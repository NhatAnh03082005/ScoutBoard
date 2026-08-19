import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
} from 'typeorm';
import { UserRoleOrmEntity } from './user-role.orm-entity';

import type { RefreshTokenOrmEntity } from '../../../../../auth/infrastructure/persistence/typeorm/entities/refresh-token.orm-entity';

@Entity('users')
export class UserOrmEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 255, unique: true })
  email: string;

  @Column({ name: 'password_hash', type: 'varchar', length: 255 })
  passwordHash: string;

  @Column({ name: 'full_name', type: 'varchar', length: 150 })
  fullName: string;

  @Column({ type: 'varchar', length: 30, default: 'ACTIVE' })
  status: string;

  @Column({ name: 'failed_login_attempts', type: 'integer', default: 0 })
  failedLoginAttempts: number;

  @Column({ name: 'lockout_count', type: 'integer', default: 0 })
  lockoutCount: number;

  @Column({
    name: 'locked_until',
    type: 'timestamp with time zone',
    nullable: true,
  })
  lockedUntil: Date | null;

  @Column({
    name: 'last_failed_login_at',
    type: 'timestamp with time zone',
    nullable: true,
  })
  lastFailedLoginAt: Date | null;

  @Column({ name: 'is_email_verified', type: 'boolean', default: false })
  isEmailVerified: boolean;

  @Column({
    name: 'email_verification_code',
    type: 'varchar',
    length: 20,
    nullable: true,
  })
  emailVerificationCode: string | null;

  @Column({
    name: 'email_verification_expires_at',
    type: 'timestamp with time zone',
    nullable: true,
  })
  emailVerificationExpiresAt: Date | null;

  @Column({
    name: 'password_reset_code',
    type: 'varchar',
    length: 20,
    nullable: true,
  })
  passwordResetCode: string | null;

  @Column({
    name: 'password_reset_expires_at',
    type: 'timestamp with time zone',
    nullable: true,
  })
  passwordResetExpiresAt: Date | null;

  @OneToMany(
    'UserRoleOrmEntity',
    (userRole: UserRoleOrmEntity) => userRole.user,
  )
  userRoles: UserRoleOrmEntity[];

  @OneToMany('RefreshTokenOrmEntity', 'user')
  refreshTokens: RefreshTokenOrmEntity[];

  @CreateDateColumn({ name: 'created_at', type: 'timestamp with time zone' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamp with time zone' })
  updatedAt: Date;
}
