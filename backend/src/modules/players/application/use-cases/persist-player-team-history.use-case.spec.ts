import { BadRequestException, NotFoundException } from '@nestjs/common';
import { PersistPlayerTeamHistoryUseCase } from './persist-player-team-history.use-case';
import { PlayerTeamHistoryWriteRepository } from '../ports/player-team-history-write.repository';
import { PlayerWriteRepository } from '../ports/player-write.repository';
import { TeamWriteRepository } from '../../../teams/application/ports/team-write.repository';
import { PlayerOrmEntity } from '../../infrastructure/persistence/typeorm/entities/player.orm-entity';
import { TeamOrmEntity } from '../../../teams/infrastructure/persistence/typeorm/entities/team.orm-entity';
import { PlayerTeamHistoryOrmEntity } from '../../infrastructure/persistence/typeorm/entities/player-team-history.orm-entity';

describe('PersistPlayerTeamHistoryUseCase', () => {
  let useCase: PersistPlayerTeamHistoryUseCase;
  let mockHistoryRepo: jest.Mocked<PlayerTeamHistoryWriteRepository>;
  let mockPlayerRepo: jest.Mocked<PlayerWriteRepository>;
  let mockTeamRepo: jest.Mocked<TeamWriteRepository>;

  const mockPlayerId = 'player-uuid-1';
  const mockTeamId = 'team-uuid-1';

  const mockPlayerEntity: PlayerOrmEntity = {
    id: mockPlayerId,
    externalProvider: 'FOOTBALL_DATA_ORG',
    externalId: '44',
    name: 'Cristiano Ronaldo',
    normalizedName: 'cristiano ronaldo',
    shortName: 'Ronaldo',
    dateOfBirth: '1985-02-05',
    nationality: 'Portugal',
    heightCm: 187,
    weightKg: 83,
    preferredFoot: 'RIGHT',
    primaryPosition: 'ST',
    shirtNumber: 7,
    imageUrl: null,
    status: 'ACTIVE',
    dataUpdatedAt: null,
    currentTeamId: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    currentTeam: null,
    positions: [],
    teamHistory: [],
    seasonStatistics: [],
    matchStatistics: [],
    shortlistPlayers: [],
    squadPlayers: [],
  };

  const mockTeamEntity: TeamOrmEntity = {
    id: mockTeamId,
    externalProvider: 'FOOTBALL_DATA_ORG',
    externalId: '66',
    name: 'Manchester United FC',
    normalizedName: 'manchester united fc',
    shortName: 'Man United',
    tla: 'MUN',
    crestUrl: null,
    address: null,
    website: null,
    founded: 1878,
    clubColors: 'Red / White',
    venue: 'Old Trafford',
    status: 'ACTIVE',
    dataUpdatedAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    players: [],
    teamHistory: [],
    homeMatches: [],
    awayMatches: [],
    seasonTeams: [],
    squadPlayers: [],
  };

  const mockHistoryEntity: PlayerTeamHistoryOrmEntity = {
    id: 'history-uuid-1',
    playerId: mockPlayerId,
    teamId: mockTeamId,
    startDate: '2021-08-01',
    endDate: null,
    shirtNumber: 7,
    isCurrent: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    player: null as any,
    team: null as any,
  };

  beforeEach(() => {
    mockHistoryRepo = {
      findByPlayerAndTeam: jest.fn(),
      findByPlayerId: jest.fn(),
      upsert: jest.fn().mockResolvedValue(mockHistoryEntity),
      upsertMany: jest.fn().mockResolvedValue([mockHistoryEntity]),
    };

    mockPlayerRepo = {
      findByExternalIdentity: jest.fn().mockResolvedValue(mockPlayerEntity),
      upsert: jest.fn(),
      upsertMany: jest.fn(),
    };

    mockTeamRepo = {
      findByExternalIdentity: jest.fn().mockResolvedValue(mockTeamEntity),
      upsert: jest.fn(),
      upsertMany: jest.fn(),
    };

    useCase = new PersistPlayerTeamHistoryUseCase(
      mockHistoryRepo,
      mockPlayerRepo,
      mockTeamRepo,
    );
  });

  it('TC-06 & TC-07: should resolve internal Player UUID and Team UUID from external identities', async () => {
    const result = await useCase.execute({
      playerExternalId: '44',
      teamExternalId: '66',
      externalProvider: 'FOOTBALL_DATA_ORG',
      startDate: '2021-08-01',
      endDate: null,
      shirtNumber: 7,
      isCurrent: true,
    });

    expect(mockPlayerRepo.findByExternalIdentity).toHaveBeenCalledWith(
      'FOOTBALL_DATA_ORG',
      '44',
    );
    expect(mockTeamRepo.findByExternalIdentity).toHaveBeenCalledWith(
      'FOOTBALL_DATA_ORG',
      '66',
    );
    expect(mockHistoryRepo.upsert).toHaveBeenCalledWith({
      playerId: mockPlayerId,
      teamId: mockTeamId,
      startDate: '2021-08-01',
      endDate: null,
      shirtNumber: 7,
      isCurrent: true,
    });
    expect(result.playerId).toBe(mockPlayerId);
    expect(result.teamId).toBe(mockTeamId);
  });

  it('should accept direct playerId and teamId without calling write repositories', async () => {
    const result = await useCase.execute({
      playerId: mockPlayerId,
      teamId: mockTeamId,
      startDate: '2015-01-01',
      endDate: '2018-12-31',
      isCurrent: false,
    });

    expect(mockPlayerRepo.findByExternalIdentity).not.toHaveBeenCalled();
    expect(mockTeamRepo.findByExternalIdentity).not.toHaveBeenCalled();
    expect(mockHistoryRepo.upsert).toHaveBeenCalledWith({
      playerId: mockPlayerId,
      teamId: mockTeamId,
      startDate: '2015-01-01',
      endDate: '2018-12-31',
      shirtNumber: null,
      isCurrent: false,
    });
    expect(result.playerId).toBe(mockPlayerId);
    expect(result.teamId).toBe(mockTeamId);
  });

  it('TC-08: should throw NotFoundException when player is not found', async () => {
    mockPlayerRepo.findByExternalIdentity.mockResolvedValue(null);

    await expect(
      useCase.execute({
        playerExternalId: '99999',
        teamExternalId: '66',
      }),
    ).rejects.toThrow(NotFoundException);
  });

  it('TC-09: should throw NotFoundException when team is not found', async () => {
    mockTeamRepo.findByExternalIdentity.mockResolvedValue(null);

    await expect(
      useCase.execute({
        playerExternalId: '44',
        teamExternalId: '99999',
      }),
    ).rejects.toThrow(NotFoundException);
  });

  it('TC-10 & TC-11 & TC-12: should handle null startDate, null endDate, and null shirtNumber', async () => {
    await useCase.execute({
      playerId: mockPlayerId,
      teamId: mockTeamId,
      startDate: null,
      endDate: null,
      shirtNumber: null,
      isCurrent: true,
    });

    expect(mockHistoryRepo.upsert).toHaveBeenCalledWith({
      playerId: mockPlayerId,
      teamId: mockTeamId,
      startDate: null,
      endDate: null,
      shirtNumber: null,
      isCurrent: true,
    });
  });

  it('should batch execute multiple records with executeMany', async () => {
    const results = await useCase.executeMany([
      { playerId: mockPlayerId, teamId: mockTeamId, isCurrent: true },
      { playerId: mockPlayerId, teamId: 'team-2', isCurrent: false },
    ]);

    expect(results).toHaveLength(2);
    expect(mockHistoryRepo.upsert).toHaveBeenCalledTimes(2);
  });

  it('should throw BadRequestException when input or IDs are missing', async () => {
    await expect(useCase.execute(null as any)).rejects.toThrow(
      BadRequestException,
    );
    await expect(
      useCase.execute({
        playerExternalId: '',
        teamExternalId: '66',
      }),
    ).rejects.toThrow(BadRequestException);
  });
});
