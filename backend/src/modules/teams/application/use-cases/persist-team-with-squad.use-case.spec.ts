import { BadRequestException } from '@nestjs/common';
import { PersistTeamWithSquadUseCase } from './persist-team-with-squad.use-case';
import { PersistTeamUseCase } from './persist-team.use-case';
import { PersistPlayerUseCase } from '../../../players/application/use-cases/persist-player.use-case';
import { TransformedTeam } from '../../../external-football/domain/models/transformed-team.model';
import { TeamOrmEntity } from '../../infrastructure/persistence/typeorm/entities/team.orm-entity';
import { PlayerOrmEntity } from '../../../players/infrastructure/persistence/typeorm/entities/player.orm-entity';

describe('PersistTeamWithSquadUseCase', () => {
  let useCase: PersistTeamWithSquadUseCase;
  let mockPersistTeamUseCase: jest.Mocked<PersistTeamUseCase>;
  let mockPersistPlayerUseCase: jest.Mocked<PersistPlayerUseCase>;

  const mockTeamEntity: TeamOrmEntity = {
    id: 'team-uuid-123',
    externalProvider: 'FOOTBALL_DATA_ORG',
    externalId: '66',
    name: 'Manchester United FC',
    shortName: 'Man United',
    tla: 'MUN',
    country: 'England',
    foundedYear: 1878,
    venueName: 'Old Trafford',
    logoUrl: 'https://crests.football-data.org/66.png',
    status: 'ACTIVE',
    dataUpdatedAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    players: [],
    teamHistory: [],
    homeMatches: [],
    awayMatches: [],
    matchStatistics: [],
    seasonStatistics: [],
    seasonTeams: [],
  };

  const mockPlayerEntities: PlayerOrmEntity[] = [
    {
      id: 'player-uuid-1',
      currentTeamId: 'team-uuid-123',
      externalProvider: 'FOOTBALL_DATA_ORG',
      externalId: '44',
      name: 'Cristiano Ronaldo',
      normalizedName: 'cristiano ronaldo',
      shortName: 'Ronaldo',
      dateOfBirth: '1985-02-05',
      nationality: 'Portugal',
      heightCm: 187,
      weightKg: 83,
      primaryPosition: 'Centre-Forward',
      shirtNumber: 7,
      imageUrl: null,
      status: 'ACTIVE',
      dataUpdatedAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      currentTeam: null,
      positions: [],
      teamHistory: [],
      matchStatistics: [],
      seasonStatistics: [],
    },
  ];

  const mockTransformedTeam: TransformedTeam = {
    externalProvider: 'FOOTBALL_DATA_ORG',
    externalId: '66',
    name: 'Manchester United FC',
    shortName: 'Man United',
    tla: 'MUN',
    country: 'England',
    foundedYear: 1878,
    venueName: 'Old Trafford',
    logoUrl: 'https://crests.football-data.org/66.png',
    status: 'ACTIVE',
    dataUpdatedAt: null,
    squad: [
      {
        externalProvider: 'FOOTBALL_DATA_ORG',
        externalId: '44',
        name: 'Cristiano Ronaldo',
        normalizedName: 'cristiano ronaldo',
        shortName: 'Ronaldo',
        dateOfBirth: '1985-02-05',
        nationality: 'Portugal',
        heightCm: 187,
        weightKg: 83,
        primaryPosition: 'Centre-Forward',
        shirtNumber: 7,
        imageUrl: null,
        status: 'ACTIVE',
        dataUpdatedAt: null,
      },
    ],
  };

  beforeEach(() => {
    mockPersistTeamUseCase = {
      execute: jest.fn().mockResolvedValue(mockTeamEntity),
      executeMany: jest.fn(),
    } as any;

    mockPersistPlayerUseCase = {
      execute: jest.fn(),
      executeMany: jest.fn().mockResolvedValue(mockPlayerEntities),
    } as any;

    useCase = new PersistTeamWithSquadUseCase(
      mockPersistTeamUseCase,
      mockPersistPlayerUseCase,
    );
  });

  it('should persist team and all squad players linking current_team_id', async () => {
    const result = await useCase.execute(mockTransformedTeam);

    expect(mockPersistTeamUseCase.execute).toHaveBeenCalledWith(mockTransformedTeam);
    expect(mockPersistPlayerUseCase.executeMany).toHaveBeenCalledWith(
      mockTransformedTeam.squad,
      'team-uuid-123',
    );
    expect(result.teamId).toBe('team-uuid-123');
    expect(result.playersPersisted).toBe(1);
    expect(result.players).toEqual(mockPlayerEntities);
  });

  it('should persist team only when squad is empty', async () => {
    const teamWithoutSquad = { ...mockTransformedTeam, squad: [] };
    const result = await useCase.execute(teamWithoutSquad);

    expect(mockPersistTeamUseCase.execute).toHaveBeenCalledWith(teamWithoutSquad);
    expect(mockPersistPlayerUseCase.executeMany).not.toHaveBeenCalled();
    expect(result.playersPersisted).toBe(0);
  });

  it('should propagate team persistence error and abort squad persistence', async () => {
    mockPersistTeamUseCase.execute.mockRejectedValue(new Error('DB error on team'));

    await expect(useCase.execute(mockTransformedTeam)).rejects.toThrow('DB error on team');
    expect(mockPersistPlayerUseCase.executeMany).not.toHaveBeenCalled();
  });

  it('should propagate player persistence error', async () => {
    mockPersistPlayerUseCase.executeMany.mockRejectedValue(new Error('DB error on player'));

    await expect(useCase.execute(mockTransformedTeam)).rejects.toThrow('DB error on player');
  });

  it('should reject invalid team payload', async () => {
    await expect(useCase.execute(null as any)).rejects.toThrow(BadRequestException);
    await expect(
      useCase.execute({ ...mockTransformedTeam, externalProvider: '' }),
    ).rejects.toThrow(BadRequestException);
    await expect(
      useCase.execute({ ...mockTransformedTeam, externalId: '  ' }),
    ).rejects.toThrow(BadRequestException);
    await expect(
      useCase.execute({ ...mockTransformedTeam, name: '' }),
    ).rejects.toThrow(BadRequestException);
  });
});
