import { RemovePlayerFromShortlistUseCase } from './remove-player-from-shortlist.use-case';
import { ShortlistRepository } from '../../domain/repositories/shortlist.repository';
import { ShortlistPlayerRepository } from '../../domain/repositories/shortlist-player.repository';
import { Shortlist } from '../../domain/entities/shortlist';
import { ShortlistPlayer } from '../../domain/entities/shortlist-player';
import {
  ShortlistNotFoundError,
  PlayerNotInShortlistError,
} from '../../domain/errors/shortlist.errors';

describe('RemovePlayerFromShortlistUseCase (Unit)', () => {
  let useCase: RemovePlayerFromShortlistUseCase;
  let mockShortlistRepo: jest.Mocked<ShortlistRepository>;
  let mockShortlistPlayerRepo: jest.Mocked<ShortlistPlayerRepository>;

  const shortlistId = 'sl-1';
  const ownerId = 'user-1';
  const playerId = 'player-1';

  beforeEach(() => {
    mockShortlistRepo = {
      findById: jest.fn(),
      findByOwner: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
      delete: jest.fn(),
    };

    mockShortlistPlayerRepo = {
      findByShortlistAndPlayer: jest.fn(),
      findByShortlistId: jest.fn(),
      addPlayer: jest.fn(),
      save: jest.fn(),
      removePlayer: jest.fn(),
    };

    useCase = new RemovePlayerFromShortlistUseCase(
      mockShortlistRepo,
      mockShortlistPlayerRepo,
    );
  });

  it('TC-05: should remove relationship only when owned', async () => {
    const shortlist = new Shortlist(shortlistId, ownerId, 'Targets');
    const shortlistPlayer = new ShortlistPlayer('rel-1', shortlistId, playerId);

    mockShortlistRepo.findById.mockResolvedValue(shortlist);
    mockShortlistPlayerRepo.findByShortlistAndPlayer.mockResolvedValue(
      shortlistPlayer,
    );
    mockShortlistPlayerRepo.removePlayer.mockResolvedValue(undefined);

    await useCase.execute({ shortlistId, ownerId, playerId });

    expect(mockShortlistPlayerRepo.removePlayer).toHaveBeenCalledWith(
      shortlistId,
      playerId,
    );
  });

  it('should throw PlayerNotInShortlistError if player is not in shortlist', async () => {
    const shortlist = new Shortlist(shortlistId, ownerId, 'Targets');
    mockShortlistRepo.findById.mockResolvedValue(shortlist);
    mockShortlistPlayerRepo.findByShortlistAndPlayer.mockResolvedValue(null);

    await expect(
      useCase.execute({ shortlistId, ownerId, playerId }),
    ).rejects.toThrow(PlayerNotInShortlistError);
  });

  it('TC-07: should reject removal when user does not own shortlist', async () => {
    const shortlist = new Shortlist(shortlistId, 'other-user', 'Targets');
    mockShortlistRepo.findById.mockResolvedValue(shortlist);

    await expect(
      useCase.execute({ shortlistId, ownerId: 'user-1', playerId }),
    ).rejects.toThrow(ShortlistNotFoundError);
  });
});
