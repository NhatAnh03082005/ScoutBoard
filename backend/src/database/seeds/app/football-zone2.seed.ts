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
  const matchStatsRepo = dataSource.getRepository(PlayerMatchStatisticOrmEntity);

  console.log('⚽ Starting Football Seeding (Zone 2)...');

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
        st = seasonTeamRepo.create({ seasonId: season2024.id, teamId: team.id });
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
        st = seasonTeamRepo.create({ seasonId: season2025.id, teamId: team.id });
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
          st = seasonTeamRepo.create({ seasonId: clSeason2024.id, teamId: team.id });
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
          st = seasonTeamRepo.create({ seasonId: clSeason2025.id, teamId: team.id });
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

    if (!player) {
      player = playerRepo.create({
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
    player = await playerRepo.save(player);

    // STEP 8: PLAYER_POSITIONS
    let primaryPos = await posRepo.findOne({
      where: { playerId: player.id, positionCode: pData.primaryPos },
    });
    if (!primaryPos) {
      primaryPos = posRepo.create({
        playerId: player.id,
        positionCode: pData.primaryPos,
        isPrimary: true,
      });
    } else {
      primaryPos.isPrimary = true;
    }
    await posRepo.save(primaryPos);

    if (pData.secondaryPos && pData.secondaryPos !== pData.primaryPos) {
      let secPos = await posRepo.findOne({
        where: { playerId: player.id, positionCode: pData.secondaryPos },
      });
      if (!secPos) {
        secPos = posRepo.create({
          playerId: player.id,
          positionCode: pData.secondaryPos,
          isPrimary: false,
        });
      } else {
        secPos.isPrimary = false;
      }
      await posRepo.save(secPos);
    }

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
          playerId: player.id,
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
          playerId: player.id,
          seasonId: season.id,
          competitionId: comp.id,
          teamId: team.id,
        },
      });

      if (!stat) {
        stat = statsRepo.create({
          playerId: player.id,
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
  console.log('⚔️  Seeding Matches & Player Match Statistics for ALL players...');

  const matchesDataConfig = [
    // Premier League
    { compExt: 'PL', seasonExt: 'PL-2025', homeExt: '57', awayExt: '65', date: '2025-10-18T15:00:00Z', hScore: 2, aScore: 1, extId: 'match-pl-1' },
    { compExt: 'PL', seasonExt: 'PL-2025', homeExt: '49', awayExt: '57', date: '2025-11-02T16:30:00Z', hScore: 1, aScore: 1, extId: 'match-pl-2' },
    // Bundesliga
    { compExt: 'BL', seasonExt: 'BL-2025', homeExt: '157', awayExt: '165', date: '2025-10-25T17:30:00Z', hScore: 3, aScore: 2, extId: 'match-bl-1' },
    // La Liga
    { compExt: 'LL', seasonExt: 'LL-2025', homeExt: '541', awayExt: '529', date: '2025-10-26T20:00:00Z', hScore: 2, aScore: 1, extId: 'match-ll-1' },
    // Champions League
    { compExt: 'CL', seasonExt: 'CL-2025', homeExt: '57', awayExt: '541', date: '2025-11-05T20:00:00Z', hScore: 1, aScore: 0, extId: 'match-cl-1' },
    { compExt: 'CL', seasonExt: 'CL-2025', homeExt: '157', awayExt: '85', date: '2025-11-26T20:00:00Z', hScore: 2, aScore: 2, extId: 'match-cl-2' },
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
  const allMatchesInDb = await matchRepo.find({ relations: ['homeTeam', 'awayTeam'] });
  const defaultComp = Array.from(compMap.values())[0];
  const defaultSeason = Array.from(seasonMap.values())[0];

  for (const player of allPlayersInDb) {
    if (!player.currentTeamId) continue;

    const existingCount = await matchStatsRepo.count({ where: { playerId: player.id } });
    if (existingCount === 0) {
      // Find match involving player's current team or create one
      let match = allMatchesInDb.find(
        (m) => m.homeTeamId === player.currentTeamId || m.awayTeamId === player.currentTeamId,
      );

      if (!match) {
        const opponentTeam = Array.from(teamMap.values()).find((t) => t.id !== player.currentTeamId);
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
        goals: (player.shirtNumber || 0) % 3 === 0 ? 1 : 0,
        assists: (player.shirtNumber || 0) % 4 === 0 ? 1 : 0,
        shots: 2,
        keyPasses: 2,
        passesAttempted: 50 + Math.floor(Math.random() * 20),
        passesCompleted: 40 + Math.floor(Math.random() * 15),
        tackles: 3,
        interceptions: 1,
        yellowCards: 0,
        redCards: 0,
      });
      await matchStatsRepo.save(pms1);
    }
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
