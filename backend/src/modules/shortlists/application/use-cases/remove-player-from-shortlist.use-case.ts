import { Injectable, Inject } from '@nestjs/common';
import {
  SHORTLIST_REPOSITORY,
  ShortlistRepository,
} from '../../domain/repositories/shortlist.repository';
import {
  SHORTLIST_PLAYER_REPOSITORY,
  ShortlistPlayerRepository,
} from '../../domain/repositories/shortlist-player.repository';
import {
  ShortlistNotFoundError,
  PlayerNotInShortlistError,
} from '../../domain/errors/shortlist.errors';

export interface RemovePlayerFromShortlistInput {
  shortlistId: string;
  ownerId: string;
  playerId: string;
}

@Injectable()
export class RemovePlayerFromShortlistUseCase {
  constructor(
    @Inject(SHORTLIST_REPOSITORY)
    private readonly shortlistRepository: ShortlistRepository,
    @Inject(SHORTLIST_PLAYER_REPOSITORY)
    private readonly shortlistPlayerRepository: ShortlistPlayerRepository,
  ) {}

  async execute(input: RemovePlayerFromShortlistInput): Promise<void> {
    const shortlist = await this.shortlistRepository.findById(
      input.shortlistId,
    );
    if (!shortlist || shortlist.getOwnerId() !== input.ownerId) {
      throw new ShortlistNotFoundError(input.shortlistId);
    }

    const existing =
      await this.shortlistPlayerRepository.findByShortlistAndPlayer(
        input.shortlistId,
        input.playerId,
      );
    if (!existing) {
      throw new PlayerNotInShortlistError(input.playerId, input.shortlistId);
    }

    await this.shortlistPlayerRepository.removePlayer(
      input.shortlistId,
      input.playerId,
    );
  }
}
