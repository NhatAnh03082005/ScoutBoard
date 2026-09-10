import { UpdateSquadPlayerUseCase } from './update-squad-player.use-case';
import { SquadRepository } from '../../domain/repositories/squad.repository';
import { SquadPlayerRepository } from '../../domain/repositories/squad-player.repository';
import { Squad } from '../../domain/entities/squad';
import { SquadPlayer } from '../../domain/entities/squad-player';
import {
  SquadNotFoundError,
  PlayerNotInSquadError,
  CaptainMustBeStarterError,
} from '../../domain/errors/squad.errors';

describe('UpdateSquadPlayerUseCase', () => {
  let useCase: UpdateSquadPlayerUseCase;
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

    useCase = new UpdateSquadPlayerUseCase(
      mockSquadRepository,
      mockSquadPlayerRepository,
    );
  });

  it('TC-06: should move slot for starter player', async () => {
    mockSquadRepository.findById.mockResolvedValue(validSquad);
    const player = new SquadPlayer('sp-1', 'squad-1', 'p-1', 'CB-1', 'STARTER');
    mockSquadPlayerRepository.findBySquadAndPlayer.mockResolvedValue(player);
    mockSquadPlayerRepository.findStarterBySlotCode.mockResolvedValue(null);
    mockSquadPlayerRepository.save.mockImplementation(async (sp) => sp);

    const result = await useCase.execute({
      squadId: 'squad-1',
      ownerId: 'owner-1',
      playerId: 'p-1',
      slotCode: 'CB-2',
    });

    expect(result.getSlotCode()).toBe('CB-2');
  });

  it('TC-07: Starter -> Substitute conversion resets captain status', async () => {
    mockSquadRepository.findById.mockResolvedValue(validSquad);
    const player = new SquadPlayer(
      'sp-1',
      'squad-1',
      'p-1',
      'CB-1',
      'STARTER',
      true,
    );
    mockSquadPlayerRepository.findBySquadAndPlayer.mockResolvedValue(player);
    mockSquadPlayerRepository.save.mockImplementation(async (sp) => sp);

    const result = await useCase.execute({
      squadId: 'squad-1',
      ownerId: 'owner-1',
      playerId: 'p-1',
      role: 'SUBSTITUTE',
      slotCode: null,
      displayOrder: 2,
    });

    expect(result.getRole()).toBe('SUBSTITUTE');
    expect(result.getSlotCode()).toBeNull();
    expect(result.getIsCaptain()).toBe(false);
    expect(result.getDisplayOrder()).toBe(2);
  });

  it('TC-08: Substitute -> Starter conversion', async () => {
    mockSquadRepository.findById.mockResolvedValue(validSquad);
    const player = new SquadPlayer(
      'sp-1',
      'squad-1',
      'p-1',
      null,
      'SUBSTITUTE',
      false,
      1,
    );
    mockSquadPlayerRepository.findBySquadAndPlayer.mockResolvedValue(player);
    mockSquadPlayerRepository.findStarterBySlotCode.mockResolvedValue(null);
    mockSquadPlayerRepository.save.mockImplementation(async (sp) => sp);

    const result = await useCase.execute({
      squadId: 'squad-1',
      ownerId: 'owner-1',
      playerId: 'p-1',
      role: 'STARTER',
      slotCode: 'RW',
    });

    expect(result.getRole()).toBe('STARTER');
    expect(result.getSlotCode()).toBe('RW');
  });

  it('TC-01: Set captain on starter player', async () => {
    mockSquadRepository.findById.mockResolvedValue(validSquad);
    const player = new SquadPlayer(
      'sp-1',
      'squad-1',
      'p-1',
      'CM-1',
      'STARTER',
      false,
    );
    mockSquadPlayerRepository.findBySquadAndPlayer.mockResolvedValue(player);
    mockSquadPlayerRepository.findCaptainBySquadId.mockResolvedValue(null);
    mockSquadPlayerRepository.save.mockImplementation(async (sp) => sp);

    const result = await useCase.execute({
      squadId: 'squad-1',
      ownerId: 'owner-1',
      playerId: 'p-1',
      isCaptain: true,
    });

    expect(result.getIsCaptain()).toBe(true);
  });

  it('TC-02: Change captain seamlessly switches captaincy from existing captain', async () => {
    mockSquadRepository.findById.mockResolvedValue(validSquad);
    const player2 = new SquadPlayer(
      'sp-2',
      'squad-1',
      'p-2',
      'CM-1',
      'STARTER',
      false,
    );
    const existingCaptain = new SquadPlayer(
      'sp-1',
      'squad-1',
      'p-1',
      'ST',
      'STARTER',
      true,
    );

    mockSquadPlayerRepository.findBySquadAndPlayer.mockResolvedValue(player2);
    mockSquadPlayerRepository.findCaptainBySquadId.mockResolvedValue(
      existingCaptain,
    );
    mockSquadPlayerRepository.save.mockImplementation(async (sp) => sp);

    const result = await useCase.execute({
      squadId: 'squad-1',
      ownerId: 'owner-1',
      playerId: 'p-2',
      isCaptain: true,
    });

    expect(existingCaptain.getIsCaptain()).toBe(false);
    expect(result.getIsCaptain()).toBe(true);
    expect(mockSquadPlayerRepository.save).toHaveBeenCalledWith(
      existingCaptain,
    );
    expect(mockSquadPlayerRepository.save).toHaveBeenCalledWith(player2);
  });

  it('TC-03: Remove captaincy from player', async () => {
    mockSquadRepository.findById.mockResolvedValue(validSquad);
    const player = new SquadPlayer(
      'sp-1',
      'squad-1',
      'p-1',
      'CM-1',
      'STARTER',
      true,
    );
    mockSquadPlayerRepository.findBySquadAndPlayer.mockResolvedValue(player);
    mockSquadPlayerRepository.save.mockImplementation(async (sp) => sp);

    const result = await useCase.execute({
      squadId: 'squad-1',
      ownerId: 'owner-1',
      playerId: 'p-1',
      isCaptain: false,
    });

    expect(result.getIsCaptain()).toBe(false);
  });

  it('TC-04: Try captain on substitute should throw CaptainMustBeStarterError', async () => {
    mockSquadRepository.findById.mockResolvedValue(validSquad);
    const subPlayer = new SquadPlayer(
      'sp-3',
      'squad-1',
      'p-3',
      null,
      'SUBSTITUTE',
      false,
    );
    mockSquadPlayerRepository.findBySquadAndPlayer.mockResolvedValue(subPlayer);

    await expect(
      useCase.execute({
        squadId: 'squad-1',
        ownerId: 'owner-1',
        playerId: 'p-3',
        isCaptain: true,
      }),
    ).rejects.toThrow(CaptainMustBeStarterError);
  });
});
