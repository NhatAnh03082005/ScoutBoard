import { DataSource } from 'typeorm';
import { CompetitionOrmEntity } from '../../../modules/competitions/infrastructure/persistence/typeorm/entities/competition.orm-entity';
import { SeasonOrmEntity } from '../../../modules/seasons/infrastructure/persistence/typeorm/entities/season.orm-entity';
import { SeasonTeamOrmEntity } from '../../../modules/seasons/infrastructure/persistence/typeorm/entities/season-team.orm-entity';
import { TeamOrmEntity } from '../../../modules/teams/infrastructure/persistence/typeorm/entities/team.orm-entity';
import { PlayerOrmEntity } from '../../../modules/players/infrastructure/persistence/typeorm/entities/player.orm-entity';
import { PlayerPositionOrmEntity } from '../../../modules/players/infrastructure/persistence/typeorm/entities/player-position.orm-entity';
import { PlayerTeamHistoryOrmEntity } from '../../../modules/players/infrastructure/persistence/typeorm/entities/player-team-history.orm-entity';
import { PlayerSeasonStatisticOrmEntity } from '../../../modules/players/infrastructure/persistence/typeorm/entities/player-season-statistic.orm-entity';

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
        tla: tData.tla,
        country: tData.country,
        foundedYear: tData.founded,
        venueName: tData.venue,
        logoUrl: tData.logo,
        status: 'ACTIVE',
      });
    } else {
      team.name = tData.name;
      team.shortName = tData.shortName;
      team.tla = tData.tla;
      team.country = tData.country;
      team.foundedYear = tData.founded;
      team.venueName = tData.venue;
      team.logoUrl = tData.logo;
    }
    team = await teamRepo.save(team);
    teamMap.set(tData.extId, team);
  }

  // Helper function to register SeasonTeam idempotently
  const ensureSeasonTeam = async (seasonExtId: string, teamExtId: string) => {
    const season = seasonMap.get(seasonExtId);
    const team = teamMap.get(teamExtId);
    if (!season || !team) return;

    const key = `${season.id}:${team.id}`;
    if (!seasonTeamSet.has(key)) {
      let st = await seasonTeamRepo.findOne({
        where: { seasonId: season.id, teamId: team.id },
      });
      if (!st) {
        st = seasonTeamRepo.create({
          seasonId: season.id,
          teamId: team.id,
        });
        await seasonTeamRepo.save(st);
      }
      seasonTeamSet.add(key);
    }
  };

  // ==========================================
  // STEP 6: SEASON_TEAMS (44 Total)
  // ==========================================
  // 1. Domestic season_teams (14 teams × 2 seasons = 28)
  for (const tData of TEAMS_DATA) {
    const domestic2024SeasonExtId = `${tData.domesticCompExtId}-2024`;
    const domestic2025SeasonExtId = `${tData.domesticCompExtId}-2025`;

    await ensureSeasonTeam(domestic2024SeasonExtId, tData.extId);
    await ensureSeasonTeam(domestic2025SeasonExtId, tData.extId);
  }

  // 2. Champions League season_teams 2024/25 (8 teams)
  for (const teamExtId of CL_TEAMS_2024) {
    await ensureSeasonTeam('CL-2024', teamExtId);
  }

  // 3. Champions League season_teams 2025/26 (8 teams)
  for (const teamExtId of CL_TEAMS_2025) {
    await ensureSeasonTeam('CL-2025', teamExtId);
  }

  // ==========================================
  // STEP 7, 8, 9, 10: PLAYERS, POSITIONS, HISTORY, STATS
  // ==========================================
  const allPlayers = generateAllPlayersData();

  for (const pData of allPlayers) {
    const currentTeam = teamMap.get(pData.currentTeamExtId);
    if (!currentTeam) continue;

    // STEP 7: PLAYERS
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
        weightKg: pData.weightKg || 75,
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
    // Primary Position
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

    // Secondary Position (if any)
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
      // Transferred player: 2 team history entries
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

      // New current team entry
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
      // Non-transferred player: 1 team history entry
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
    // Helper to save a statistic record safely
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

      // Verify that (season_id, team_id) exists in season_teams
      const stKey = `${season.id}:${team.id}`;
      if (!seasonTeamSet.has(stKey)) {
        return; // Guard against statistics for team not participating in that season
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
          passes: statRaw.pass,
          passAccuracy: statRaw.acc,
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
        stat.passes = statRaw.pass;
        stat.passAccuracy = statRaw.acc;
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

    // Determine 2024/25 Team and 2025/26 Team for this player
    const team2024ExtId = pData.transferInfo
      ? pData.transferInfo.oldTeamExtId
      : pData.currentTeamExtId;
    const team2025ExtId = pData.currentTeamExtId;

    const team2024Data = TEAMS_DATA.find((t) => t.extId === team2024ExtId);
    const team2025Data = TEAMS_DATA.find((t) => t.extId === team2025ExtId);

    if (team2024Data) {
      // 1. 2024/25 Domestic Stats
      const domComp2024 = team2024Data.domesticCompExtId;
      await saveStat(
        `${domComp2024}-2024`,
        domComp2024,
        team2024ExtId,
        pData.stats2024Domestic,
      );

      // 2. 2024/25 Champions League Stats (only if team2024 was in CL 2024)
      if (CL_TEAMS_2024.includes(team2024ExtId) && pData.stats2024CL) {
        await saveStat('CL-2024', 'CL', team2024ExtId, pData.stats2024CL);
      }
    }

    if (team2025Data) {
      // 3. 2025/26 Domestic Stats
      const domComp2025 = team2025Data.domesticCompExtId;
      await saveStat(
        `${domComp2025}-2025`,
        domComp2025,
        team2025ExtId,
        pData.stats2025Domestic,
      );

      // 4. 2025/26 Champions League Stats (only if team2025 is in CL 2025)
      if (CL_TEAMS_2025.includes(team2025ExtId) && pData.stats2025CL) {
        await saveStat('CL-2025', 'CL', team2025ExtId, pData.stats2025CL);
      }
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

  console.log('\n================ SEED AUDIT REPORT ================');
  console.log(`🏆 Competitions:           ${finalCompCount}`);
  console.log(`📅 Seasons:                ${finalSeasonCount}`);
  console.log(`🛡️  Teams:                  ${finalTeamCount}`);
  console.log(`🔗 SeasonTeams:             ${finalSeasonTeamCount}`);
  console.log(`🏃 Players:                ${finalPlayerCount}`);
  console.log(`📍 PlayerPositions:         ${finalPositionCount}`);
  console.log(`📜 PlayerTeamHistory:       ${finalHistoryCount}`);
  console.log(`📊 PlayerSeasonStatistics: ${finalStatsCount}`);
  console.log('===================================================\n');
}
