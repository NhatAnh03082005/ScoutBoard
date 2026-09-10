import { NotFoundException, BadRequestException } from '@nestjs/common';
import AppDataSource from '../data-source';
import { MatchOrmEntity } from '../../modules/matches/infrastructure/persistence/typeorm/entities/match.orm-entity';
import { PlayerOrmEntity } from '../../modules/players/infrastructure/persistence/typeorm/entities/player.orm-entity';
import { TeamOrmEntity } from '../../modules/teams/infrastructure/persistence/typeorm/entities/team.orm-entity';
import { CompetitionOrmEntity } from '../../modules/competitions/infrastructure/persistence/typeorm/entities/competition.orm-entity';
import { SeasonOrmEntity } from '../../modules/seasons/infrastructure/persistence/typeorm/entities/season.orm-entity';
import { PlayerMatchStatisticOrmEntity } from '../../modules/matches/infrastructure/persistence/typeorm/entities/player-match-statistic.orm-entity';
import { TypeOrmPlayerMatchStatisticWriteRepository } from '../../modules/matches/infrastructure/persistence/typeorm/repositories/typeorm-player-match-statistic-write.repository';
import { PersistPlayerMatchStatisticsUseCase } from '../../modules/matches/application/use-cases/persist-player-match-statistics.use-case';

describe('PlayerMatchStatisticsPersistence (Live PostgreSQL Integration)', () => {
  let repository: TypeOrmPlayerMatchStatisticWriteRepository;
  let useCase: PersistPlayerMatchStatisticsUseCase;

  let testComp: CompetitionOrmEntity;
  let testSeason: SeasonOrmEntity;
  let testHomeTeam: TeamOrmEntity;
  let testAwayTeam: TeamOrmEntity;
  let testWrongTeam: TeamOrmEntity;
  let testMatch: MatchOrmEntity;
  let testOutfieldPlayer: PlayerOrmEntity;
  let testGkPlayer: PlayerOrmEntity;

  const testProvider = 'FOOTBALL_DATA_ORG';
  const prefix = `pms-${Date.now()}`;

  beforeAll(async () => {
    if (!AppDataSource.isInitialized) {
      await AppDataSource.initialize();
    }

    const compRepo = AppDataSource.getRepository(CompetitionOrmEntity);
    const seasonRepo = AppDataSource.getRepository(SeasonOrmEntity);
    const teamRepo = AppDataSource.getRepository(TeamOrmEntity);
    const playerRepo = AppDataSource.getRepository(PlayerOrmEntity);
    const matchRepo = AppDataSource.getRepository(MatchOrmEntity);
    const statRepo = AppDataSource.getRepository(PlayerMatchStatisticOrmEntity);

    repository = new TypeOrmPlayerMatchStatisticWriteRepository(statRepo);
    useCase = new PersistPlayerMatchStatisticsUseCase(
      repository,
      matchRepo,
      playerRepo,
    );

    // 1. Create Competition & Season
    testComp = await compRepo.save(
      compRepo.create({
        externalProvider: testProvider,
        externalId: `${prefix}-comp`,
        name: 'PMS League',
        code: 'PMSL',
        type: 'LEAGUE',
      }),
    );

    testSeason = await seasonRepo.save(
      seasonRepo.create({
        competitionId: testComp.id,
        externalProvider: testProvider,
        externalId: `${prefix}-season`,
        name: 'PMS Season 2026',
        code: 'PMS_2026',
        startDate: '2026-08-01',
        endDate: '2027-05-30',
        currentMatchday: 1,
        isCurrent: true,
      }),
    );

    // 2. Create Teams
    testHomeTeam = await teamRepo.save(
      teamRepo.create({
        externalProvider: testProvider,
        externalId: `${prefix}-home`,
        name: 'PMS Home Team',
      }),
    );

    testAwayTeam = await teamRepo.save(
      teamRepo.create({
        externalProvider: testProvider,
        externalId: `${prefix}-away`,
        name: 'PMS Away Team',
      }),
    );

    testWrongTeam = await teamRepo.save(
      teamRepo.create({
        externalProvider: testProvider,
        externalId: `${prefix}-wrong`,
        name: 'PMS Third Team',
      }),
    );

    // 3. Create Players
    testOutfieldPlayer = await playerRepo.save(
      playerRepo.create({
        externalProvider: testProvider,
        externalId: `${prefix}-player-outfield`,
        name: 'Marcus Striker',
        currentTeamId: testHomeTeam.id,
      }),
    );

    testGkPlayer = await playerRepo.save(
      playerRepo.create({
        externalProvider: testProvider,
        externalId: `${prefix}-player-gk`,
        name: 'David Keeper',
        currentTeamId: testAwayTeam.id,
      }),
    );

    // 4. Create Canonical Match
    testMatch = await matchRepo.save(
      matchRepo.create({
        competitionId: testComp.id,
        seasonId: testSeason.id,
        homeTeamId: testHomeTeam.id,
        awayTeamId: testAwayTeam.id,
        externalProvider: testProvider,
        externalId: `${prefix}-match-1`,
        matchDate: new Date('2026-08-22T19:00:00Z'),
        status: 'FINISHED',
      }),
    );
  });

  afterAll(async () => {
    if (AppDataSource.isInitialized) {
      await AppDataSource.getRepository(PlayerMatchStatisticOrmEntity).delete({
        matchId: testMatch?.id,
      });
      await AppDataSource.getRepository(PlayerOrmEntity).delete({
        id: testOutfieldPlayer?.id,
      });
      await AppDataSource.getRepository(PlayerOrmEntity).delete({
        id: testGkPlayer?.id,
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
      await AppDataSource.getRepository(TeamOrmEntity).delete({
        id: testWrongTeam?.id,
      });

      await AppDataSource.destroy();
    }
  });

  it('TC-01: should insert outfield player stats with strict NULL GK fields', async () => {
    const stat = await useCase.execute({
      matchId: testMatch.id,
      playerId: testOutfieldPlayer.id,
      teamId: testHomeTeam.id,
      minutesPlayed: 90,
      isStarter: true,
      rating: 8.2,
      goals: 2,
      assists: 1,
      shots: 5,
      passesAttempted: 40,
      passesCompleted: 35,
      tackles: 2,
      interceptions: 0,
      saves: null,
      goalsConceded: null,
      cleanSheets: null,
      penaltiesSaved: null,
      statistics: { duelsWon: 6 },
    });

    expect(stat.id).toBeDefined();
    expect(stat.goals).toBe(2);
    expect(stat.saves).toBeNull();
    expect(stat.goalsConceded).toBeNull();
    expect(stat.statistics?.duelsWon).toBe(6);

    // Verify row in PostgreSQL
    const rows = await AppDataSource.query(
      `SELECT * FROM "player_match_statistics" WHERE "match_id" = $1 AND "player_id" = $2`,
      [testMatch.id, testOutfieldPlayer.id],
    );

    expect(rows).toHaveLength(1);
    expect(rows[0].goals).toBe(2);
    expect(rows[0].saves).toBeNull();
  });

  it('TC-02: should insert GK player stats with saves and clean sheets', async () => {
    const stat = await useCase.execute({
      matchId: testMatch.id,
      playerId: testGkPlayer.id,
      teamId: testAwayTeam.id,
      minutesPlayed: 90,
      isStarter: true,
      rating: 7.5,
      saves: 4,
      goalsConceded: 2,
      cleanSheets: 0,
      penaltiesSaved: 1,
      passesAttempted: 20,
      passesCompleted: 15,
    });

    expect(stat.id).toBeDefined();
    expect(stat.saves).toBe(4);
    expect(stat.goalsConceded).toBe(2);
    expect(stat.cleanSheets).toBe(0);
    expect(stat.penaltiesSaved).toBe(1);
  });

  it('TC-03: should idempotently update existing statistics via upsert on (match_id, player_id)', async () => {
    const updated = await useCase.execute({
      matchId: testMatch.id,
      playerId: testOutfieldPlayer.id,
      teamId: testHomeTeam.id,
      goals: 3, // Hat trick update
      rating: 9.0,
    });

    expect(updated.goals).toBe(3);
    expect(Number(updated.rating)).toBe(9.0);

    const rows = await AppDataSource.query(
      `SELECT COUNT(*)::int as count FROM "player_match_statistics" WHERE "match_id" = $1 AND "player_id" = $2`,
      [testMatch.id, testOutfieldPlayer.id],
    );
    expect(rows[0].count).toBe(1);
  });

  it('TC-04: should reject passes_completed > passes_attempted invariant violation', async () => {
    await expect(
      useCase.execute({
        matchId: testMatch.id,
        playerId: testOutfieldPlayer.id,
        teamId: testHomeTeam.id,
        passesAttempted: 10,
        passesCompleted: 15, // Invalid!
      }),
    ).rejects.toThrow(BadRequestException);
  });

  it('TC-05: should reject non-existent match ID', async () => {
    await expect(
      useCase.execute({
        matchId: '00000000-0000-0000-0000-000000000000',
        playerId: testOutfieldPlayer.id,
        teamId: testHomeTeam.id,
      }),
    ).rejects.toThrow(NotFoundException);
  });

  it('TC-06: should reject non-existent player ID', async () => {
    await expect(
      useCase.execute({
        matchId: testMatch.id,
        playerId: '00000000-0000-0000-0000-000000000000',
        teamId: testHomeTeam.id,
      }),
    ).rejects.toThrow(NotFoundException);
  });

  it('TC-07: should reject team that does not belong to this match', async () => {
    await expect(
      useCase.execute({
        matchId: testMatch.id,
        playerId: testOutfieldPlayer.id,
        teamId: testWrongTeam.id, // Third party team!
      }),
    ).rejects.toThrow(BadRequestException);
  });

  it('TC-08: should handle batch insertion with mixed outfield and GK players', async () => {
    const batchResult = await useCase.executeBatch(testMatch.id, [
      {
        matchId: testMatch.id,
        playerId: testOutfieldPlayer.id,
        teamId: testHomeTeam.id,
        goals: 3,
      },
      {
        matchId: testMatch.id,
        playerId: testGkPlayer.id,
        teamId: testAwayTeam.id,
        saves: 4,
      },
    ]);

    expect(batchResult.total).toBe(2);
    expect(batchResult.persisted).toBe(2);
    expect(batchResult.skipped).toBe(0);
  });
});
