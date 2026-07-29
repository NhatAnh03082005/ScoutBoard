import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
} from 'typeorm';
import { UserRole } from '../../roles/entities/user-role.entity';
import { RefreshToken } from '../../auth/entities/refresh-token.entity';

@Entity('users')
export class User {
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

  @Column({
    name: 'failed_login_attempts',
    type: 'integer',
    default: 0,
  })
  failedLoginAttempts: number;

  @Column({
    name: 'lockout_count',
    type: 'integer',
    default: 0,
  })
  lockoutCount: number;

  @Column({
    name: 'locked_until',
    type: 'timestamptz',
    nullable: true,
    default: null,
  })
  lockedUntil: Date | null;

  @Column({
    name: 'last_failed_login_at',
    type: 'timestamptz',
    nullable: true,
    default: null,
  })
  lastFailedLoginAt: Date | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;

  @OneToMany(() => UserRole, (userRole) => userRole.user)
  userRoles: UserRole[];

  @OneToMany(() => RefreshToken, (refreshToken) => refreshToken.user)
  refreshTokens: RefreshToken[];
}
