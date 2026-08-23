import { Injectable, Inject } from '@nestjs/common';
import {
  SHORTLIST_REPOSITORY,
  ShortlistRepository,
} from '../../domain/repositories/shortlist.repository';
import { ShortlistNotFoundError } from '../../domain/errors/shortlist.errors';

export interface DeleteShortlistInput {
  id: string;
  ownerId: string;
}

@Injectable()
export class DeleteShortlistUseCase {
  constructor(
    @Inject(SHORTLIST_REPOSITORY)
    private readonly shortlistRepository: ShortlistRepository,
  ) {}

  async execute(input: DeleteShortlistInput): Promise<void> {
    const shortlist = await this.shortlistRepository.findById(input.id);
    if (!shortlist || shortlist.getOwnerId() !== input.ownerId) {
      throw new ShortlistNotFoundError(input.id);
    }

    await this.shortlistRepository.delete(input.id);
  }
}
