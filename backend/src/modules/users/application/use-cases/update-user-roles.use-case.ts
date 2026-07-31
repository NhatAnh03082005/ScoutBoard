import { Injectable, Inject } from '@nestjs/common';
import {
  USER_REPOSITORY,
  UserRepository,
} from '../../domain/repositories/user.repository';
import { User } from '../../domain/entities/user';
import { UserNotFoundError } from '../../domain/errors/users.errors';

export interface UpdateUserRolesInput {
  targetUserId: string;
  roles: string[];
}

@Injectable()
export class UpdateUserRolesUseCase {
  constructor(
    @Inject(USER_REPOSITORY)
    private readonly userRepository: UserRepository,
  ) {}

  async execute(input: UpdateUserRolesInput): Promise<User> {
    const user = await this.userRepository.findById(input.targetUserId);
    if (!user) {
      throw new UserNotFoundError(input.targetUserId);
    }

    return this.userRepository.updateRoles(input.targetUserId, input.roles);
  }
}
