import { UpdateShortlistPlayerNoteUseCase } from './update-shortlist-player-note.use-case';
import { ShortlistRepository } from '../../domain/repositories/shortlist.repository';
import { ShortlistPlayerRepository } from '../../domain/repositories/shortlist-player.repository';
import { Shortlist } from '../../domain/entities/shortlist';
import { ShortlistPlayer } from '../../domain/entities/shortlist-player';
import {
  ShortlistNotFoundError,
  PlayerNotInShortlistError,
} from '../../domain/errors/shortlist.errors';

describe('UpdateShortlistPlayerNoteUseCase (Unit)', () => {
  let useCase: UpdateShortlistPlayerNoteUseCase;
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

    useCase = new UpdateShortlistPlayerNoteUseCase(
      mockShortlistRepo,
      mockShortlistPlayerRepo,
    );
  });

  it('TC-06: should update note on shortlist_players record', async () => {
    const shortlist = new Shortlist(shortlistId, ownerId, 'Targets');
    const shortlistPlayer = new ShortlistPlayer('rel-1', shortlistId, playerId, 'Old note');

    mockShortlistRepo.findById.mockResolvedValue(shortlist);
    mockShortlistPlayerRepo.findByShortlistAndPlayer.mockResolvedValue(shortlistPlayer);
    mockShortlistPlayerRepo.save.mockImplementation(async (sp) => sp);

    const result = await useCase.execute({
      shortlistId,
      ownerId,
      playerId,
      note: 'Strong 1v1 defender',
    });

    expect(result.getNote()).toBe('Strong 1v1 defender');
    expect(mockShortlistPlayerRepo.save).toHaveBeenCalled();
  });

  it('should allow clearing the note by passing null', async () => {
    const shortlist = new Shortlist(shortlistId, ownerId, 'Targets');
    const shortlistPlayer = new ShortlistPlayer('rel-1', shortlistId, playerId, 'Old note');

    mockShortlistRepo.findById.mockResolvedValue(shortlist);
    mockShortlistPlayerRepo.findByShortlistAndPlayer.mockResolvedValue(shortlistPlayer);
    mockShortlistPlayerRepo.save.mockImplementation(async (sp) => sp);

    const result = await useCase.execute({
      shortlistId,
      ownerId,
      playerId,
      note: null,
    });

    expect(result.getNote()).toBeNull();
  });

  it('TC-07: should reject note update when user does not own shortlist', async () => {
    const shortlist = new Shortlist(shortlistId, 'other-user', 'Targets');
    mockShortlistRepo.findById.mockResolvedValue(shortlist);

    await expect(
      useCase.execute({
        shortlistId,
        ownerId: 'user-1',
        playerId,
        note: 'New note',
      }),
    ).rejects.toThrow(ShortlistNotFoundError);
  });
});
