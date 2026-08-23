import { Injectable, Inject } from '@nestjs/common';
import {
  SHORTLIST_REPOSITORY,
  ShortlistRepository,
} from '../../domain/repositories/shortlist.repository';
import { Shortlist, ShortlistVisibility } from '../../domain/entities/shortlist';
import { ShortlistNotFoundError } from '../../domain/errors/shortlist.errors';

export interface UpdateShortlistInput {
  id: string;
  ownerId: string;
  name?: string;
  description?: string | null;
  visibility?: ShortlistVisibility;
}

@Injectable()
export class UpdateShortlistUseCase {
  constructor(
    @Inject(SHORTLIST_REPOSITORY)
    private readonly shortlistRepository: ShortlistRepository,
  ) {}

  async execute(input: UpdateShortlistInput): Promise<Shortlist> {
    const shortlist = await this.shortlistRepository.findById(input.id);
    if (!shortlist || shortlist.getOwnerId() !== input.ownerId) {
      throw new ShortlistNotFoundError(input.id);
    }

    if (input.name !== undefined) {
      shortlist.updateName(input.name);
    }

    if (input.description !== undefined) {
      shortlist.updateDescription(input.description);
    }

    if (input.visibility !== undefined) {
      shortlist.updateVisibility(input.visibility);
    }

    return this.shortlistRepository.save(shortlist);
  }
}
