import AppDataSource from '../data-source';
import { TypeOrmMatchWriteRepository } from '../../modules/matches/infrastructure/persistence/typeorm/repositories/typeorm-match-write.repository';
import { PersistMatchUseCase } from '../../modules/matches/application/use-cases/persist-match.use-case';
import { MatchSyncService } from '../../modules/matches/application/services/match-sync.service';
import { TypeOrmCompetitionWriteRepository } from '../../modules/competitions/infrastructure/persistence/typeorm/repositories/typeorm-competition-write.repository';
import { TypeOrmSeasonWriteRepository } from '../../modules/seasons/infrastructure/persistence/typeorm/repositories/typeorm-season-write.repository';
import { TypeOrmTeamWriteRepository } from '../../modules/teams/infrastructure/persistence/typeorm/repositories/typeorm-team-write.repository';
import { FootballApiClient } from '../../modules/external-football/application/ports/football-api-client.port';
import { CompetitionOrmEntity } from '../../modules/competitions/infrastructure/persistence/typeorm/entities/competition.orm-entity';
import { SeasonOrmEntity } from '../../modules/seasons/infrastructure/persistence/typeorm/entities/season.orm-entity';
import { TeamOrmEntity } from '../../modules/teams/infrastructure/persistence/typeorm/entities/team.orm-entity';
import { MatchOrmEntity } from '../../modules/matches/infrastructure/persistence/typeorm/entities/match.orm-entity';
import { TransformedMatch } from '../../modules/external-football/domain/models/transformed-match.model';

describe('Matches Persistence and Sync Integration Test (Live DB)', () => {
  let matchWriteRepo: TypeOrmMatchWriteRepository;
  let persistMatchUseCase: PersistMatchUseCase;
  let matchSyncService: MatchSyncService;
  let mockApiClient: jest.Mocked<FootballApiClient>;

  let testCompetition: CompetitionOrmEntity;
  let testSeason: SeasonOrmEntity;
  let testHomeTeam: TeamOrmEntity;
  let testAwayTeam: TeamOrmEntity;

  const testProvider = 'FOOTBALL_DATA_ORG';
  const testCompExtId = `m-comp-${Date.now()}`;
  const testSeasonExtId = `m-season-${Date.now()}`;
  const testHomeTeamExtId = `m-home-${Date.now()}`;
  const testAwayTeamExtId = `m-away-${Date.now()}`;
  const testMatchExtId = `m-match-${Date.now()}`;

  beforeAll(async () => {
    if (!AppDataSource.isInitialized) {
      await AppDataSource.initialize();
    }

    const compOrmRepo = AppDataSource.getRepository(CompetitionOrmEntity);
    const compWriteRepo = new TypeOrmCompetitionWriteRepository(compOrmRepo);
    testCompetition = await compWriteRepo.upsert({
      externalProvider: testProvider,
      externalId: testCompExtId,
      name: 'Match Test League',
      code: 'MTL',
      country: 'England',
      type: 'LEAGUE',
      logoUrl: null,
      dataUpdatedAt: null,
      currentSeason: null,
      seasons: [],
    });

    const seasonOrmRepo = AppDataSource.getRepository(SeasonOrmEntity);
    const seasonWriteRepo = new TypeOrmSeasonWriteRepository(seasonOrmRepo);
    testSeason = await seasonWriteRepo.upsert(
      {
        externalProvider: testProvider,
        externalId: testSeasonExtId,
        seasonCode: '2026-2027',
        name: 'Match Test League 2026/27',
        startDate: '2026-08-01',
        endDate: '2027-05-30',
        isCurrent: true,
        currentMatchday: 1,
      },
      testCompetition.id,
    );

    const teamOrmRepo = AppDataSource.getRepository(TeamOrmEntity);
    const teamWriteRepo = new TypeOrmTeamWriteRepository(teamOrmRepo);
    testHomeTeam = await teamWriteRepo.upsert({
      externalProvider: testProvider,
      externalId: testHomeTeamExtId,
      name: 'Match Home Team FC',
      shortName: 'Home FC',
      tla: 'HOM',
      country: 'England',
      foundedYear: 1900,
      venueName: 'Home Stadium',
      logoUrl: null,
      status: 'ACTIVE',
      dataUpdatedAt: null,
      squad: [],
    });

    testAwayTeam = await teamWriteRepo.upsert({
      externalProvider: testProvider,
      externalId: testAwayTeamExtId,
      name: 'Match Away Team FC',
      shortName: 'Away FC',
      tla: 'AWY',
      country: 'England',
      foundedYear: 1905,
      venueName: 'Away Stadium',
      logoUrl: null,
      status: 'ACTIVE',
      dataUpdatedAt: null,
      squad: [],
    });

    const matchOrmRepo = AppDataSource.getRepository(MatchOrmEntity);
    matchWriteRepo = new TypeOrmMatchWriteRepository(matchOrmRepo);
    persistMatchUseCase = new PersistMatchUseCase(
      matchWriteRepo,
      compWriteRepo,
      seasonWriteRepo,
      teamWriteRepo,
    );

    mockApiClient = {
      getCompetitions: jest.fn(),
      getCompetitionById: jest.fn(),
      getTeams: jest.fn(),
      getTeamById: jest.fn(),
      getMatches: jest.fn(),
      getMatchById: jest.fn().mockResolvedValue({
        id: testMatchExtId as any,
        utcDate: '2026-08-22T19:00:00Z',
        status: 'FINISHED',
        competition: {
          id: testCompExtId as any,
          name: 'Match Test League',
          code: 'MTL',
        },
        season: {
          id: testSeasonExtId as any,
          startDate: '2026-08-01',
          endDate: '2027-05-30',
        },
        homeTeam: {
          id: testHomeTeamExtId as any,
          name: 'Match Home Team FC',
        },
        awayTeam: {
          id: testAwayTeamExtId as any,
          name: 'Match Away Team FC',
        },
        score: {
          fullTime: {
            home: 3,
            away: 1,
          },
        },
      }),
      getPlayers: jest.fn(),
      getPlayerById: jest.fn(),
    } as any;

    matchSyncService = new MatchSyncService(
      mockApiClient,
      persistMatchUseCase,
      compWriteRepo,
      seasonWriteRepo,
      teamWriteRepo,
    );
  });

  afterAll(async () => {
    if (AppDataSource.isInitialized) {
      await AppDataSource.getRepository(MatchOrmEntity).delete({
        externalProvider: testProvider,
        externalId: testMatchExtId,
      });
      await AppDataSource.getRepository(TeamOrmEntity).delete({
        externalProvider: testProvider,
        externalId: testHomeTeamExtId,
      });
      await AppDataSource.getRepository(TeamOrmEntity).delete({
        externalProvider: testProvider,
        externalId: testAwayTeamExtId,
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

  it('TC-01: should insert and update Match in PostgreSQL with all 4 FK UUIDs', async () => {
    const matchInput: TransformedMatch = {
      externalProvider: testProvider,
      externalId: testMatchExtId,
      matchDate: new Date('2026-08-22T19:00:00Z'),
      status: 'SCHEDULED',
      homeScore: null,
      awayScore: null,
      dataUpdatedAt: null,
      homeTeamExternalId: testHomeTeamExtId,
      awayTeamExternalId: testAwayTeamExtId,
    };

    const refs = {
      competitionId: testCompetition.id,
      seasonId: testSeason.id,
      homeTeamId: testHomeTeam.id,
      awayTeamId: testAwayTeam.id,
    };

    const persisted = await persistMatchUseCase.execute(matchInput, refs);

    expect(persisted.id).toBeDefined();
    expect(persisted.competitionId).toBe(testCompetition.id);
    expect(persisted.seasonId).toBe(testSeason.id);
    expect(persisted.homeTeamId).toBe(testHomeTeam.id);
    expect(persisted.awayTeamId).toBe(testAwayTeam.id);
    expect(persisted.status).toBe('SCHEDULED');

    // Direct SQL check in PostgreSQL
    const rows = await AppDataSource.query(
      `SELECT * FROM "matches" WHERE "external_provider" = $1 AND "external_id" = $2`,
      [testProvider, testMatchExtId],
    );
    expect(rows).toHaveLength(1);
    expect(rows[0].id).toBe(persisted.id);
    expect(rows[0].competition_id).toBe(testCompetition.id);
    expect(rows[0].season_id).toBe(testSeason.id);
    expect(rows[0].home_team_id).toBe(testHomeTeam.id);
    expect(rows[0].away_team_id).toBe(testAwayTeam.id);
  });

  it('TC-02: should update Match idempotently without duplicating rows', async () => {
    const updatedInput: TransformedMatch = {
      externalProvider: testProvider,
      externalId: testMatchExtId,
      matchDate: new Date('2026-08-22T19:00:00Z'),
      status: 'FINISHED',
      homeScore: 2,
      awayScore: 0,
      dataUpdatedAt: new Date('2026-08-22T21:00:00Z'),
      homeTeamExternalId: testHomeTeamExtId,
      awayTeamExternalId: testAwayTeamExtId,
    };

    const refs = {
      competitionId: testCompetition.id,
      seasonId: testSeason.id,
      homeTeamId: testHomeTeam.id,
      awayTeamId: testAwayTeam.id,
    };

    const run1 = await persistMatchUseCase.execute(updatedInput, refs);
    const run2 = await persistMatchUseCase.execute(updatedInput, refs);

    expect(run1.id).toBe(run2.id);

    // Verify row count remains 1
    const countRows = await AppDataSource.query(
      `SELECT COUNT(*)::int as count FROM "matches" WHERE "external_provider" = $1 AND "external_id" = $2`,
      [testProvider, testMatchExtId],
    );
    expect(countRows[0].count).toBe(1);

    const rows = await AppDataSource.query(
      `SELECT "status", "home_score", "away_score" FROM "matches" WHERE "id" = $1`,
      [run1.id],
    );
    expect(rows[0].status).toBe('FINISHED');
    expect(rows[0].home_score).toBe(2);
    expect(rows[0].away_score).toBe(0);
  });

  it('TC-03: should end-to-end sync Match resolving 4 parent entities via MatchSyncService', async () => {
    const result = await matchSyncService.syncMatchById(testMatchExtId);

    expect(result.matchId).toBeDefined();
    expect(result.homeScore).toBe(3);
    expect(result.awayScore).toBe(1);
    expect(result.status).toBe('FINISHED');

    // Verify in PostgreSQL
    const rows = await AppDataSource.query(
      `SELECT "home_score", "away_score", "status" FROM "matches" WHERE "id" = $1`,
      [result.matchId],
    );
    expect(rows[0].home_score).toBe(3);
    expect(rows[0].away_score).toBe(1);
  });
});
