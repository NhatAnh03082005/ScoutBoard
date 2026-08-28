import { AddPlayerToSquadUseCase } from './add-player-to-squad.use-case';
import { SquadRepository } from '../../domain/repositories/squad.repository';
import { SquadPlayerRepository } from '../../domain/repositories/squad-player.repository';
import { PlayerReadRepository } from '../../../players/application/ports/player-read.repository';
import { Squad } from '../../domain/entities/squad';
import { SquadPlayer } from '../../domain/entities/squad-player';
import {
  SquadNotFoundError,
  PlayerNotFoundError,
  PlayerAlreadyInSquadError,
  SquadStarterSlotAlreadyOccupiedError,
  SquadCaptainAlreadyAssignedError,
  CaptainMustBeStarterError,
} from '../../domain/errors/squad.errors';

describe('AddPlayerToSquadUseCase', () => {
  let useCase: AddPlayerToSquadUseCase;
  let mockSquadRepository: jest.Mocked<SquadRepository>;
  let mockSquadPlayerRepository: jest.Mocked<SquadPlayerRepository>;
  let mockPlayerReadRepository: jest.Mocked<PlayerReadRepository>;

  const validSquad = new Squad('squad-1', 'owner-1', 'Squad 1', '4-3-3');
  const validPlayer: any = { id: 'player-1', name: 'Test Player' };

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
    mockPlayerReadRepository = {
      findById: jest.fn(),
      findCandidateById: jest.fn(),
      search: jest.fn(),
    };

    useCase = new AddPlayerToSquadUseCase(
      mockSquadRepository,
      mockSquadPlayerRepository,
      mockPlayerReadRepository,
    );
  });

  it('TC-01: should successfully add a starter player', async () => {
    mockSquadRepository.findById.mockResolvedValue(validSquad);
    mockPlayerReadRepository.findById.mockResolvedValue(validPlayer);
    mockSquadPlayerRepository.findBySquadAndPlayer.mockResolvedValue(null);
    mockSquadPlayerRepository.findStarterBySlotCode.mockResolvedValue(null);

    const createdPlayer = new SquadPlayer(
      'sp-1',
      'squad-1',
      'player-1',
      'GK',
      'STARTER',
      false,
    );
    mockSquadPlayerRepository.addPlayer.mockResolvedValue(createdPlayer);

    const result = await useCase.execute({
      squadId: 'squad-1',
      ownerId: 'owner-1',
      playerId: 'player-1',
      slotCode: 'GK',
      role: 'STARTER',
    });

    expect(result).toBe(createdPlayer);
    expect(mockSquadPlayerRepository.addPlayer).toHaveBeenCalledWith({
      squadId: 'squad-1',
      playerId: 'player-1',
      slotCode: 'GK',
      role: 'STARTER',
      isCaptain: undefined,
      displayOrder: undefined,
    });
  });

  it('TC-02: should successfully add a substitute player', async () => {
    mockSquadRepository.findById.mockResolvedValue(validSquad);
    mockPlayerReadRepository.findById.mockResolvedValue(validPlayer);
    mockSquadPlayerRepository.findBySquadAndPlayer.mockResolvedValue(null);

    const createdSub = new SquadPlayer(
      'sp-2',
      'squad-1',
      'player-1',
      null,
      'SUBSTITUTE',
      false,
      1,
    );
    mockSquadPlayerRepository.addPlayer.mockResolvedValue(createdSub);

    const result = await useCase.execute({
      squadId: 'squad-1',
      ownerId: 'owner-1',
      playerId: 'player-1',
      slotCode: null,
      role: 'SUBSTITUTE',
      displayOrder: 1,
    });

    expect(result).toBe(createdSub);
  });

  it('TC-03: should throw PlayerAlreadyInSquadError when player is duplicate in squad', async () => {
    mockSquadRepository.findById.mockResolvedValue(validSquad);
    mockPlayerReadRepository.findById.mockResolvedValue(validPlayer);
    mockSquadPlayerRepository.findBySquadAndPlayer.mockResolvedValue(
      new SquadPlayer('sp-1', 'squad-1', 'player-1', 'GK', 'STARTER'),
    );

    await expect(
      useCase.execute({
        squadId: 'squad-1',
        ownerId: 'owner-1',
        playerId: 'player-1',
        slotCode: 'CB-1',
        role: 'STARTER',
      }),
    ).rejects.toThrow(PlayerAlreadyInSquadError);
  });

  it('TC-05: should throw SquadStarterSlotAlreadyOccupiedError when starter slot is occupied', async () => {
    mockSquadRepository.findById.mockResolvedValue(validSquad);
    mockPlayerReadRepository.findById.mockResolvedValue(validPlayer);
    mockSquadPlayerRepository.findBySquadAndPlayer.mockResolvedValue(null);
    mockSquadPlayerRepository.findStarterBySlotCode.mockResolvedValue(
      new SquadPlayer('sp-existing', 'squad-1', 'player-2', 'GK', 'STARTER'),
    );

    await expect(
      useCase.execute({
        squadId: 'squad-1',
        ownerId: 'owner-1',
        playerId: 'player-1',
        slotCode: 'GK',
        role: 'STARTER',
      }),
    ).rejects.toThrow(SquadStarterSlotAlreadyOccupiedError);
  });

  it('TC-09 & TC-10: Captain validation - reject two captains', async () => {
    mockSquadRepository.findById.mockResolvedValue(validSquad);
    mockPlayerReadRepository.findById.mockResolvedValue(validPlayer);
    mockSquadPlayerRepository.findBySquadAndPlayer.mockResolvedValue(null);
    mockSquadPlayerRepository.findStarterBySlotCode.mockResolvedValue(null);
    mockSquadPlayerRepository.findCaptainBySquadId.mockResolvedValue(
      new SquadPlayer('sp-captain', 'squad-1', 'player-2', 'CB-1', 'STARTER', true),
    );

    await expect(
      useCase.execute({
        squadId: 'squad-1',
        ownerId: 'owner-1',
        playerId: 'player-1',
        slotCode: 'GK',
        role: 'STARTER',
        isCaptain: true,
      }),
    ).rejects.toThrow(SquadCaptainAlreadyAssignedError);
  });

  it('TC-11: Captain validation - substitute cannot be captain', async () => {
    mockSquadRepository.findById.mockResolvedValue(validSquad);
    mockPlayerReadRepository.findById.mockResolvedValue(validPlayer);
    mockSquadPlayerRepository.findBySquadAndPlayer.mockResolvedValue(null);

    await expect(
      useCase.execute({
        squadId: 'squad-1',
        ownerId: 'owner-1',
        playerId: 'player-1',
        slotCode: null,
        role: 'SUBSTITUTE',
        isCaptain: true,
      }),
    ).rejects.toThrow(CaptainMustBeStarterError);
  });

  it('TC-14: Cross-user access denied on adding player', async () => {
    mockSquadRepository.findById.mockResolvedValue(validSquad);

    await expect(
      useCase.execute({
        squadId: 'squad-1',
        ownerId: 'owner-2',
        playerId: 'player-1',
        slotCode: 'GK',
        role: 'STARTER',
      }),
    ).rejects.toThrow(SquadNotFoundError);
  });
});
