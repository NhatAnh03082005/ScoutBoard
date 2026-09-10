import { Injectable, Inject } from '@nestjs/common';
import {
  SHORTLIST_REPOSITORY,
  ShortlistRepository,
} from '../../domain/repositories/shortlist.repository';
import {
  SHORTLIST_PLAYER_REPOSITORY,
  ShortlistPlayerRepository,
} from '../../domain/repositories/shortlist-player.repository';
import { ShortlistPlayer } from '../../domain/entities/shortlist-player';
import {
  ShortlistNotFoundError,
  PlayerNotInShortlistError,
} from '../../domain/errors/shortlist.errors';

export interface UpdateShortlistPlayerNoteInput {
  shortlistId: string;
  ownerId: string;
  playerId: string;
  note: string | null;
}

@Injectable()
export class UpdateShortlistPlayerNoteUseCase {
  constructor(
    @Inject(SHORTLIST_REPOSITORY)
    private readonly shortlistRepository: ShortlistRepository,
    @Inject(SHORTLIST_PLAYER_REPOSITORY)
    private readonly shortlistPlayerRepository: ShortlistPlayerRepository,
  ) {}

  async execute(
    input: UpdateShortlistPlayerNoteInput,
  ): Promise<ShortlistPlayer> {
    const shortlist = await this.shortlistRepository.findById(
      input.shortlistId,
    );
    if (!shortlist || shortlist.getOwnerId() !== input.ownerId) {
      throw new ShortlistNotFoundError(input.shortlistId);
    }

    const shortlistPlayer =
      await this.shortlistPlayerRepository.findByShortlistAndPlayer(
        input.shortlistId,
        input.playerId,
      );
    if (!shortlistPlayer) {
      throw new PlayerNotInShortlistError(input.playerId, input.shortlistId);
    }

    shortlistPlayer.updateNote(input.note);
    return this.shortlistPlayerRepository.save(shortlistPlayer);
  }
}
