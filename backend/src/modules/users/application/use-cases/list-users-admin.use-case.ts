import { Injectable, Inject } from '@nestjs/common';
import {
  USER_REPOSITORY,
  UserRepository,
  UserQueryOptions,
} from '../../domain/repositories/user.repository';

export interface AdminUserListItemResponse {
  id: string;
  email: string;
  fullName: string;
  status: string;
  failedLoginAttempts: number;
  lockoutCount: number;
  lockedUntil: Date | null;
  lastFailedLoginAt: Date | null;
  userRoles: {
    role: {
      id: string;
      code: string;
      name: string;
      createdAt?: Date;
    };
  }[];
  createdAt?: Date;
  updatedAt?: Date;
  isTemporarilyLocked: boolean;
  effectiveStatus: 'ACTIVE' | 'DISABLED' | 'LOCKED';
}

@Injectable()
export class ListUsersAdminUseCase {
  constructor(
    @Inject(USER_REPOSITORY)
    private readonly userRepository: UserRepository,
  ) {}

  async execute(query: UserQueryOptions): Promise<AdminUserListItemResponse[]> {
    const users = await this.userRepository.findAllAdmin(query);
    const nowMs = Date.now();

    return users.map((u) => {
      const sanitized = u.sanitize();
      const lockedUntil = u.getLockedUntil();

      const isTemporarilyLocked =
        lockedUntil !== null && new Date(lockedUntil).getTime() > nowMs;

      let effectiveStatus: 'ACTIVE' | 'DISABLED' | 'LOCKED' = 'ACTIVE';
      if (u.getStatus() === 'DISABLED') {
        effectiveStatus = 'DISABLED';
      } else if (u.getStatus() === 'LOCKED' || isTemporarilyLocked) {
        effectiveStatus = 'LOCKED';
      } else {
        effectiveStatus = 'ACTIVE';
      }

      return {
        ...sanitized,
        isTemporarilyLocked,
        effectiveStatus,
      };
    });
  }
}
