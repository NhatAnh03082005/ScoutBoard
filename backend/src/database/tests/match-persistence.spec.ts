import AppDataSource from '../data-source';
import { TypeOrmCompetitionWriteRepository } from '../../modules/competitions/infrastructure/persistence/typeorm/repositories/typeorm-competition-write.repository';
import { TypeOrmSeasonWriteRepository } from '../../modules/seasons/infrastructure/persistence/typeorm/repositories/typeorm-season-write.repository';
import { TypeOrmTeamWriteRepository } from '../../modules/teams/infrastructure/persistence/typeorm/repositories/typeorm-team-write.repository';
import { TypeOrmMatchWriteRepository } from '../../modules/matches/infrastructure/persistence/typeorm/repositories/typeorm-match-write.repository';
import { PersistCompetitionUseCase } from '../../modules/competitions/application/use-cases/persist-competition.use-case';
import { PersistSeasonUseCase } from '../../modules/seasons/application/use-cases/persist-season.use-case';
import { PersistTeamUseCase } from '../../modules/teams/application/use-cases/persist-team.use-case';
import { PersistMatchUseCase } from '../../modules/matches/application/use-cases/persist-match.use-case';
import { CompetitionOrmEntity } from '../../modules/competitions/infrastructure/persistence/typeorm/entities/competition.orm-entity';
import { SeasonOrmEntity } from '../../modules/seasons/infrastructure/persistence/typeorm/entities/season.orm-entity';
import { TeamOrmEntity } from '../../modules/teams/infrastructure/persistence/typeorm/entities/team.orm-entity';
import { MatchOrmEntity } from '../../modules/matches/infrastructure/persistence/typeorm/entities/match.orm-entity';
import { TransformedMatch } from '../../modules/external-football/domain/models/transformed-match.model';

describe('Match Persistence Integration Test (Live DB)', () => {
  let compWriteRepo: TypeOrmCompetitionWriteRepository;
  let seasonWriteRepo: TypeOrmSeasonWriteRepository;
  let teamWriteRepo: TypeOrmTeamWriteRepository;
  let matchWriteRepo: TypeOrmMatchWriteRepository;

  let persistCompUseCase: PersistCompetitionUseCase;
  let persistSeasonUseCase: PersistSeasonUseCase;
  let persistTeamUseCase: PersistTeamUseCase;
  let persistMatchUseCase: PersistMatchUseCase;

  let testComp: CompetitionOrmEntity;
  let testSeason: SeasonOrmEntity;
  let testHomeTeam: TeamOrmEntity;
  let testAwayTeam: TeamOrmEntity;

  const testProvider = 'FOOTBALL_DATA_ORG';
  const testCompExtId = `match-test-comp-${Date.now()}`;
  const testSeasonExtId = `match-test-season-${Date.now()}`;
  const testHomeTeamExtId = `match-test-home-${Date.now()}`;
  const testAwayTeamExtId = `match-test-away-${Date.now()}`;
  const testMatchExtId = `match-test-m-${Date.now()}`;

  beforeAll(async () => {
    if (!AppDataSource.isInitialized) {
      await AppDataSource.initialize();
    }

    const compOrmRepo = AppDataSource.getRepository(CompetitionOrmEntity);
    const seasonOrmRepo = AppDataSource.getRepository(SeasonOrmEntity);
    const teamOrmRepo = AppDataSource.getRepository(TeamOrmEntity);
    const matchOrmRepo = AppDataSource.getRepository(MatchOrmEntity);

    compWriteRepo = new TypeOrmCompetitionWriteRepository(compOrmRepo);
    seasonWriteRepo = new TypeOrmSeasonWriteRepository(seasonOrmRepo);
    teamWriteRepo = new TypeOrmTeamWriteRepository(teamOrmRepo);
    matchWriteRepo = new TypeOrmMatchWriteRepository(matchOrmRepo);

    persistCompUseCase = new PersistCompetitionUseCase(compWriteRepo);
    persistSeasonUseCase = new PersistSeasonUseCase(seasonWriteRepo);
    persistTeamUseCase = new PersistTeamUseCase(teamWriteRepo);
    persistMatchUseCase = new PersistMatchUseCase(
      matchWriteRepo,
      compWriteRepo,
      seasonWriteRepo,
      teamWriteRepo,
    );

    // Create prerequisite entities
    testComp = await persistCompUseCase.execute({
      externalProvider: testProvider,
      externalId: testCompExtId,
      name: 'Match Test League',
      code: 'MTL',
      type: 'LEAGUE',
      emblemUrl: null,
      plan: 'TIER_ONE',
      countryName: 'England',
      countryCode: 'ENG',
      countryFlagUrl: null,
      dataUpdatedAt: null,
    });

    testSeason = await persistSeasonUseCase.execute(
      {
        externalProvider: testProvider,
        externalId: testSeasonExtId,
        name: 'Match Test Season 2026/27',
        code: 'MTL_2026',
        startDate: '2026-08-01',
        endDate: '2027-05-30',
        currentMatchday: 1,
        isCurrent: true,
        dataUpdatedAt: null,
      },
      testComp.id,
    );

    testHomeTeam = await persistTeamUseCase.execute({
      externalProvider: testProvider,
      externalId: testHomeTeamExtId,
      name: 'Match Test Home FC',
      normalizedName: 'match test home fc',
      shortName: 'Home FC',
      tla: 'MTH',
      crestUrl: null,
      address: null,
      website: null,
      founded: 1900,
      clubColors: 'Red',
      venue: 'Home Stadium',
      status: 'ACTIVE',
      dataUpdatedAt: null,
    });

    testAwayTeam = await persistTeamUseCase.execute({
      externalProvider: testProvider,
      externalId: testAwayTeamExtId,
      name: 'Match Test Away FC',
      normalizedName: 'match test away fc',
      shortName: 'Away FC',
      tla: 'MTA',
      crestUrl: null,
      address: null,
      website: null,
      founded: 1905,
      clubColors: 'Blue',
      venue: 'Away Stadium',
      status: 'ACTIVE',
      dataUpdatedAt: null,
    });
  });

  afterAll(async () => {
    if (AppDataSource.isInitialized) {
      await AppDataSource.getRepository(MatchOrmEntity).delete({
        externalProvider: testProvider,
        externalId: testMatchExtId,
      });
      await AppDataSource.getRepository(SeasonOrmEntity).delete({
        id: testSeason?.id,
      });
      await AppDataSource.getRepository(CompetitionOrmEntity).delete({
        id: testComp?.id,
      });
      await AppDataSource.getRepository(TeamOrmEntity).delete({
        id: testHomeTeam?.id,
      });
      await AppDataSource.getRepository(TeamOrmEntity).delete({
        id: testAwayTeam?.id,
      });

      await AppDataSource.destroy();
    }
  });

  it('TC-26 & TC-33: should persist new match resolving 4 internal UUIDs', async () => {
    const inputMatch: TransformedMatch = {
      externalProvider: testProvider,
      externalId: testMatchExtId,
      matchDate: new Date('2026-08-22T19:00:00Z'),
      status: 'SCHEDULED',
      matchday: 1,
      homeScore: null,
      awayScore: null,
      dataUpdatedAt: new Date('2026-08-22T12:00:00Z'),
      competitionExternalId: testCompExtId,
      seasonExternalId: testSeasonExtId,
      homeTeamExternalId: testHomeTeamExtId,
      awayTeamExternalId: testAwayTeamExtId,
    };

    const persisted = await persistMatchUseCase.execute(inputMatch);

    expect(persisted.id).toBeDefined();
    expect(persisted.competitionId).toBe(testComp.id);
    expect(persisted.seasonId).toBe(testSeason.id);
    expect(persisted.homeTeamId).toBe(testHomeTeam.id);
    expect(persisted.awayTeamId).toBe(testAwayTeam.id);

    const dbRow = await AppDataSource.query(
      `SELECT * FROM "matches" WHERE "id" = $1`,
      [persisted.id],
    );
    expect(dbRow).toHaveLength(1);
    expect(dbRow[0].external_id).toBe(testMatchExtId);
    expect(dbRow[0].competition_id).toBe(testComp.id);
    expect(dbRow[0].home_score).toBeNull();
    expect(dbRow[0].away_score).toBeNull();
  });

  it('TC-27 & TC-34: should maintain idempotency and preserve single row on repeated sync', async () => {
    const inputMatch: TransformedMatch = {
      externalProvider: testProvider,
      externalId: testMatchExtId,
      matchDate: new Date('2026-08-22T19:00:00Z'),
      status: 'SCHEDULED',
      matchday: 1,
      homeScore: null,
      awayScore: null,
      dataUpdatedAt: new Date('2026-08-22T12:00:00Z'),
      competitionExternalId: testCompExtId,
      seasonExternalId: testSeasonExtId,
      homeTeamExternalId: testHomeTeamExtId,
      awayTeamExternalId: testAwayTeamExtId,
    };

    await persistMatchUseCase.execute(inputMatch);
    await persistMatchUseCase.execute(inputMatch);

    const countRows = await AppDataSource.query(
      `SELECT COUNT(*)::int as count FROM "matches" WHERE "external_provider" = $1 AND "external_id" = $2`,
      [testProvider, testMatchExtId],
    );
    expect(countRows[0].count).toBe(1);
  });

  it('TC-28: should handle live match state progression (SCHEDULED -> IN_PLAY -> FINISHED) in place', async () => {
    // Step 1: IN_PLAY with 1 - 0
    const inPlayMatch: TransformedMatch = {
      externalProvider: testProvider,
      externalId: testMatchExtId,
      matchDate: new Date('2026-08-22T19:00:00Z'),
      status: 'IN_PLAY',
      homeScore: 1,
      awayScore: 0,
      dataUpdatedAt: new Date('2026-08-22T19:30:00Z'),
      competitionExternalId: testCompExtId,
      seasonExternalId: testSeasonExtId,
      homeTeamExternalId: testHomeTeamExtId,
      awayTeamExternalId: testAwayTeamExtId,
    };
    await persistMatchUseCase.execute(inPlayMatch);

    let row = await AppDataSource.query(
      `SELECT * FROM "matches" WHERE "external_provider" = $1 AND "external_id" = $2`,
      [testProvider, testMatchExtId],
    );
    expect(row[0].status).toBe('IN_PLAY');
    expect(row[0].home_score).toBe(1);
    expect(row[0].away_score).toBe(0);

    // Step 2: FINISHED with 2 - 1
    const finishedMatch: TransformedMatch = {
      externalProvider: testProvider,
      externalId: testMatchExtId,
      matchDate: new Date('2026-08-22T19:00:00Z'),
      status: 'FINISHED',
      homeScore: 2,
      awayScore: 1,
      dataUpdatedAt: new Date('2026-08-22T21:00:00Z'),
      competitionExternalId: testCompExtId,
      seasonExternalId: testSeasonExtId,
      homeTeamExternalId: testHomeTeamExtId,
      awayTeamExternalId: testAwayTeamExtId,
    };
    await persistMatchUseCase.execute(finishedMatch);

    row = await AppDataSource.query(
      `SELECT * FROM "matches" WHERE "external_provider" = $1 AND "external_id" = $2`,
      [testProvider, testMatchExtId],
    );
    expect(row).toHaveLength(1);
    expect(row[0].status).toBe('FINISHED');
    expect(row[0].home_score).toBe(2);
    expect(row[0].away_score).toBe(1);
  });

  it('TC-29 to TC-32: should reject match when parent entities are not found in DB', async () => {
    const invalidCompMatch: TransformedMatch = {
      externalProvider: testProvider,
      externalId: 'non-existent-match',
      matchDate: new Date(),
      status: 'SCHEDULED',
      homeScore: null,
      awayScore: null,
      dataUpdatedAt: null,
      competitionExternalId: 'non-existent-comp',
      seasonExternalId: testSeasonExtId,
      homeTeamExternalId: testHomeTeamExtId,
      awayTeamExternalId: testAwayTeamExtId,
    };

    await expect(persistMatchUseCase.execute(invalidCompMatch)).rejects.toThrow();
  });

  it('TC-35 & TC-36: should preserve created_at and update updated_at on state change', async () => {
    const rowBefore = (
      await AppDataSource.query(
        `SELECT * FROM "matches" WHERE "external_provider" = $1 AND "external_id" = $2`,
        [testProvider, testMatchExtId],
      )
    )[0];

    const matchUpdate: TransformedMatch = {
      externalProvider: testProvider,
      externalId: testMatchExtId,
      matchDate: new Date('2026-08-22T19:00:00Z'),
      status: 'FINISHED',
      homeScore: 3,
      awayScore: 1,
      dataUpdatedAt: new Date('2026-08-22T22:00:00Z'),
      competitionExternalId: testCompExtId,
      seasonExternalId: testSeasonExtId,
      homeTeamExternalId: testHomeTeamExtId,
      awayTeamExternalId: testAwayTeamExtId,
    };

    await persistMatchUseCase.execute(matchUpdate);

    const rowAfter = (
      await AppDataSource.query(
        `SELECT * FROM "matches" WHERE "external_provider" = $1 AND "external_id" = $2`,
        [testProvider, testMatchExtId],
      )
    )[0];

    expect(new Date(rowAfter.created_at).getTime()).toBe(
      new Date(rowBefore.created_at).getTime(),
    );
    expect(rowAfter.home_score).toBe(3);
  });
});
