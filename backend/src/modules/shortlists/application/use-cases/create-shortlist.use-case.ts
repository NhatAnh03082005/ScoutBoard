import { Injectable, Inject } from '@nestjs/common';
import {
  SHORTLIST_REPOSITORY,
  ShortlistRepository,
} from '../../domain/repositories/shortlist.repository';
import { Shortlist, ShortlistVisibility } from '../../domain/entities/shortlist';

export interface CreateShortlistInput {
  ownerId: string;
  name: string;
  description?: string | null;
  visibility?: ShortlistVisibility;
}

@Injectable()
export class CreateShortlistUseCase {
  constructor(
    @Inject(SHORTLIST_REPOSITORY)
    private readonly shortlistRepository: ShortlistRepository,
  ) {}

  async execute(input: CreateShortlistInput): Promise<Shortlist> {
    return this.shortlistRepository.create({
      ownerId: input.ownerId,
      name: input.name,
      description: input.description,
      visibility: input.visibility,
    });
  }
}
