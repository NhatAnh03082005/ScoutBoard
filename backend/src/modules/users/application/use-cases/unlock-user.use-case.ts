import { Injectable, Inject } from '@nestjs/common';
import {
  USER_REPOSITORY,
  UserRepository,
} from '../../domain/repositories/user.repository';
import { User } from '../../domain/entities/user';
import { UserNotFoundError } from '../../domain/errors/users.errors';

@Injectable()
export class UnlockUserUseCase {
  constructor(
    @Inject(USER_REPOSITORY)
    private readonly userRepository: UserRepository,
  ) {}

  async execute(targetUserId: string): Promise<User> {
    const user = await this.userRepository.findById(targetUserId);
    if (!user) {
      throw new UserNotFoundError(targetUserId);
    }

    user.activate();
    return this.userRepository.save(user);
  }
}
