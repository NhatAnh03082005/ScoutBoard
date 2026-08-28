import { ConflictException } from '@nestjs/common';
import AppDataSource from '../data-source';
import { MatchOrmEntity } from '../../modules/matches/infrastructure/persistence/typeorm/entities/match.orm-entity';
import { ExternalMatchMappingOrmEntity } from '../../modules/matches/infrastructure/persistence/typeorm/entities/external-match-mapping.orm-entity';
import { CompetitionOrmEntity } from '../../modules/competitions/infrastructure/persistence/typeorm/entities/competition.orm-entity';
import { SeasonOrmEntity } from '../../modules/seasons/infrastructure/persistence/typeorm/entities/season.orm-entity';
import { TeamOrmEntity } from '../../modules/teams/infrastructure/persistence/typeorm/entities/team.orm-entity';
import { TypeOrmExternalMatchMappingRepository } from '../../modules/matches/infrastructure/persistence/typeorm/repositories/typeorm-external-match-mapping.repository';

describe('ExternalMatchMappingPersistence (Live PostgreSQL Integration)', () => {
  let repository: TypeOrmExternalMatchMappingRepository;

  let testComp: CompetitionOrmEntity;
  let testSeason: SeasonOrmEntity;
  let testHomeTeam: TeamOrmEntity;
  let testAwayTeam: TeamOrmEntity;
  let testMatch1: MatchOrmEntity;
  let testMatch2: MatchOrmEntity;

  const testProviderCanonical = 'FOOTBALL_DATA_ORG';
  const testCompExtId = `map-repo-comp-${Date.now()}`;
  const testSeasonExtId = `map-repo-season-${Date.now()}`;
  const testHomeExtId = `map-repo-home-${Date.now()}`;
  const testAwayExtId = `map-repo-away-${Date.now()}`;
  const testMatchExtId1 = `map-repo-m1-${Date.now()}`;
  const testMatchExtId2 = `map-repo-m2-${Date.now()}`;
  const testFixtureId = `sm-fix-${Date.now()}`;

  beforeAll(async () => {
    if (!AppDataSource.isInitialized) {
      await AppDataSource.initialize();
    }

    const compRepo = AppDataSource.getRepository(CompetitionOrmEntity);
    const seasonRepo = AppDataSource.getRepository(SeasonOrmEntity);
    const teamRepo = AppDataSource.getRepository(TeamOrmEntity);
    const matchRepo = AppDataSource.getRepository(MatchOrmEntity);
    const mappingRepo = AppDataSource.getRepository(ExternalMatchMappingOrmEntity);

    repository = new TypeOrmExternalMatchMappingRepository(mappingRepo);

    testComp = await compRepo.save(
      compRepo.create({
        externalProvider: testProviderCanonical,
        externalId: testCompExtId,
        name: 'Mapping Repo League',
        type: 'LEAGUE',
      }),
    );

    testSeason = await seasonRepo.save(
      seasonRepo.create({
        competitionId: testComp.id,
        externalProvider: testProviderCanonical,
        externalId: testSeasonExtId,
        name: 'Mapping Repo Season 2026/27',
        seasonCode: 'MRL_2026',
        startDate: '2026-08-01',
        endDate: '2027-05-30',
        isCurrent: true,
      }),
    );

    testHomeTeam = await teamRepo.save(
      teamRepo.create({
        externalProvider: testProviderCanonical,
        externalId: testHomeExtId,
        name: 'Map Home FC',
      }),
    );

    testAwayTeam = await teamRepo.save(
      teamRepo.create({
        externalProvider: testProviderCanonical,
        externalId: testAwayExtId,
        name: 'Map Away FC',
      }),
    );

    testMatch1 = await matchRepo.save(
      matchRepo.create({
        competitionId: testComp.id,
        seasonId: testSeason.id,
        homeTeamId: testHomeTeam.id,
        awayTeamId: testAwayTeam.id,
        externalProvider: testProviderCanonical,
        externalId: testMatchExtId1,
        matchDate: new Date('2026-08-22T19:00:00Z'),
        status: 'FINISHED',
      }),
    );

    testMatch2 = await matchRepo.save(
      matchRepo.create({
        competitionId: testComp.id,
        seasonId: testSeason.id,
        homeTeamId: testHomeTeam.id,
        awayTeamId: testAwayTeam.id,
        externalProvider: testProviderCanonical,
        externalId: testMatchExtId2,
        matchDate: new Date('2026-08-29T19:00:00Z'),
        status: 'FINISHED',
      }),
    );
  });

  afterAll(async () => {
    if (AppDataSource.isInitialized) {
      await AppDataSource.getRepository(ExternalMatchMappingOrmEntity).delete({
        externalProvider: 'SPORTMONKS',
        externalId: testFixtureId,
      });
      await AppDataSource.getRepository(MatchOrmEntity).delete({
        id: testMatch1?.id,
      });
      await AppDataSource.getRepository(MatchOrmEntity).delete({
        id: testMatch2?.id,
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

  it('TC-01: should insert and persist confirmed mapping in PostgreSQL', async () => {
    const created = await repository.create({
      matchId: testMatch1.id,
      externalProvider: 'SPORTMONKS',
      externalId: testFixtureId,
      confidence: 1.0,
      status: 'CONFIRMED',
      metadata: { source: 'unit-test' },
    });

    expect(created.id).toBeDefined();
    expect(created.matchId).toBe(testMatch1.id);
    expect(created.externalProvider).toBe('SPORTMONKS');
    expect(created.externalId).toBe(testFixtureId);
  });

  it('TC-02: should find mapping by provider + externalId and canonicalMatch + provider', async () => {
    const byProvider = await repository.findByProviderAndExternalId('SPORTMONKS', testFixtureId);
    expect(byProvider).not.toBeNull();
    expect(byProvider?.matchId).toBe(testMatch1.id);

    const byMatch = await repository.findByCanonicalMatchAndProvider(testMatch1.id, 'SPORTMONKS');
    expect(byMatch).not.toBeNull();
    expect(byMatch?.externalId).toBe(testFixtureId);
  });

  it('TC-03: should idempotently update existing mapping via upsert', async () => {
    const updated = await repository.upsert({
      matchId: testMatch1.id,
      externalProvider: 'SPORTMONKS',
      externalId: testFixtureId,
      confidence: 0.95,
      metadata: { source: 'unit-test-updated' },
    });

    expect(updated.confidence).toBe(0.95);
    expect(updated.metadata?.source).toBe('unit-test-updated');

    const byProvider = await repository.findByProviderAndExternalId('SPORTMONKS', testFixtureId);
    expect(Number(byProvider?.confidence)).toBe(0.95);
  });

  it('TC-04: should reject conflicting mapping when fixture is reassigned to another Match', async () => {
    await expect(
      repository.upsert({
        matchId: testMatch2.id, // Different match!
        externalProvider: 'SPORTMONKS',
        externalId: testFixtureId, // Same fixture!
      }),
    ).rejects.toThrow(ConflictException);
  });

  it('TC-05: should enforce database uniqueness constraint on (external_provider, external_id)', async () => {
    const rawRepo = AppDataSource.getRepository(ExternalMatchMappingOrmEntity);
    const duplicateEntity = rawRepo.create({
      matchId: testMatch2.id,
      externalProvider: 'SPORTMONKS',
      externalId: testFixtureId, // Duplicate!
      confidence: 1.0,
      status: 'CONFIRMED',
    });

    await expect(rawRepo.insert(duplicateEntity)).rejects.toThrow();
  });

  it('TC-06: should cascade delete mapping when parent match is deleted', async () => {
    const tempMatchExtId = `temp-m-${Date.now()}`;
    const tempFixtureId = `temp-fix-${Date.now()}`;

    const matchRepo = AppDataSource.getRepository(MatchOrmEntity);
    const tempMatch = await matchRepo.save(
      matchRepo.create({
        competitionId: testComp.id,
        seasonId: testSeason.id,
        homeTeamId: testHomeTeam.id,
        awayTeamId: testAwayTeam.id,
        externalProvider: testProviderCanonical,
        externalId: tempMatchExtId,
        matchDate: new Date('2026-08-30T19:00:00Z'),
      }),
    );

    await repository.create({
      matchId: tempMatch.id,
      externalProvider: 'SPORTMONKS',
      externalId: tempFixtureId,
    });

    // Verify mapping exists
    const beforeDelete = await repository.findByProviderAndExternalId('SPORTMONKS', tempFixtureId);
    expect(beforeDelete).not.toBeNull();

    // Delete parent match
    await matchRepo.delete({ id: tempMatch.id });

    // Verify mapping was cascade deleted
    const afterDelete = await repository.findByProviderAndExternalId('SPORTMONKS', tempFixtureId);
    expect(afterDelete).toBeNull();
  });
});
