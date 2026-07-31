import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
} from 'typeorm';
import { UserRoleOrmEntity } from './user-role.orm-entity';

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

  @OneToMany(
    'UserRoleOrmEntity',
    (userRole: UserRoleOrmEntity) => userRole.user,
  )
  userRoles: UserRoleOrmEntity[];

  @CreateDateColumn({ name: 'created_at', type: 'timestamp with time zone' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamp with time zone' })
  updatedAt: Date;
}
