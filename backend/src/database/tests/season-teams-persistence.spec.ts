import AppDataSource from '../data-source';
import { TypeOrmSeasonTeamWriteRepository } from '../../modules/seasons/infrastructure/persistence/typeorm/repositories/typeorm-season-team-write.repository';
import { PersistSeasonTeamsUseCase } from '../../modules/seasons/application/use-cases/persist-season-teams.use-case';
import { SeasonTeamSyncService } from '../../modules/seasons/application/services/season-team-sync.service';
import { TypeOrmCompetitionWriteRepository } from '../../modules/competitions/infrastructure/persistence/typeorm/repositories/typeorm-competition-write.repository';
import { TypeOrmSeasonWriteRepository } from '../../modules/seasons/infrastructure/persistence/typeorm/repositories/typeorm-season-write.repository';
import { TypeOrmSeasonReadRepository } from '../../modules/seasons/infrastructure/persistence/typeorm/repositories/typeorm-season-read.repository';
import { TypeOrmTeamWriteRepository } from '../../modules/teams/infrastructure/persistence/typeorm/repositories/typeorm-team-write.repository';
import { TypeOrmTeamReadRepository } from '../../modules/teams/infrastructure/persistence/typeorm/repositories/typeorm-team-read.repository';
import { PersistTeamUseCase } from '../../modules/teams/application/use-cases/persist-team.use-case';
import { FootballApiClient } from '../../modules/external-football/application/ports/football-api-client.port';
import { CompetitionOrmEntity } from '../../modules/competitions/infrastructure/persistence/typeorm/entities/competition.orm-entity';
import { SeasonOrmEntity } from '../../modules/seasons/infrastructure/persistence/typeorm/entities/season.orm-entity';
import { TeamOrmEntity } from '../../modules/teams/infrastructure/persistence/typeorm/entities/team.orm-entity';
import { SeasonTeamOrmEntity } from '../../modules/seasons/infrastructure/persistence/typeorm/entities/season-team.orm-entity';

describe('Season Teams Persistence and Sync Integration Test (Live DB)', () => {
  let seasonTeamWriteRepo: TypeOrmSeasonTeamWriteRepository;
  let persistSeasonTeamsUseCase: PersistSeasonTeamsUseCase;
  let seasonTeamSyncService: SeasonTeamSyncService;
  let teamReadRepo: TypeOrmTeamReadRepository;
  let mockApiClient: jest.Mocked<FootballApiClient>;

  let testCompetition: CompetitionOrmEntity;
  let testSeason: SeasonOrmEntity;
  let testTeam1: TeamOrmEntity;
  let testTeam2: TeamOrmEntity;

  const testProvider = 'FOOTBALL_DATA_ORG';
  const testCompExtId = `st-comp-${Date.now()}`;
  const testSeasonExtId = `st-season-${Date.now()}`;
  const testTeamExtId1 = `st-team1-${Date.now()}`;
  const testTeamExtId2 = `st-team2-${Date.now()}`;

  beforeAll(async () => {
    if (!AppDataSource.isInitialized) {
      await AppDataSource.initialize();
    }

    const compOrmRepo = AppDataSource.getRepository(CompetitionOrmEntity);
    const compWriteRepo = new TypeOrmCompetitionWriteRepository(compOrmRepo);
    testCompetition = await compWriteRepo.upsert({
      externalProvider: testProvider,
      externalId: testCompExtId,
      name: 'Season Team Test League',
      code: testCompExtId,
      country: 'England',
      type: 'LEAGUE',
      logoUrl: null,
      dataUpdatedAt: null,
      currentSeason: null,
      seasons: [],
    });

    const seasonOrmRepo = AppDataSource.getRepository(SeasonOrmEntity);
    const seasonWriteRepo = new TypeOrmSeasonWriteRepository(seasonOrmRepo);
    const seasonReadRepo = new TypeOrmSeasonReadRepository(seasonOrmRepo);
    testSeason = await seasonWriteRepo.upsert(
      {
        externalProvider: testProvider,
        externalId: testSeasonExtId,
        seasonCode: '2026',
        name: 'Season Team Test League 2026/27',
        startDate: '2026-08-01',
        endDate: '2027-05-30',
        isCurrent: true,
        currentMatchday: 1,
      },
      testCompetition.id,
    );

    const teamOrmRepo = AppDataSource.getRepository(TeamOrmEntity);
    const teamWriteRepo = new TypeOrmTeamWriteRepository(teamOrmRepo);
    teamReadRepo = new TypeOrmTeamReadRepository(teamOrmRepo);
    const persistTeamUseCase = new PersistTeamUseCase(teamWriteRepo);

    testTeam1 = await teamWriteRepo.upsert({
      externalProvider: testProvider,
      externalId: testTeamExtId1,
      name: 'Season Team 1 FC',
      shortName: 'Team 1',
      tla: 'ST1',
      country: 'England',
      foundedYear: 1901,
      venueName: 'Stadium 1',
      logoUrl: null,
      status: 'ACTIVE',
      dataUpdatedAt: null,
      squad: [],
    });

    testTeam2 = await teamWriteRepo.upsert({
      externalProvider: testProvider,
      externalId: testTeamExtId2,
      name: 'Season Team 2 FC',
      shortName: 'Team 2',
      tla: 'ST2',
      country: 'England',
      foundedYear: 1902,
      venueName: 'Stadium 2',
      logoUrl: null,
      status: 'ACTIVE',
      dataUpdatedAt: null,
      squad: [],
    });

    const seasonTeamOrmRepo = AppDataSource.getRepository(SeasonTeamOrmEntity);
    seasonTeamWriteRepo = new TypeOrmSeasonTeamWriteRepository(seasonTeamOrmRepo);
    persistSeasonTeamsUseCase = new PersistSeasonTeamsUseCase(seasonTeamWriteRepo);

    mockApiClient = {
      getCompetitions: jest.fn(),
      getCompetitionById: jest.fn(),
      getTeams: jest.fn().mockResolvedValue({
        count: 2,
        teams: [
          {
            id: testTeamExtId1 as any,
            name: 'Season Team 1 FC',
          },
          {
            id: testTeamExtId2 as any,
            name: 'Season Team 2 FC',
          },
        ],
      }),
      getTeamById: jest.fn(),
      getMatches: jest.fn(),
      getMatchById: jest.fn(),
      getPlayers: jest.fn(),
      getPlayerById: jest.fn(),
    } as any;

    seasonTeamSyncService = new SeasonTeamSyncService(
      mockApiClient,
      persistSeasonTeamsUseCase,
      persistTeamUseCase,
      compWriteRepo,
      seasonReadRepo,
      seasonWriteRepo,
    );
  });

  afterAll(async () => {
    if (AppDataSource.isInitialized) {
      await AppDataSource.getRepository(SeasonTeamOrmEntity).delete({
        seasonId: testSeason.id,
      });
      await AppDataSource.getRepository(TeamOrmEntity).delete({
        externalProvider: testProvider,
        externalId: testTeamExtId1,
      });
      await AppDataSource.getRepository(TeamOrmEntity).delete({
        externalProvider: testProvider,
        externalId: testTeamExtId2,
      });
      await AppDataSource.getRepository(SeasonOrmEntity).delete({
        externalProvider: testProvider,
        externalId: testSeasonExtId,
      });
      await AppDataSource.getRepository(CompetitionOrmEntity).delete({
        externalProvider: testProvider,
        externalId: testCompExtId,
      });

      await AppDataSource.destroy();
    }
  });

  it('TC-01: should insert relations into season_teams with composite PK', async () => {
    const result = await persistSeasonTeamsUseCase.execute({
      seasonId: testSeason.id,
      teamIds: [testTeam1.id, testTeam2.id],
    });

    expect(result.totalLinked).toBe(2);

    // Verify raw query in PostgreSQL
    const rows = await AppDataSource.query(
      `SELECT * FROM "season_teams" WHERE "season_id" = $1 ORDER BY "team_id" ASC`,
      [testSeason.id],
    );
    expect(rows).toHaveLength(2);
  });

  it('TC-02: should handle idempotent re-linking without duplicating records', async () => {
    const result = await persistSeasonTeamsUseCase.execute({
      seasonId: testSeason.id,
      teamIds: [testTeam1.id, testTeam2.id],
    });

    expect(result.totalLinked).toBe(2);

    const countRows = await AppDataSource.query(
      `SELECT COUNT(*)::int as count FROM "season_teams" WHERE "season_id" = $1`,
      [testSeason.id],
    );
    expect(countRows[0].count).toBe(2);
  });

  it('TC-03: should query linked teams using TeamReadRepository.findBySeasonId', async () => {
    const linkedTeams = await teamReadRepo.findBySeasonId(testSeason.id);

    expect(linkedTeams).toHaveLength(2);
    const teamIds = linkedTeams.map((t) => t.id);
    expect(teamIds).toContain(testTeam1.id);
    expect(teamIds).toContain(testTeam2.id);
  });

  it('TC-04: should sync and link season teams via SeasonTeamSyncService', async () => {
    const syncResult = await seasonTeamSyncService.syncSeasonTeams(testCompExtId, 2026);

    expect(syncResult.competitionId).toBe(testCompetition.id);
    expect(syncResult.seasonId).toBe(testSeason.id);
    expect(syncResult.totalTeamsSynced).toBe(2);
  });
});
