import { AddPlayerToShortlistUseCase } from './add-player-to-shortlist.use-case';
import { ShortlistRepository } from '../../domain/repositories/shortlist.repository';
import { ShortlistPlayerRepository } from '../../domain/repositories/shortlist-player.repository';
import { PlayerReadRepository } from '../../../players/application/ports/player-read.repository';
import { Shortlist } from '../../domain/entities/shortlist';
import { ShortlistPlayer } from '../../domain/entities/shortlist-player';
import {
  ShortlistNotFoundError,
  PlayerNotFoundError,
  PlayerAlreadyInShortlistError,
} from '../../domain/errors/shortlist.errors';

describe('AddPlayerToShortlistUseCase (Unit)', () => {
  let useCase: AddPlayerToShortlistUseCase;
  let mockShortlistRepo: jest.Mocked<ShortlistRepository>;
  let mockShortlistPlayerRepo: jest.Mocked<ShortlistPlayerRepository>;
  let mockPlayerReadRepo: jest.Mocked<PlayerReadRepository>;

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

    mockPlayerReadRepo = {
      findById: jest.fn(),
      search: jest.fn(),
      findTeamHistoryByPlayerId: jest.fn(),
      findSeasonStatisticsByPlayerId: jest.fn(),
      findSeasonStatisticsByCompetitionAndSeason: jest.fn(),
      findMatchStatisticsByPlayerId: jest.fn(),
      findComparisonCandidates: jest.fn(),
    };

    useCase = new AddPlayerToShortlistUseCase(
      mockShortlistRepo,
      mockShortlistPlayerRepo,
      mockPlayerReadRepo,
    );
  });

  it('TC-01: should add existing player to owned shortlist successfully', async () => {
    const shortlist = new Shortlist(shortlistId, ownerId, 'Targets');
    const player = { id: playerId, name: 'Bukayo Saka' } as any;
    const shortlistPlayer = new ShortlistPlayer('rel-1', shortlistId, playerId, 'Great winger');

    mockShortlistRepo.findById.mockResolvedValue(shortlist);
    mockPlayerReadRepo.findById.mockResolvedValue(player);
    mockShortlistPlayerRepo.findByShortlistAndPlayer.mockResolvedValue(null);
    mockShortlistPlayerRepo.addPlayer.mockResolvedValue(shortlistPlayer);

    const result = await useCase.execute({
      shortlistId,
      ownerId,
      playerId,
      note: 'Great winger',
    });

    expect(result).toBe(shortlistPlayer);
    expect(mockShortlistPlayerRepo.addPlayer).toHaveBeenCalledWith({
      shortlistId,
      playerId,
      note: 'Great winger',
    });
  });

  it('TC-02: should reject adding the same player twice to the same shortlist', async () => {
    const shortlist = new Shortlist(shortlistId, ownerId, 'Targets');
    const player = { id: playerId, name: 'Bukayo Saka' } as any;
    const existingShortlistPlayer = new ShortlistPlayer('rel-1', shortlistId, playerId);

    mockShortlistRepo.findById.mockResolvedValue(shortlist);
    mockPlayerReadRepo.findById.mockResolvedValue(player);
    mockShortlistPlayerRepo.findByShortlistAndPlayer.mockResolvedValue(existingShortlistPlayer);

    await expect(
      useCase.execute({
        shortlistId,
        ownerId,
        playerId,
      }),
    ).rejects.toThrow(PlayerAlreadyInShortlistError);
  });

  it('TC-04: should reject adding a non-existent player', async () => {
    const shortlist = new Shortlist(shortlistId, ownerId, 'Targets');
    mockShortlistRepo.findById.mockResolvedValue(shortlist);
    mockPlayerReadRepo.findById.mockResolvedValue(null);

    await expect(
      useCase.execute({
        shortlistId,
        ownerId,
        playerId: 'non-existent-player',
      }),
    ).rejects.toThrow(PlayerNotFoundError);
  });

  it('TC-07: should reject adding player when user does not own the shortlist', async () => {
    const shortlist = new Shortlist(shortlistId, 'other-user', 'Targets');
    mockShortlistRepo.findById.mockResolvedValue(shortlist);

    await expect(
      useCase.execute({
        shortlistId,
        ownerId: 'user-1',
        playerId,
      }),
    ).rejects.toThrow(ShortlistNotFoundError);
  });
});
