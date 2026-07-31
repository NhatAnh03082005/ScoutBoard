import { Injectable, Inject } from '@nestjs/common';
import {
  USER_REPOSITORY,
  UserRepository,
} from '../../domain/repositories/user.repository';
import { User, UserStatus } from '../../domain/entities/user';
import {
  UserNotFoundError,
  CannotDisableSelfError,
} from '../../domain/errors/users.errors';

export interface UpdateUserStatusInput {
  targetUserId: string;
  status: UserStatus;
  adminId: string;
}

@Injectable()
export class UpdateUserStatusUseCase {
  constructor(
    @Inject(USER_REPOSITORY)
    private readonly userRepository: UserRepository,
  ) {}

  async execute(input: UpdateUserStatusInput): Promise<User> {
    if (input.targetUserId === input.adminId && input.status !== 'ACTIVE') {
      throw new CannotDisableSelfError();
    }

    const user = await this.userRepository.findById(input.targetUserId);
    if (!user) {
      throw new UserNotFoundError(input.targetUserId);
    }

    if (input.status === 'ACTIVE') {
      user.activate();
    } else if (input.status === 'DISABLED') {
      user.disable();
    } else if (input.status === 'LOCKED') {
      user.lock();
    }

    return this.userRepository.save(user);
  }
}
