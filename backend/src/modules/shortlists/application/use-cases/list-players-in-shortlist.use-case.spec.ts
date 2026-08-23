import { ListPlayersInShortlistUseCase } from './list-players-in-shortlist.use-case';
import { ShortlistRepository } from '../../domain/repositories/shortlist.repository';
import { ShortlistPlayerRepository } from '../../domain/repositories/shortlist-player.repository';
import { Shortlist } from '../../domain/entities/shortlist';
import { ShortlistNotFoundError } from '../../domain/errors/shortlist.errors';

describe('ListPlayersInShortlistUseCase (Unit)', () => {
  let useCase: ListPlayersInShortlistUseCase;
  let mockShortlistRepo: jest.Mocked<ShortlistRepository>;
  let mockShortlistPlayerRepo: jest.Mocked<ShortlistPlayerRepository>;

  const shortlistId = 'sl-1';
  const ownerId = 'user-1';

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
      findPlayersWithDetailsByShortlistId: jest.fn(),
      addPlayer: jest.fn(),
      save: jest.fn(),
      removePlayer: jest.fn(),
    };

    useCase = new ListPlayersInShortlistUseCase(
      mockShortlistRepo,
      mockShortlistPlayerRepo,
    );
  });

  it('should return players in owned shortlist', async () => {
    const shortlist = new Shortlist(shortlistId, ownerId, 'Targets');
    const players = [
      { id: 'sp-1', shortlistId, playerId: 'p-1', player: { name: 'Player 1' } },
    ];

    mockShortlistRepo.findById.mockResolvedValue(shortlist);
    mockShortlistPlayerRepo.findPlayersWithDetailsByShortlistId.mockResolvedValue(players);

    const result = await useCase.execute({ shortlistId, ownerId });
    expect(result).toBe(players);
  });

  it('should reject access to another user shortlist', async () => {
    const shortlist = new Shortlist(shortlistId, 'other-user', 'Targets');
    mockShortlistRepo.findById.mockResolvedValue(shortlist);

    await expect(
      useCase.execute({ shortlistId, ownerId }),
    ).rejects.toThrow(ShortlistNotFoundError);
  });
});
