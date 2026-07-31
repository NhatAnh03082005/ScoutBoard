import { User, UserStatus } from '../../../../domain/entities/user';
import { Role } from '../../../../domain/entities/role';
import { UserOrmEntity } from '../entities/user.orm-entity';

export class UserMapper {
  static toDomain(entity: UserOrmEntity): User {
    const roles: Role[] =
      entity.userRoles
        ?.map((ur) =>
          ur.role
            ? new Role(
                ur.role.id,
                ur.role.code,
                ur.role.name,
                ur.role.createdAt,
              )
            : null,
        )
        .filter((r): r is Role => r !== null) || [];

    return new User(
      entity.id,
      entity.email,
      entity.passwordHash,
      entity.fullName,
      entity.status as UserStatus,
      entity.failedLoginAttempts ?? 0,
      entity.lockoutCount ?? 0,
      entity.lockedUntil ? new Date(entity.lockedUntil) : null,
      entity.lastFailedLoginAt ? new Date(entity.lastFailedLoginAt) : null,
      roles,
      entity.createdAt,
      entity.updatedAt,
    );
  }

  static toPersistence(domain: User): UserOrmEntity {
    const entity = new UserOrmEntity();
    entity.id = domain.id;
    entity.email = domain.getEmail();
    entity.passwordHash = domain.getPasswordHash();
    entity.fullName = domain.getFullName();
    entity.status = domain.getStatus();
    entity.failedLoginAttempts = domain.getFailedLoginAttempts();
    entity.lockoutCount = domain.getLockoutCount();
    entity.lockedUntil = domain.getLockedUntil();
    entity.lastFailedLoginAt = domain.getLastFailedLoginAt();
    return entity;
  }
}
