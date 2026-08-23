import { Injectable, Inject } from '@nestjs/common';
import {
  SHORTLIST_REPOSITORY,
  ShortlistRepository,
} from '../../domain/repositories/shortlist.repository';
import { Shortlist } from '../../domain/entities/shortlist';
import { ShortlistNotFoundError } from '../../domain/errors/shortlist.errors';

export interface GetShortlistByIdInput {
  id: string;
  ownerId: string;
}

@Injectable()
export class GetShortlistByIdUseCase {
  constructor(
    @Inject(SHORTLIST_REPOSITORY)
    private readonly shortlistRepository: ShortlistRepository,
  ) {}

  async execute(input: GetShortlistByIdInput): Promise<Shortlist> {
    const shortlist = await this.shortlistRepository.findById(input.id);
    if (!shortlist || shortlist.getOwnerId() !== input.ownerId) {
      throw new ShortlistNotFoundError(input.id);
    }
    return shortlist;
  }
}
