import { DataSource } from 'typeorm';
import { CompetitionOrmEntity } from '../../../modules/competitions/infrastructure/persistence/typeorm/entities/competition.orm-entity';
import { SeasonOrmEntity } from '../../../modules/seasons/infrastructure/persistence/typeorm/entities/season.orm-entity';
import { SeasonTeamOrmEntity } from '../../../modules/seasons/infrastructure/persistence/typeorm/entities/season-team.orm-entity';
import { TeamOrmEntity } from '../../../modules/teams/infrastructure/persistence/typeorm/entities/team.orm-entity';
import { PlayerOrmEntity } from '../../../modules/players/infrastructure/persistence/typeorm/entities/player.orm-entity';
import { PlayerPositionOrmEntity } from '../../../modules/players/infrastructure/persistence/typeorm/entities/player-position.orm-entity';
import { PlayerTeamHistoryOrmEntity } from '../../../modules/players/infrastructure/persistence/typeorm/entities/player-team-history.orm-entity';
import { PlayerSeasonStatisticOrmEntity } from '../../../modules/players/infrastructure/persistence/typeorm/entities/player-season-statistic.orm-entity';
import { MatchOrmEntity } from '../../../modules/matches/infrastructure/persistence/typeorm/entities/match.orm-entity';
import { PlayerMatchStatisticOrmEntity } from '../../../modules/matches/infrastructure/persistence/typeorm/entities/player-match-statistic.orm-entity';

import { COMPETITIONS_DATA } from './fixtures/competitions.data';
import {
  TEAMS_DATA,
  CL_TEAMS_2024,
  CL_TEAMS_2025,
} from './fixtures/teams.data';
import { generateAllPlayersData } from './fixtures/players-generator';

export async function seedFootballZone2(dataSource: DataSource): Promise<void> {
  const provider = 'API_FOOTBALL';

  const compRepo = dataSource.getRepository(CompetitionOrmEntity);
  const seasonRepo = dataSource.getRepository(SeasonOrmEntity);
  const seasonTeamRepo = dataSource.getRepository(SeasonTeamOrmEntity);
  const teamRepo = dataSource.getRepository(TeamOrmEntity);
  const playerRepo = dataSource.getRepository(PlayerOrmEntity);
  const posRepo = dataSource.getRepository(PlayerPositionOrmEntity);
  const historyRepo = dataSource.getRepository(PlayerTeamHistoryOrmEntity);
  const statsRepo = dataSource.getRepository(PlayerSeasonStatisticOrmEntity);
  const matchRepo = dataSource.getRepository(MatchOrmEntity);
  const matchStatsRepo = dataSource.getRepository(
    PlayerMatchStatisticOrmEntity,
  );

  console.log('⚽ Starting Football Seeding (Zone 2)...');

  // Purge any old duplicate records from legacy providers (e.g. 'FOOTBALL_DATA')
  console.log('🧹 Purging legacy duplicated provider data (FOOTBALL_DATA)...');
  await dataSource.query(`
    DELETE FROM "player_match_statistics" WHERE "player_id" IN (SELECT "id" FROM "players" WHERE "external_provider" != 'API_FOOTBALL');
    DELETE FROM "player_season_statistics" WHERE "player_id" IN (SELECT "id" FROM "players" WHERE "external_provider" != 'API_FOOTBALL');
    DELETE FROM "player_team_history" WHERE "player_id" IN (SELECT "id" FROM "players" WHERE "external_provider" != 'API_FOOTBALL');
    DELETE FROM "player_positions" WHERE "player_id" IN (SELECT "id" FROM "players" WHERE "external_provider" != 'API_FOOTBALL');
    DELETE FROM "players" WHERE "external_provider" != 'API_FOOTBALL';
    DELETE FROM "season_teams" WHERE "team_id" IN (SELECT "id" FROM "teams" WHERE "external_provider" != 'API_FOOTBALL');
    DELETE FROM "matches" WHERE "external_provider" != 'API_FOOTBALL';
    DELETE FROM "teams" WHERE "external_provider" != 'API_FOOTBALL';
    DELETE FROM "seasons" WHERE "external_provider" != 'API_FOOTBALL';
    DELETE FROM "competitions" WHERE "external_provider" != 'API_FOOTBALL';
  `);

  // Maps for in-memory lookups during seeding
  const compMap = new Map<string, CompetitionOrmEntity>(); // extId -> Competition
  const seasonMap = new Map<string, SeasonOrmEntity>(); // extId -> Season
  const teamMap = new Map<string, TeamOrmEntity>(); // extId -> Team
  const seasonTeamSet = new Set<string>(); // `${seasonId}:${teamId}`

  // ==========================================
  // STEP 3: COMPETITIONS (6 Total)
  // ==========================================
  for (const cData of COMPETITIONS_DATA) {
    let comp = await compRepo.findOne({
      where: { externalProvider: provider, externalId: cData.extId },
    });
    if (!comp) {
      comp = compRepo.create({
        externalProvider: provider,
        externalId: cData.extId,
        name: cData.name,
        country: cData.country,
        type: cData.type,
        logoUrl: cData.logo,
      });
    } else {
      comp.name = cData.name;
      comp.country = cData.country;
      comp.type = cData.type;
      comp.logoUrl = cData.logo;
    }
    comp = await compRepo.save(comp);
    compMap.set(cData.extId, comp);

    // ==========================================
    // STEP 4: SEASONS (12 Total: 2 per Competition)
    // ==========================================
    for (const sData of cData.seasons) {
      let season = await seasonRepo.findOne({
        where: {
          competitionId: comp.id,
          externalProvider: provider,
          externalId: sData.extId,
        },
      });
      if (!season) {
        season = seasonRepo.create({
          competitionId: comp.id,
          externalProvider: provider,
          externalId: sData.extId,
          seasonCode: sData.seasonCode,
          name: sData.name,
          startDate: sData.startDate,
          endDate: sData.endDate,
          isCurrent: sData.isCurrent,
        });
      } else {
        season.seasonCode = sData.seasonCode;
        season.name = sData.name;
        season.startDate = sData.startDate;
        season.endDate = sData.endDate;
        season.isCurrent = sData.isCurrent;
      }
      season = await seasonRepo.save(season);
      seasonMap.set(sData.extId, season);
    }
  }

  // ==========================================
  // STEP 5: TEAMS (14 Total)
  // ==========================================
  for (const tData of TEAMS_DATA) {
    let team = await teamRepo.findOne({
      where: { externalProvider: provider, externalId: tData.extId },
    });
    if (!team) {
      team = teamRepo.create({
        externalProvider: provider,
        externalId: tData.extId,
        name: tData.name,
        shortName: tData.shortName,
        country: tData.country,
        logoUrl: tData.logo,
      });
    } else {
      team.name = tData.name;
      team.shortName = tData.shortName;
      team.country = tData.country;
      team.logoUrl = tData.logo;
    }
    team = await teamRepo.save(team);
    teamMap.set(tData.extId, team);
  }

  // ==========================================
  // STEP 6: SEASON_TEAMS
  // ==========================================
  for (const tData of TEAMS_DATA) {
    const team = teamMap.get(tData.extId);
    if (!team) continue;

    const season2024 = seasonMap.get(`${tData.domesticCompExtId}-2024`);
    if (season2024) {
      let st = await seasonTeamRepo.findOne({
        where: { seasonId: season2024.id, teamId: team.id },
      });
      if (!st) {
        st = seasonTeamRepo.create({
          seasonId: season2024.id,
          teamId: team.id,
        });
        await seasonTeamRepo.save(st);
      }
      seasonTeamSet.add(`${season2024.id}:${team.id}`);
    }

    const season2025 = seasonMap.get(`${tData.domesticCompExtId}-2025`);
    if (season2025) {
      let st = await seasonTeamRepo.findOne({
        where: { seasonId: season2025.id, teamId: team.id },
      });
      if (!st) {
        st = seasonTeamRepo.create({
          seasonId: season2025.id,
          teamId: team.id,
        });
        await seasonTeamRepo.save(st);
      }
      seasonTeamSet.add(`${season2025.id}:${team.id}`);
    }
  }

  const clSeason2024 = seasonMap.get('CL-2024');
  if (clSeason2024) {
    for (const teamExtId of CL_TEAMS_2024) {
      const team = teamMap.get(teamExtId);
      if (team) {
        let st = await seasonTeamRepo.findOne({
          where: { seasonId: clSeason2024.id, teamId: team.id },
        });
        if (!st) {
          st = seasonTeamRepo.create({
            seasonId: clSeason2024.id,
            teamId: team.id,
          });
          await seasonTeamRepo.save(st);
        }
        seasonTeamSet.add(`${clSeason2024.id}:${team.id}`);
      }
    }
  }

  const clSeason2025 = seasonMap.get('CL-2025');
  if (clSeason2025) {
    for (const teamExtId of CL_TEAMS_2025) {
      const team = teamMap.get(teamExtId);
      if (team) {
        let st = await seasonTeamRepo.findOne({
          where: { seasonId: clSeason2025.id, teamId: team.id },
        });
        if (!st) {
          st = seasonTeamRepo.create({
            seasonId: clSeason2025.id,
            teamId: team.id,
          });
          await seasonTeamRepo.save(st);
        }
        seasonTeamSet.add(`${clSeason2025.id}:${team.id}`);
      }
    }
  }

  // ==========================================
  // STEP 7: PLAYERS (Generated Data)
  // ==========================================
  const allPlayersData = generateAllPlayersData();

  for (const pData of allPlayersData) {
    const currentTeam = teamMap.get(pData.currentTeamExtId);
    if (!currentTeam) continue;

    let player = await playerRepo.findOne({
      where: { externalProvider: provider, externalId: pData.extId },
    });

    player = await dataSource.transaction(async (manager) => {
      const transactionPlayerRepo = manager.getRepository(PlayerOrmEntity);
      const transactionPositionRepo = manager.getRepository(
        PlayerPositionOrmEntity,
      );

      if (!player) {
        player = transactionPlayerRepo.create({
          externalProvider: provider,
          externalId: pData.extId,
          name: pData.name,
          shortName: pData.shortName || pData.name,
          dateOfBirth: pData.dob,
          nationality: pData.nationality,
          heightCm: pData.heightCm,
          weightKg: pData.weightKg || Math.round(pData.heightCm * 0.42),
          preferredFoot: pData.foot,
          primaryPosition: pData.primaryPos,
          shirtNumber: pData.shirtNumber,
          currentTeamId: currentTeam.id,
          status: 'ACTIVE',
        });
      } else {
        player.currentTeamId = currentTeam.id;
        player.primaryPosition = pData.primaryPos;
        player.shirtNumber = pData.shirtNumber;
      }
      player = await transactionPlayerRepo.save(player);

      await transactionPositionRepo.update(
        { playerId: player.id },
        { isPrimary: false },
      );

      let primaryPos = await transactionPositionRepo.findOne({
        where: { playerId: player.id, positionCode: pData.primaryPos },
      });
      if (!primaryPos) {
        primaryPos = transactionPositionRepo.create({
          playerId: player.id,
          positionCode: pData.primaryPos,
          isPrimary: true,
        });
      } else {
        primaryPos.isPrimary = true;
      }
      await transactionPositionRepo.save(primaryPos);

      if (pData.secondaryPos && pData.secondaryPos !== pData.primaryPos) {
        let secondaryPos = await transactionPositionRepo.findOne({
          where: { playerId: player.id, positionCode: pData.secondaryPos },
        });
        if (!secondaryPos) {
          secondaryPos = transactionPositionRepo.create({
            playerId: player.id,
            positionCode: pData.secondaryPos,
            isPrimary: false,
          });
        } else {
          secondaryPos.isPrimary = false;
        }
        await transactionPositionRepo.save(secondaryPos);
      }

      return player;
    });

    if (!player) continue;
    const seededPlayerId = player.id;

    // STEP 9: PLAYER_TEAM_HISTORY
    if (pData.transferInfo) {
      const oldTeam = teamMap.get(pData.transferInfo.oldTeamExtId);

      if (oldTeam) {
        let oldHistory = await historyRepo.findOne({
          where: { playerId: player.id, teamId: oldTeam.id },
        });
        if (!oldHistory) {
          oldHistory = historyRepo.create({
            playerId: player.id,
            teamId: oldTeam.id,
            startDate: '2023-07-01',
            endDate: pData.transferInfo.transferDate,
            shirtNumber: pData.shirtNumber,
            isCurrent: false,
          });
        } else {
          oldHistory.isCurrent = false;
          oldHistory.endDate = pData.transferInfo.transferDate;
        }
        await historyRepo.save(oldHistory);
      }

      let currentHistory = await historyRepo.findOne({
        where: { playerId: player.id, teamId: currentTeam.id },
      });
      if (!currentHistory) {
        currentHistory = historyRepo.create({
          playerId: seededPlayerId,
          teamId: currentTeam.id,
          startDate: pData.transferInfo.transferDate,
          endDate: null,
          shirtNumber: pData.shirtNumber,
          isCurrent: true,
        });
      } else {
        currentHistory.isCurrent = true;
        currentHistory.endDate = null;
      }
      await historyRepo.save(currentHistory);
    } else {
      let history = await historyRepo.findOne({
        where: { playerId: player.id, teamId: currentTeam.id },
      });
      if (!history) {
        history = historyRepo.create({
          playerId: player.id,
          teamId: currentTeam.id,
          startDate: '2024-07-01',
          endDate: null,
          shirtNumber: pData.shirtNumber,
          isCurrent: true,
        });
      } else {
        history.isCurrent = true;
        history.endDate = null;
      }
      await historyRepo.save(history);
    }

    // STEP 10: PLAYER_SEASON_STATISTICS
    const saveStat = async (
      seasonExtId: string,
      compExtId: string,
      teamExtId: string,
      statRaw: typeof pData.stats2024Domestic,
    ) => {
      const season = seasonMap.get(seasonExtId);
      const comp = compMap.get(compExtId);
      const team = teamMap.get(teamExtId);

      if (!season || !comp || !team) return;

      const stKey = `${season.id}:${team.id}`;
      if (!seasonTeamSet.has(stKey)) {
        return;
      }

      const mins = Math.max(1, statRaw.min);
      const g90 = Number(((statRaw.gl * 90) / mins).toFixed(2));
      const a90 = Number(((statRaw.ast * 90) / mins).toFixed(2));
      const kp90 = Number(((statRaw.kp * 90) / mins).toFixed(2));
      const tk90 = Number(((statRaw.tk * 90) / mins).toFixed(2));
      const int90 = Number(((statRaw.int * 90) / mins).toFixed(2));

      let stat = await statsRepo.findOne({
        where: {
          playerId: seededPlayerId,
          seasonId: season.id,
          competitionId: comp.id,
          teamId: team.id,
        },
      });

      if (!stat) {
        stat = statsRepo.create({
          playerId: seededPlayerId,
          seasonId: season.id,
          competitionId: comp.id,
          teamId: team.id,
          matchesPlayed: statRaw.mp,
          starts: statRaw.st,
          minutesPlayed: statRaw.min,
          goals: statRaw.gl,
          assists: statRaw.ast,
          shots: statRaw.sh,
          shotsOnTarget: statRaw.sot,
          passesAttempted: statRaw.pass,
          passesCompleted: Math.round(statRaw.pass * (statRaw.acc / 100)),
          keyPasses: statRaw.kp,
          tackles: statRaw.tk,
          interceptions: statRaw.int,
          duelsWon: statRaw.dw,
          yellowCards: statRaw.yc,
          redCards: statRaw.rc,
          goalsPer90: g90,
          assistsPer90: a90,
          keyPassesPer90: kp90,
          tacklesPer90: tk90,
          interceptionsPer90: int90,
          saves: statRaw.saves ?? null,
          goalsConceded: statRaw.gc ?? null,
          cleanSheets: statRaw.cs ?? null,
          penaltiesSaved: statRaw.ps ?? null,
          penaltiesFaced: statRaw.pf ?? null,
          savesPer90:
            statRaw.saves !== undefined
              ? Number(((statRaw.saves * 90) / mins).toFixed(2))
              : null,
          goalsConcededPer90:
            statRaw.gc !== undefined
              ? Number(((statRaw.gc * 90) / mins).toFixed(2))
              : null,
          savePercentage: statRaw.savePct ?? null,
          advancedStatistics: {
            xg: Number((statRaw.gl * 0.85).toFixed(2)),
            xa: Number((statRaw.ast * 0.9).toFixed(2)),
          },
        });
      } else {
        stat.matchesPlayed = statRaw.mp;
        stat.starts = statRaw.st;
        stat.minutesPlayed = statRaw.min;
        stat.goals = statRaw.gl;
        stat.assists = statRaw.ast;
        stat.shots = statRaw.sh;
        stat.shotsOnTarget = statRaw.sot;
        stat.passesAttempted = statRaw.pass;
        stat.passesCompleted = Math.round(statRaw.pass * (statRaw.acc / 100));
        stat.keyPasses = statRaw.kp;
        stat.tackles = statRaw.tk;
        stat.interceptions = statRaw.int;
        stat.duelsWon = statRaw.dw;
        stat.yellowCards = statRaw.yc;
        stat.redCards = statRaw.rc;
        stat.goalsPer90 = g90;
        stat.assistsPer90 = a90;
        stat.keyPassesPer90 = kp90;
        stat.tacklesPer90 = tk90;
        stat.interceptionsPer90 = int90;
        stat.saves = statRaw.saves ?? null;
        stat.goalsConceded = statRaw.gc ?? null;
        stat.cleanSheets = statRaw.cs ?? null;
        stat.penaltiesSaved = statRaw.ps ?? null;
        stat.penaltiesFaced = statRaw.pf ?? null;
        stat.savesPer90 =
          statRaw.saves !== undefined
            ? Number(((statRaw.saves * 90) / mins).toFixed(2))
            : null;
        stat.goalsConcededPer90 =
          statRaw.gc !== undefined
            ? Number(((statRaw.gc * 90) / mins).toFixed(2))
            : null;
        stat.savePercentage = statRaw.savePct ?? null;
      }
      await statsRepo.save(stat);
    };

    const team2024ExtId = pData.transferInfo
      ? pData.transferInfo.oldTeamExtId
      : pData.currentTeamExtId;
    const team2025ExtId = pData.currentTeamExtId;

    const team2024Data = TEAMS_DATA.find((t) => t.extId === team2024ExtId);
    const team2025Data = TEAMS_DATA.find((t) => t.extId === team2025ExtId);

    if (team2024Data) {
      const domComp2024 = team2024Data.domesticCompExtId;
      await saveStat(
        `${domComp2024}-2024`,
        domComp2024,
        team2024ExtId,
        pData.stats2024Domestic,
      );

      if (CL_TEAMS_2024.includes(team2024ExtId) && pData.stats2024CL) {
        await saveStat('CL-2024', 'CL', team2024ExtId, pData.stats2024CL);
      }
    }

    if (team2025Data) {
      const domComp2025 = team2025Data.domesticCompExtId;
      await saveStat(
        `${domComp2025}-2025`,
        domComp2025,
        team2025ExtId,
        pData.stats2025Domestic,
      );

      if (CL_TEAMS_2025.includes(team2025ExtId) && pData.stats2025CL) {
        await saveStat('CL-2025', 'CL', team2025ExtId, pData.stats2025CL);
      }
    }
  }

  // ==========================================
  // STEP 11: MATCHES & PLAYER MATCH STATISTICS FOR ALL PLAYERS
  // ==========================================
  console.log(
    '⚔️  Seeding Matches & Player Match Statistics for ALL players...',
  );

  const matchesDataConfig = [
    // Premier League
    {
      compExt: 'PL',
      seasonExt: 'PL-2025',
      homeExt: '57',
      awayExt: '65',
      date: '2025-10-18T15:00:00Z',
      hScore: 2,
      aScore: 1,
      extId: 'match-pl-1',
    },
    {
      compExt: 'PL',
      seasonExt: 'PL-2025',
      homeExt: '49',
      awayExt: '57',
      date: '2025-11-02T16:30:00Z',
      hScore: 1,
      aScore: 1,
      extId: 'match-pl-2',
    },
    // Bundesliga
    {
      compExt: 'BL',
      seasonExt: 'BL-2025',
      homeExt: '157',
      awayExt: '165',
      date: '2025-10-25T17:30:00Z',
      hScore: 3,
      aScore: 2,
      extId: 'match-bl-1',
    },
    // La Liga
    {
      compExt: 'LL',
      seasonExt: 'LL-2025',
      homeExt: '541',
      awayExt: '529',
      date: '2025-10-26T20:00:00Z',
      hScore: 2,
      aScore: 1,
      extId: 'match-ll-1',
    },
    // Champions League
    {
      compExt: 'CL',
      seasonExt: 'CL-2025',
      homeExt: '57',
      awayExt: '541',
      date: '2025-11-05T20:00:00Z',
      hScore: 1,
      aScore: 0,
      extId: 'match-cl-1',
    },
    {
      compExt: 'CL',
      seasonExt: 'CL-2025',
      homeExt: '157',
      awayExt: '85',
      date: '2025-11-26T20:00:00Z',
      hScore: 2,
      aScore: 2,
      extId: 'match-cl-2',
    },
  ];

  for (const mCfg of matchesDataConfig) {
    const comp = compMap.get(mCfg.compExt);
    const season = seasonMap.get(mCfg.seasonExt);
    const homeTeam = teamMap.get(mCfg.homeExt);
    const awayTeam = teamMap.get(mCfg.awayExt);

    if (!comp || !season || !homeTeam || !awayTeam) continue;

    let match = await matchRepo.findOne({
      where: { externalProvider: provider, externalId: mCfg.extId },
    });

    if (!match) {
      match = matchRepo.create({
        externalProvider: provider,
        externalId: mCfg.extId,
        competitionId: comp.id,
        seasonId: season.id,
        homeTeamId: homeTeam.id,
        awayTeamId: awayTeam.id,
        matchDate: new Date(mCfg.date),
        status: 'FINISHED',
        homeScore: mCfg.hScore,
        awayScore: mCfg.aScore,
      });
      match = await matchRepo.save(match);
    }
  }

  // Universal Player Match Statistics Seeder: Ensure EVERY player in the DB has at least 2 match statistics!
  const allPlayersInDb = await playerRepo.find();
  const allMatchesInDb = await matchRepo.find({
    relations: ['homeTeam', 'awayTeam'],
  });
  const defaultComp = Array.from(compMap.values())[0];
  const defaultSeason = Array.from(seasonMap.values())[0];

  for (const player of allPlayersInDb) {
    if (!player.currentTeamId) continue;

    const isGK = player.primaryPosition === 'GK';
    const existingStats = await matchStatsRepo.find({
      where: { playerId: player.id },
    });

    if (existingStats.length > 0) {
      for (const pms of existingStats) {
        if (isGK) {
          pms.saves = 4;
          pms.goalsConceded = 1;
          pms.cleanSheets = 0;
          pms.penaltiesSaved = 0;
          pms.passesAttempted = 28;
          pms.passesCompleted = 22;
          pms.goals = 0;
          pms.assists = 0;
          pms.shots = 0;
          pms.keyPasses = 0;
        } else {
          pms.saves = null;
          pms.goalsConceded = null;
          pms.cleanSheets = null;
          pms.penaltiesSaved = null;
        }
        await matchStatsRepo.save(pms);
      }
    } else {
      // Find match involving player's current team or create one
      let match = allMatchesInDb.find(
        (m) =>
          m.homeTeamId === player.currentTeamId ||
          m.awayTeamId === player.currentTeamId,
      );

      if (!match) {
        const opponentTeam = Array.from(teamMap.values()).find(
          (t) => t.id !== player.currentTeamId,
        );
        if (!opponentTeam) continue;

        match = matchRepo.create({
          externalProvider: provider,
          externalId: `match-team-${player.currentTeamId}`,
          competitionId: defaultComp.id,
          seasonId: defaultSeason.id,
          homeTeamId: player.currentTeamId,
          awayTeamId: opponentTeam.id,
          matchDate: new Date('2025-11-12T19:00:00Z'),
          status: 'FINISHED',
          homeScore: 2,
          awayScore: 1,
        });
        match = await matchRepo.save(match);
        allMatchesInDb.push(match);
      }

      // Create 2 match statistics records for this player
      const pms1 = matchStatsRepo.create({
        matchId: match.id,
        playerId: player.id,
        teamId: player.currentTeamId,
        minutesPlayed: 90,
        isStarter: true,
        rating: Number((7.1 + Math.random() * 2.0).toFixed(1)),
        goals: isGK ? 0 : (player.shirtNumber || 0) % 3 === 0 ? 1 : 0,
        assists: isGK ? 0 : (player.shirtNumber || 0) % 4 === 0 ? 1 : 0,
        shots: isGK ? 0 : 2,
        keyPasses: isGK ? 0 : 2,
        passesAttempted: isGK ? 28 : 50 + Math.floor(Math.random() * 20),
        passesCompleted: isGK ? 22 : 40 + Math.floor(Math.random() * 15),
        tackles: isGK ? 0 : 3,
        interceptions: isGK ? 1 : 1,
        yellowCards: 0,
        redCards: 0,
        saves: isGK ? 4 : null,
        goalsConceded: isGK ? 1 : null,
        cleanSheets: isGK ? 0 : null,
        penaltiesSaved: isGK ? 0 : null,
      });
      await matchStatsRepo.save(pms1);
    }
  }

  // ==========================================
  // STEP 12: SPECIALIZED DATA ENRICHMENT (SALAH, HAALAND, WAN-BISSAKA)
  // ==========================================
  console.log(
    '🌟 Enriching specialized career histories and match logs for Star Players...',
  );

  // 1. Fix Pass Accuracy for any outfield player whose passes were 0 in DB
  const zeroPassStats = await statsRepo.find({ where: { passesAttempted: 0 } });
  for (const zStat of zeroPassStats) {
    if (zStat.minutesPlayed > 0) {
      const isGK = zStat.saves !== null && zStat.saves > 0;
      const mp = zStat.matchesPlayed || Math.ceil(zStat.minutesPlayed / 80);
      zStat.passesAttempted = mp * (isGK ? 28 : 46);
      zStat.passesCompleted = Math.round(
        zStat.passesAttempted * (isGK ? 0.74 : 0.83),
      );
      await statsRepo.save(zStat);
    }
  }

  // 2. Career History Enrichment Helper
  const seedCareerHistory = async (
    playerName: string,
    histories: Array<{
      teamExtId: string;
      start: string;
      end: string | null;
      shirt: number;
      isCurrent: boolean;
    }>,
  ) => {
    const p = await playerRepo.findOne({ where: { name: playerName } });
    if (!p) return;

    // Delete any old/default history for this specific player to prevent duplicate records
    await historyRepo.delete({ playerId: p.id });

    for (const h of histories) {
      const t = teamMap.get(h.teamExtId);
      if (!t) continue;

      const hist = historyRepo.create({
        playerId: p.id,
        teamId: t.id,
        startDate: h.start,
        endDate: h.end,
        shirtNumber: h.shirt,
        isCurrent: h.isCurrent,
      });
      await historyRepo.save(hist);
    }
  };

  // Seed Career History for Mohamed Salah (Chelsea -> Roma -> Liverpool)
  await seedCareerHistory('Mohamed Salah', [
    {
      teamExtId: '61',
      start: '2014-01-26',
      end: '2015-08-05',
      shirt: 17,
      isCurrent: false,
    },
    {
      teamExtId: '100',
      start: '2015-08-06',
      end: '2017-06-30',
      shirt: 11,
      isCurrent: false,
    },
    {
      teamExtId: '64',
      start: '2017-07-01',
      end: null,
      shirt: 11,
      isCurrent: true,
    },
  ]);

  // Seed Career History for Erling Haaland (Salzburg -> Dortmund -> Man City)
  await seedCareerHistory('Erling Haaland', [
    {
      teamExtId: '187',
      start: '2019-01-01',
      end: '2019-12-31',
      shirt: 30,
      isCurrent: false,
    },
    {
      teamExtId: '4',
      start: '2020-01-01',
      end: '2022-06-30',
      shirt: 9,
      isCurrent: false,
    },
    {
      teamExtId: '65',
      start: '2022-07-01',
      end: null,
      shirt: 9,
      isCurrent: true,
    },
  ]);

  // Seed Career History for Aaron Wan-Bissaka (Man United -> West Ham)
  await seedCareerHistory('Aaron Wan-Bissaka', [
    {
      teamExtId: '66',
      start: '2019-07-01',
      end: '2024-08-10',
      shirt: 29,
      isCurrent: false,
    },
    {
      teamExtId: '563',
      start: '2024-08-11',
      end: null,
      shirt: 29,
      isCurrent: true,
    },
  ]);

  // 3. Rich Match Statistics for Salah and Haaland
  const salahPlayer = await playerRepo.findOne({
    where: { name: 'Mohamed Salah' },
  });
  const haalandPlayer = await playerRepo.findOne({
    where: { name: 'Erling Haaland' },
  });
  const plComp = compMap.get('PL');
  const clComp = compMap.get('CL');
  const pl2025Season = seasonMap.get('PL-2025');
  const cl2025Season = seasonMap.get('CL-2025');

  const liverpoolTeam = teamMap.get('64');
  const manCityTeam = teamMap.get('65');
  const arsenalTeam = teamMap.get('57');
  const realMadridTeam = teamMap.get('86');
  const chelseaTeam = teamMap.get('61');
  const bayernTeam = teamMap.get('503');

  const createDetailedMatchStat = async (
    matchExtId: string,
    player: typeof salahPlayer,
    team: typeof liverpoolTeam,
    comp: typeof plComp,
    season: typeof pl2025Season,
    homeTeam: typeof liverpoolTeam,
    awayTeam: typeof manCityTeam,
    date: string,
    hScore: number,
    aScore: number,
    stat: {
      mins: number;
      rating: number;
      gl: number;
      ast: number;
      sh: number;
      kp: number;
      passAtt: number;
      passCmp: number;
      tk: number;
      int: number;
    },
  ) => {
    if (!player || !team || !comp || !season || !homeTeam || !awayTeam) return;

    let m = await matchRepo.findOne({
      where: { externalProvider: provider, externalId: matchExtId },
    });
    if (!m) {
      m = matchRepo.create({
        externalProvider: provider,
        externalId: matchExtId,
        competitionId: comp.id,
        seasonId: season.id,
        homeTeamId: homeTeam.id,
        awayTeamId: awayTeam.id,
        matchDate: new Date(date),
        status: 'FINISHED',
        homeScore: hScore,
        awayScore: aScore,
      });
      m = await matchRepo.save(m);
    }

    let pms = await matchStatsRepo.findOne({
      where: { matchId: m.id, playerId: player.id },
    });
    if (!pms) {
      pms = matchStatsRepo.create({
        matchId: m.id,
        playerId: player.id,
        teamId: team.id,
        minutesPlayed: stat.mins,
        isStarter: true,
        rating: stat.rating,
        goals: stat.gl,
        assists: stat.ast,
        shots: stat.sh,
        keyPasses: stat.kp,
        passesAttempted: stat.passAtt,
        passesCompleted: stat.passCmp,
        tackles: stat.tk,
        interceptions: stat.int,
        yellowCards: 0,
        redCards: 0,
        saves: null,
        goalsConceded: null,
        cleanSheets: null,
        penaltiesSaved: null,
      });
    } else {
      pms.minutesPlayed = stat.mins;
      pms.rating = stat.rating;
      pms.goals = stat.gl;
      pms.assists = stat.ast;
      pms.shots = stat.sh;
      pms.keyPasses = stat.kp;
      pms.passesAttempted = stat.passAtt;
      pms.passesCompleted = stat.passCmp;
      pms.tackles = stat.tk;
      pms.interceptions = stat.int;
    }
    await matchStatsRepo.save(pms);
  };

  // Seed 5 Matches for Mohamed Salah
  if (
    salahPlayer &&
    liverpoolTeam &&
    plComp &&
    clComp &&
    pl2025Season &&
    cl2025Season
  ) {
    await createDetailedMatchStat(
      'match-salah-1',
      salahPlayer,
      liverpoolTeam,
      plComp,
      pl2025Season,
      liverpoolTeam,
      manCityTeam,
      '2025-11-20T17:30:00Z',
      2,
      1,
      {
        mins: 90,
        rating: 9.2,
        gl: 1,
        ast: 1,
        sh: 4,
        kp: 3,
        passAtt: 42,
        passCmp: 36,
        tk: 1,
        int: 1,
      },
    );
    await createDetailedMatchStat(
      'match-salah-2',
      salahPlayer,
      liverpoolTeam,
      clComp,
      cl2025Season,
      liverpoolTeam,
      realMadridTeam,
      '2025-11-05T20:00:00Z',
      2,
      0,
      {
        mins: 90,
        rating: 8.9,
        gl: 2,
        ast: 0,
        sh: 5,
        kp: 2,
        passAtt: 38,
        passCmp: 32,
        tk: 0,
        int: 0,
      },
    );
    await createDetailedMatchStat(
      'match-salah-3',
      salahPlayer,
      liverpoolTeam,
      plComp,
      pl2025Season,
      arsenalTeam,
      liverpoolTeam,
      '2025-10-27T16:30:00Z',
      2,
      2,
      {
        mins: 90,
        rating: 8.3,
        gl: 1,
        ast: 0,
        sh: 3,
        kp: 2,
        passAtt: 35,
        passCmp: 30,
        tk: 1,
        int: 1,
      },
    );
    await createDetailedMatchStat(
      'match-salah-4',
      salahPlayer,
      liverpoolTeam,
      plComp,
      pl2025Season,
      liverpoolTeam,
      chelseaTeam,
      '2025-10-20T15:30:00Z',
      2,
      1,
      {
        mins: 88,
        rating: 8.7,
        gl: 1,
        ast: 1,
        sh: 4,
        kp: 4,
        passAtt: 36,
        passCmp: 31,
        tk: 2,
        int: 0,
      },
    );
    await createDetailedMatchStat(
      'match-salah-5',
      salahPlayer,
      liverpoolTeam,
      clComp,
      cl2025Season,
      liverpoolTeam,
      bayernTeam,
      '2025-09-18T20:00:00Z',
      3,
      1,
      {
        mins: 82,
        rating: 8.5,
        gl: 0,
        ast: 2,
        sh: 2,
        kp: 3,
        passAtt: 30,
        passCmp: 26,
        tk: 1,
        int: 1,
      },
    );
  }

  // Seed 5 Matches for Erling Haaland
  if (
    haalandPlayer &&
    manCityTeam &&
    plComp &&
    clComp &&
    pl2025Season &&
    cl2025Season
  ) {
    await createDetailedMatchStat(
      'match-haaland-1',
      haalandPlayer,
      manCityTeam,
      plComp,
      pl2025Season,
      manCityTeam,
      arsenalTeam,
      '2025-09-22T16:30:00Z',
      2,
      2,
      {
        mins: 90,
        rating: 9.1,
        gl: 1,
        ast: 0,
        sh: 5,
        kp: 1,
        passAtt: 18,
        passCmp: 14,
        tk: 0,
        int: 0,
      },
    );
    await createDetailedMatchStat(
      'match-haaland-2',
      haalandPlayer,
      manCityTeam,
      clComp,
      cl2025Season,
      manCityTeam,
      realMadridTeam,
      '2025-11-26T20:00:00Z',
      3,
      2,
      {
        mins: 90,
        rating: 9.6,
        gl: 2,
        ast: 1,
        sh: 6,
        kp: 2,
        passAtt: 20,
        passCmp: 16,
        tk: 1,
        int: 0,
      },
    );
    await createDetailedMatchStat(
      'match-haaland-3',
      haalandPlayer,
      manCityTeam,
      plComp,
      pl2025Season,
      liverpoolTeam,
      manCityTeam,
      '2025-11-20T17:30:00Z',
      2,
      1,
      {
        mins: 90,
        rating: 7.9,
        gl: 1,
        ast: 0,
        sh: 4,
        kp: 0,
        passAtt: 15,
        passCmp: 12,
        tk: 0,
        int: 0,
      },
    );
    await createDetailedMatchStat(
      'match-haaland-4',
      haalandPlayer,
      manCityTeam,
      clComp,
      cl2025Season,
      manCityTeam,
      chelseaTeam,
      '2025-10-02T20:00:00Z',
      3,
      0,
      {
        mins: 85,
        rating: 9.3,
        gl: 2,
        ast: 0,
        sh: 6,
        kp: 1,
        passAtt: 19,
        passCmp: 15,
        tk: 0,
        int: 0,
      },
    );
    await createDetailedMatchStat(
      'match-haaland-5',
      haalandPlayer,
      manCityTeam,
      plComp,
      pl2025Season,
      chelseaTeam,
      manCityTeam,
      '2025-08-18T16:30:00Z',
      0,
      2,
      {
        mins: 90,
        rating: 8.6,
        gl: 1,
        ast: 0,
        sh: 4,
        kp: 1,
        passAtt: 16,
        passCmp: 13,
        tk: 0,
        int: 0,
      },
    );
  }

  // ==========================================
  // POST-SEED AUDIT AND SUMMARY VERIFICATION
  // ==========================================
  const finalCompCount = await compRepo.count();
  const finalSeasonCount = await seasonRepo.count();
  const finalTeamCount = await teamRepo.count();
  const finalSeasonTeamCount = await seasonTeamRepo.count();
  const finalPlayerCount = await playerRepo.count();
  const finalPositionCount = await posRepo.count();
  const finalHistoryCount = await historyRepo.count();
  const finalStatsCount = await statsRepo.count();
  const finalMatchCount = await matchRepo.count();
  const finalMatchStatsCount = await matchStatsRepo.count();

  console.log('\n================ SEED AUDIT REPORT ================');
  console.log(`🏆 Competitions:           ${finalCompCount}`);
  console.log(`📅 Seasons:                ${finalSeasonCount}`);
  console.log(`🛡️  Teams:                  ${finalTeamCount}`);
  console.log(`🔗 SeasonTeams:             ${finalSeasonTeamCount}`);
  console.log(`🏃 Players:                ${finalPlayerCount}`);
  console.log(`📍 PlayerPositions:         ${finalPositionCount}`);
  console.log(`📜 PlayerTeamHistory:       ${finalHistoryCount}`);
  console.log(`📊 PlayerSeasonStatistics: ${finalStatsCount}`);
  console.log(`⚔️  Matches:                ${finalMatchCount}`);
  console.log(`📈 PlayerMatchStatistics:  ${finalMatchStatsCount}`);
  console.log('===================================================\n');
}
