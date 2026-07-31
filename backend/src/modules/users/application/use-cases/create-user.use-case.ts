import { Injectable, Inject } from '@nestjs/common';
import {
  USER_REPOSITORY,
  UserRepository,
} from '../../domain/repositories/user.repository';
import { User } from '../../domain/entities/user';
import { UserEmailConflictError } from '../../domain/errors/users.errors';

export interface CreateUserInput {
  email: string;
  passwordHash: string;
  fullName: string;
}

@Injectable()
export class CreateUserUseCase {
  constructor(
    @Inject(USER_REPOSITORY)
    private readonly userRepository: UserRepository,
  ) {}

  async execute(input: CreateUserInput): Promise<User> {
    const existing = await this.userRepository.findByEmail(input.email);
    if (existing) {
      throw new UserEmailConflictError(input.email);
    }

    return this.userRepository.create(input);
  }
}
