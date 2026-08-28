import AppDataSource from '../data-source';
import { TypeOrmTeamWriteRepository } from '../../modules/teams/infrastructure/persistence/typeorm/repositories/typeorm-team-write.repository';
import { PersistTeamUseCase } from '../../modules/teams/application/use-cases/persist-team.use-case';
import { TypeOrmPlayerWriteRepository } from '../../modules/players/infrastructure/persistence/typeorm/repositories/typeorm-player-write.repository';
import { PersistPlayerUseCase } from '../../modules/players/application/use-cases/persist-player.use-case';
import { PersistTeamWithSquadUseCase } from '../../modules/teams/application/use-cases/persist-team-with-squad.use-case';
import { TeamSyncService } from '../../modules/teams/application/services/team-sync.service';
import { PlayerSyncService } from '../../modules/players/application/services/player-sync.service';
import { FootballApiClient } from '../../modules/external-football/application/ports/football-api-client.port';
import { TeamOrmEntity } from '../../modules/teams/infrastructure/persistence/typeorm/entities/team.orm-entity';
import { PlayerOrmEntity } from '../../modules/players/infrastructure/persistence/typeorm/entities/player.orm-entity';
import { TransformedTeam } from '../../modules/external-football/domain/models/transformed-team.model';
import { TransformedPlayer } from '../../modules/external-football/domain/models/transformed-player.model';

describe('Teams & Players Persistence and Sync Integration Test (Live DB)', () => {
  let teamWriteRepo: TypeOrmTeamWriteRepository;
  let playerWriteRepo: TypeOrmPlayerWriteRepository;
  let persistTeamUseCase: PersistTeamUseCase;
  let persistPlayerUseCase: PersistPlayerUseCase;
  let persistTeamWithSquadUseCase: PersistTeamWithSquadUseCase;
  let teamSyncService: TeamSyncService;
  let playerSyncService: PlayerSyncService;
  let mockApiClient: jest.Mocked<FootballApiClient>;

  const testProvider = 'FOOTBALL_DATA_ORG';
  const testTeamExtId = `test-team-${Date.now()}`;
  const testPlayerExtId1 = `test-p1-${Date.now()}`;
  const testPlayerExtId2 = `test-p2-${Date.now()}`;

  beforeAll(async () => {
    if (!AppDataSource.isInitialized) {
      await AppDataSource.initialize();
    }

    const teamOrmRepo = AppDataSource.getRepository(TeamOrmEntity);
    teamWriteRepo = new TypeOrmTeamWriteRepository(teamOrmRepo);
    persistTeamUseCase = new PersistTeamUseCase(teamWriteRepo);

    const playerOrmRepo = AppDataSource.getRepository(PlayerOrmEntity);
    playerWriteRepo = new TypeOrmPlayerWriteRepository(playerOrmRepo);
    persistPlayerUseCase = new PersistPlayerUseCase(playerWriteRepo);

    persistTeamWithSquadUseCase = new PersistTeamWithSquadUseCase(
      persistTeamUseCase,
      persistPlayerUseCase,
    );

    mockApiClient = {
      getCompetitions: jest.fn(),
      getCompetitionById: jest.fn(),
      getTeams: jest.fn(),
      getTeamById: jest.fn().mockResolvedValue({
        id: testTeamExtId as any,
        name: 'Sync Integration FC',
        shortName: 'Sync FC',
        tla: 'SFC',
        crest: 'https://crests.example.com/sfc.png',
        founded: 1900,
        venue: 'Sync Stadium',
        squad: [
          {
            id: testPlayerExtId1 as any,
            name: 'Live Player One',
            position: 'Attacking Midfield',
            shirtNumber: 10,
          },
          {
            id: testPlayerExtId2 as any,
            name: 'Live Player Two',
            position: 'Centre-Forward',
            shirtNumber: 9,
          },
        ],
      }),
      getMatches: jest.fn(),
      getMatchById: jest.fn(),
      getPlayers: jest.fn().mockResolvedValue({
        count: 2,
        players: [
          {
            id: testPlayerExtId1 as any,
            name: 'Live Player One',
            position: 'Attacking Midfield',
            shirtNumber: 10,
          },
          {
            id: testPlayerExtId2 as any,
            name: 'Live Player Two',
            position: 'Centre-Forward',
            shirtNumber: 9,
          },
        ],
      }),
      getPlayerById: jest.fn().mockResolvedValue({
        id: testPlayerExtId1 as any,
        name: 'Live Player One',
        position: 'Attacking Midfield',
        currentTeam: {
          id: testTeamExtId as any,
          name: 'Sync Integration FC',
        },
      }),
    } as any;

    teamSyncService = new TeamSyncService(mockApiClient, persistTeamWithSquadUseCase);
    playerSyncService = new PlayerSyncService(mockApiClient, persistPlayerUseCase, teamWriteRepo);
  });

  afterAll(async () => {
    if (AppDataSource.isInitialized) {
      await AppDataSource.getRepository(PlayerOrmEntity).delete({
        externalProvider: testProvider,
        externalId: testPlayerExtId1,
      });
      await AppDataSource.getRepository(PlayerOrmEntity).delete({
        externalProvider: testProvider,
        externalId: testPlayerExtId2,
      });
      await AppDataSource.getRepository(TeamOrmEntity).delete({
        externalProvider: testProvider,
        externalId: testTeamExtId,
      });

      await AppDataSource.destroy();
    }
  });

  it('TC-01: should insert and update a Team in PostgreSQL idempotently', async () => {
    const teamInput: TransformedTeam = {
      externalProvider: testProvider,
      externalId: testTeamExtId,
      name: 'Integration Test Team',
      shortName: 'Test FC',
      tla: 'ITT',
      country: 'England',
      foundedYear: 1899,
      venueName: 'Test Ground',
      logoUrl: 'https://crests.example.com/itt.png',
      status: 'ACTIVE',
      dataUpdatedAt: new Date('2026-08-01T00:00:00Z'),
      squad: [],
    };

    const team1 = await persistTeamUseCase.execute(teamInput);
    expect(team1.id).toBeDefined();

    const team2 = await persistTeamUseCase.execute({
      ...teamInput,
      name: 'Integration Test Team Updated',
    });
    expect(team2.id).toBe(team1.id);
    expect(team2.name).toBe('Integration Test Team Updated');

    // Verify raw query in PostgreSQL
    const teamRows = await AppDataSource.query(
      `SELECT * FROM "teams" WHERE "external_provider" = $1 AND "external_id" = $2`,
      [testProvider, testTeamExtId],
    );
    expect(teamRows).toHaveLength(1);
    expect(teamRows[0].id).toBe(team1.id);
    expect(teamRows[0].name).toBe('Integration Test Team Updated');
  });

  it('TC-02: should insert Player with valid current_team_id internal UUID', async () => {
    const teamRows = await AppDataSource.query(
      `SELECT "id" FROM "teams" WHERE "external_provider" = $1 AND "external_id" = $2`,
      [testProvider, testTeamExtId],
    );
    const internalTeamId = teamRows[0].id;

    const playerInput: TransformedPlayer = {
      externalProvider: testProvider,
      externalId: testPlayerExtId1,
      name: 'Test Player One',
      normalizedName: 'test player one',
      shortName: 'Player One',
      dateOfBirth: '1995-05-10',
      nationality: 'England',
      heightCm: 180,
      weightKg: 75,
      preferredFoot: 'Right',
      primaryPosition: 'Centre-Forward',
      shirtNumber: 9,
      imageUrl: null,
      status: 'ACTIVE',
      dataUpdatedAt: null,
    };

    const persistedPlayer = await persistPlayerUseCase.execute(playerInput, internalTeamId);

    expect(persistedPlayer.id).toBeDefined();
    expect(persistedPlayer.currentTeamId).toBe(internalTeamId);

    // Direct SQL check
    const playerRows = await AppDataSource.query(
      `SELECT * FROM "players" WHERE "external_provider" = $1 AND "external_id" = $2`,
      [testProvider, testPlayerExtId1],
    );
    expect(playerRows).toHaveLength(1);
    expect(playerRows[0].current_team_id).toBe(internalTeamId);
    expect(playerRows[0].primary_position).toBe('Centre-Forward');
  });

  it('TC-03: should sync Team with full Squad via TeamSyncService into PostgreSQL', async () => {
    const result = await teamSyncService.syncTeamById(testTeamExtId);

    expect(result.teamId).toBeDefined();
    expect(result.playersPersisted).toBe(2);

    // Check squad players in PostgreSQL
    const squadRows = await AppDataSource.query(
      `SELECT * FROM "players" WHERE "current_team_id" = $1 ORDER BY "shirt_number" ASC`,
      [result.teamId],
    );
    expect(squadRows).toHaveLength(2);
    expect(squadRows[0].current_team_id).toBe(result.teamId);
    expect(squadRows[1].current_team_id).toBe(result.teamId);
  });

  it('TC-04: should sync single Player resolving Team UUID via PlayerSyncService', async () => {
    const result = await playerSyncService.syncPlayerById(testPlayerExtId1);

    expect(result.playerId).toBeDefined();
    expect(result.currentTeamId).toBeDefined();

    // Check in PostgreSQL
    const playerRows = await AppDataSource.query(
      `SELECT * FROM "players" WHERE "id" = $1`,
      [result.playerId],
    );
    expect(playerRows).toHaveLength(1);
    expect(playerRows[0].name).toBe('Live Player One');
  });

  it('TC-05: should sync squad players by team ID via PlayerSyncService into PostgreSQL', async () => {
    const batchResult = await playerSyncService.syncPlayersByTeam(testTeamExtId);

    expect(batchResult.totalRequested).toBe(2);
    expect(batchResult.successful).toBe(2);
    expect(batchResult.failed).toBe(0);

    // Direct check in DB
    const playerRows = await AppDataSource.query(
      `SELECT COUNT(*)::int as count FROM "players" WHERE "external_provider" = $1 AND "external_id" IN ($2, $3)`,
      [testProvider, testPlayerExtId1, testPlayerExtId2],
    );
    expect(playerRows[0].count).toBe(2);
  });
});
