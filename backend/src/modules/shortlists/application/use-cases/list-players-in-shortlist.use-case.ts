import { Injectable, Inject } from '@nestjs/common';
import {
  SHORTLIST_REPOSITORY,
  ShortlistRepository,
} from '../../domain/repositories/shortlist.repository';
import {
  SHORTLIST_PLAYER_REPOSITORY,
  ShortlistPlayerRepository,
} from '../../domain/repositories/shortlist-player.repository';
import { ShortlistNotFoundError } from '../../domain/errors/shortlist.errors';

export interface ListPlayersInShortlistInput {
  shortlistId: string;
  ownerId: string;
}

@Injectable()
export class ListPlayersInShortlistUseCase {
  constructor(
    @Inject(SHORTLIST_REPOSITORY)
    private readonly shortlistRepository: ShortlistRepository,
    @Inject(SHORTLIST_PLAYER_REPOSITORY)
    private readonly shortlistPlayerRepository: ShortlistPlayerRepository,
  ) {}

  async execute(input: ListPlayersInShortlistInput): Promise<any[]> {
    const shortlist = await this.shortlistRepository.findById(
      input.shortlistId,
    );
    if (!shortlist || shortlist.getOwnerId() !== input.ownerId) {
      throw new ShortlistNotFoundError(input.shortlistId);
    }

    return this.shortlistPlayerRepository.findPlayersWithDetailsByShortlistId(
      input.shortlistId,
    );
  }
}
