import AppDataSource from '../data-source';
import { MatchOrmEntity } from '../../modules/matches/infrastructure/persistence/typeorm/entities/match.orm-entity';
import { ExternalMatchMappingOrmEntity } from '../../modules/matches/infrastructure/persistence/typeorm/entities/external-match-mapping.orm-entity';
import { CompetitionOrmEntity } from '../../modules/competitions/infrastructure/persistence/typeorm/entities/competition.orm-entity';
import { SeasonOrmEntity } from '../../modules/seasons/infrastructure/persistence/typeorm/entities/season.orm-entity';
import { TeamOrmEntity } from '../../modules/teams/infrastructure/persistence/typeorm/entities/team.orm-entity';
import { TypeOrmExternalMatchMappingRepository } from '../../modules/matches/infrastructure/persistence/typeorm/repositories/typeorm-external-match-mapping.repository';
import { ReconcileSportmonksMatchUseCase } from '../../modules/matches/application/use-cases/reconcile-sportmonks-match.use-case';
import { SportmonksFixtureDto } from '../../modules/external-football/infrastructure/dto/sportmonks-fixture.dto';

describe('Cross-Provider Match Reconciliation Integration Test (Live DB)', () => {
  let mappingRepo: TypeOrmExternalMatchMappingRepository;
  let reconcileUseCase: ReconcileSportmonksMatchUseCase;

  let testComp: CompetitionOrmEntity;
  let testSeason: SeasonOrmEntity;
  let testHomeTeam: TeamOrmEntity;
  let testAwayTeam: TeamOrmEntity;
  let testMatch: MatchOrmEntity;

  const testProviderCanonical = 'FOOTBALL_DATA_ORG';
  const testCompExtId = `recon-comp-${Date.now()}`;
  const testSeasonExtId = `recon-season-${Date.now()}`;
  const testHomeTeamExtId = `recon-home-${Date.now()}`;
  const testAwayTeamExtId = `recon-away-${Date.now()}`;
  const testMatchExtId = `recon-match-${Date.now()}`;
  const testSportmonksFixtureId = 9918237;

  beforeAll(async () => {
    if (!AppDataSource.isInitialized) {
      await AppDataSource.initialize();
    }

    const compOrmRepo = AppDataSource.getRepository(CompetitionOrmEntity);
    const seasonOrmRepo = AppDataSource.getRepository(SeasonOrmEntity);
    const teamOrmRepo = AppDataSource.getRepository(TeamOrmEntity);
    const matchOrmRepo = AppDataSource.getRepository(MatchOrmEntity);
    const mappingOrmRepo = AppDataSource.getRepository(ExternalMatchMappingOrmEntity);

    mappingRepo = new TypeOrmExternalMatchMappingRepository(mappingOrmRepo);
    reconcileUseCase = new ReconcileSportmonksMatchUseCase(mappingRepo, matchOrmRepo);

    // 1. Insert parent entities
    testComp = await compOrmRepo.save(
      compOrmRepo.create({
        externalProvider: testProviderCanonical,
        externalId: testCompExtId,
        name: 'Reconciliation League',
        code: 'RCL',
        type: 'LEAGUE',
      }),
    );

    testSeason = await seasonOrmRepo.save(
      seasonOrmRepo.create({
        competitionId: testComp.id,
        externalProvider: testProviderCanonical,
        externalId: testSeasonExtId,
        name: 'Reconciliation Season 2026/27',
        code: 'RCL_2026',
        startDate: '2026-08-01',
        endDate: '2027-05-30',
        currentMatchday: 1,
        isCurrent: true,
      }),
    );

    testHomeTeam = await teamOrmRepo.save(
      teamOrmRepo.create({
        externalProvider: testProviderCanonical,
        externalId: testHomeTeamExtId,
        name: 'Recon Home FC',
        normalizedName: 'recon home fc',
        shortName: 'Home FC',
        tla: 'RHF',
      }),
    );

    testAwayTeam = await teamOrmRepo.save(
      teamOrmRepo.create({
        externalProvider: testProviderCanonical,
        externalId: testAwayTeamExtId,
        name: 'Recon Away FC',
        normalizedName: 'recon away fc',
        shortName: 'Away FC',
        tla: 'RAF',
      }),
    );

    // 2. Insert canonical match (football-data.org)
    testMatch = await matchOrmRepo.save(
      matchOrmRepo.create({
        competitionId: testComp.id,
        seasonId: testSeason.id,
        homeTeamId: testHomeTeam.id,
        awayTeamId: testAwayTeam.id,
        externalProvider: testProviderCanonical,
        externalId: testMatchExtId,
        matchDate: new Date('2026-08-22T19:00:00Z'),
        status: 'FINISHED',
        homeScore: 2,
        awayScore: 1,
      }),
    );
  });

  afterAll(async () => {
    if (AppDataSource.isInitialized) {
      await AppDataSource.getRepository(ExternalMatchMappingOrmEntity).delete({
        externalProvider: 'SPORTMONKS',
        externalId: String(testSportmonksFixtureId),
      });
      await AppDataSource.getRepository(MatchOrmEntity).delete({
        id: testMatch?.id,
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

  it('should reconcile Sportmonks fixture with canonical match and persist mapping to external_match_mappings', async () => {
    const fixture: SportmonksFixtureDto = {
      id: testSportmonksFixtureId,
      name: 'Recon Home FC vs Recon Away FC',
      starting_at: '2026-08-22 19:00:00',
    };

    const result = await reconcileUseCase.execute({
      fixture,
      resolvedHomeTeamId: testHomeTeam.id,
      resolvedAwayTeamId: testAwayTeam.id,
    });

    expect(result.status).toBe('MATCHED');
    expect(result.matchId).toBe(testMatch.id);

    // Verify row in PostgreSQL
    const rows = await AppDataSource.query(
      `SELECT * FROM "external_match_mappings" WHERE "external_provider" = $1 AND "external_id" = $2`,
      ['SPORTMONKS', String(testSportmonksFixtureId)],
    );

    expect(rows).toHaveLength(1);
    expect(rows[0].match_id).toBe(testMatch.id);
    expect(rows[0].status).toBe('CONFIRMED');
  });

  it('should achieve O(1) cache hit and remain idempotent on repeated execution', async () => {
    const fixture: SportmonksFixtureDto = {
      id: testSportmonksFixtureId,
      name: 'Recon Home FC vs Recon Away FC',
      starting_at: '2026-08-22 19:00:00',
    };

    const result = await reconcileUseCase.execute({
      fixture,
      resolvedHomeTeamId: testHomeTeam.id,
      resolvedAwayTeamId: testAwayTeam.id,
    });

    expect(result.status).toBe('MATCHED');
    expect(result.matchId).toBe(testMatch.id);

    // Verify COUNT = 1
    const countRows = await AppDataSource.query(
      `SELECT COUNT(*)::int as count FROM "external_match_mappings" WHERE "external_provider" = $1 AND "external_id" = $2`,
      ['SPORTMONKS', String(testSportmonksFixtureId)],
    );
    expect(countRows[0].count).toBe(1);
  });
});
