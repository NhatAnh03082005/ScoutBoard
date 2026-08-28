import { RemovePlayerFromSquadUseCase } from './remove-player-from-squad.use-case';
import { SquadRepository } from '../../domain/repositories/squad.repository';
import { SquadPlayerRepository } from '../../domain/repositories/squad-player.repository';
import { Squad } from '../../domain/entities/squad';
import { SquadPlayer } from '../../domain/entities/squad-player';
import {
  SquadNotFoundError,
  PlayerNotInSquadError,
} from '../../domain/errors/squad.errors';

describe('RemovePlayerFromSquadUseCase', () => {
  let useCase: RemovePlayerFromSquadUseCase;
  let mockSquadRepository: jest.Mocked<SquadRepository>;
  let mockSquadPlayerRepository: jest.Mocked<SquadPlayerRepository>;

  const validSquad = new Squad('squad-1', 'owner-1', 'Squad 1', '4-3-3');

  beforeEach(() => {
    mockSquadRepository = {
      findById: jest.fn(),
      findByOwner: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
      delete: jest.fn(),
    };
    mockSquadPlayerRepository = {
      findBySquadAndPlayer: jest.fn(),
      findBySquadId: jest.fn(),
      findPlayersWithDetailsBySquadId: jest.fn(),
      findStarterBySlotCode: jest.fn(),
      findCaptainBySquadId: jest.fn(),
      addPlayer: jest.fn(),
      save: jest.fn(),
      removePlayer: jest.fn(),
    };

    useCase = new RemovePlayerFromSquadUseCase(
      mockSquadRepository,
      mockSquadPlayerRepository,
    );
  });

  it('TC-12: should remove player relationship from squad', async () => {
    mockSquadRepository.findById.mockResolvedValue(validSquad);
    mockSquadPlayerRepository.findBySquadAndPlayer.mockResolvedValue(
      new SquadPlayer('sp-1', 'squad-1', 'player-1', 'GK', 'STARTER'),
    );

    await useCase.execute({
      squadId: 'squad-1',
      ownerId: 'owner-1',
      playerId: 'player-1',
    });

    expect(mockSquadPlayerRepository.removePlayer).toHaveBeenCalledWith(
      'squad-1',
      'player-1',
    );
  });

  it('should throw PlayerNotInSquadError if player not in squad', async () => {
    mockSquadRepository.findById.mockResolvedValue(validSquad);
    mockSquadPlayerRepository.findBySquadAndPlayer.mockResolvedValue(null);

    await expect(
      useCase.execute({
        squadId: 'squad-1',
        ownerId: 'owner-1',
        playerId: 'player-1',
      }),
    ).rejects.toThrow(PlayerNotInSquadError);
  });
});
