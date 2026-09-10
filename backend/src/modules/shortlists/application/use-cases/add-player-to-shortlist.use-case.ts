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
  PLAYER_READ_REPOSITORY,
  PlayerReadRepository,
} from '../../../players/application/ports/player-read.repository';
import { ShortlistPlayer } from '../../domain/entities/shortlist-player';
import {
  ShortlistNotFoundError,
  PlayerNotFoundError,
  PlayerAlreadyInShortlistError,
} from '../../domain/errors/shortlist.errors';

export interface AddPlayerToShortlistInput {
  shortlistId: string;
  ownerId: string;
  playerId: string;
  note?: string | null;
}

@Injectable()
export class AddPlayerToShortlistUseCase {
  constructor(
    @Inject(SHORTLIST_REPOSITORY)
    private readonly shortlistRepository: ShortlistRepository,
    @Inject(SHORTLIST_PLAYER_REPOSITORY)
    private readonly shortlistPlayerRepository: ShortlistPlayerRepository,
    @Inject(PLAYER_READ_REPOSITORY)
    private readonly playerReadRepository: PlayerReadRepository,
  ) {}

  async execute(input: AddPlayerToShortlistInput): Promise<ShortlistPlayer> {
    const shortlist = await this.shortlistRepository.findById(
      input.shortlistId,
    );
    if (!shortlist || shortlist.getOwnerId() !== input.ownerId) {
      throw new ShortlistNotFoundError(input.shortlistId);
    }

    const player = await this.playerReadRepository.findById(input.playerId);
    if (!player) {
      throw new PlayerNotFoundError(input.playerId);
    }

    const existing =
      await this.shortlistPlayerRepository.findByShortlistAndPlayer(
        input.shortlistId,
        input.playerId,
      );
    if (existing) {
      throw new PlayerAlreadyInShortlistError(
        input.playerId,
        input.shortlistId,
      );
    }

    return this.shortlistPlayerRepository.addPlayer({
      shortlistId: input.shortlistId,
      playerId: input.playerId,
      note: input.note,
    });
  }
}
