import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import {
  PLAYER_READ_REPOSITORY,
  PlayerReadRepository,
} from '../ports/player-read.repository';
import {
  PlayerSeasonStatisticResponseDto,
} from '../../presentation/http/dto/player-season-statistic-response.dto';

// Helper function to calculate per-90 metrics safely (returns null if minutesPlayed <= 0)
export function calculatePer90(metric: number | null | undefined, minutesPlayed: number): number | null {
  if (metric === null || metric === undefined) return null;
  if (!minutesPlayed || minutesPlayed <= 0) return null;
  const val = (metric * 90) / minutesPlayed;
  return Number(val.toFixed(2));
}

// Helper function to calculate pass accuracy safely (%)
export function calculatePassAccuracy(
  passesCompleted: number,
  passesAttempted: number,
): number | null {
  if (!passesAttempted || passesAttempted <= 0) return null;
  if (passesCompleted < 0) return null;
  const val = (passesCompleted / passesAttempted) * 100;
  return Number(val.toFixed(2));
}

@Injectable()
export class GetPlayerSeasonStatisticsUseCase {
  constructor(
    @Inject(PLAYER_READ_REPOSITORY)
    private readonly playerReadRepository: PlayerReadRepository,
  ) {}

  async execute(
    playerId: string,
  ): Promise<PlayerSeasonStatisticResponseDto[]> {
    const player = await this.playerReadRepository.findById(playerId);
    if (!player) {
      throw new NotFoundException('Cầu thủ không tồn tại');
    }

    const statsList =
      await this.playerReadRepository.findSeasonStatisticsByPlayerId(playerId);

    if (statsList.length === 0) {
      return [];
    }

    const results: PlayerSeasonStatisticResponseDto[] = [];

    for (const stat of statsList) {
      const minutes = stat.minutesPlayed || 0;
      const att = stat.passesAttempted || 0;
      const cmp = stat.passesCompleted || 0;

      // Common & Outfield Derived Per-90 Metrics
      const goalsP90 = calculatePer90(stat.goals, minutes);
      const assistsP90 = calculatePer90(stat.assists, minutes);
      const shotsP90 = calculatePer90(stat.shots, minutes);
      const shotsOnTargetP90 = calculatePer90(stat.shotsOnTarget, minutes);
      const passesP90 = calculatePer90(att, minutes);
      const keyPassesP90 = calculatePer90(stat.keyPasses, minutes);
      const tacklesP90 = calculatePer90(stat.tackles, minutes);
      const interceptionsP90 = calculatePer90(stat.interceptions, minutes);
      const duelsWonP90 = calculatePer90(stat.duelsWon, minutes);
      const passAcc = calculatePassAccuracy(cmp, att);

      // Goalkeeper Derived Metrics
      const savesP90 = stat.saves !== null && stat.saves !== undefined ? calculatePer90(stat.saves, minutes) : null;
      const goalsConcededP90 = stat.goalsConceded !== null && stat.goalsConceded !== undefined ? calculatePer90(stat.goalsConceded, minutes) : null;
      const savePct = stat.savePercentage !== null && stat.savePercentage !== undefined ? Number(stat.savePercentage) : null;
      const cleanSheetPct = stat.matchesPlayed > 0 && stat.cleanSheets !== null && stat.cleanSheets !== undefined
        ? Number(((stat.cleanSheets / stat.matchesPlayed) * 100).toFixed(2))
        : null;

      results.push({
        id: stat.id,
        season: {
          id: stat.season.id,
          seasonCode: stat.season.seasonCode,
          isCurrent: stat.season.isCurrent,
        },
        competition: {
          id: stat.competition.id,
          name: stat.competition.name,
          country: stat.competition.country,
        },
        team: stat.team
          ? {
              id: stat.team.id,
              name: stat.team.name,
              shortName: stat.team.shortName,
              logoUrl: stat.team.logoUrl,
            }
          : null,
        appearances: stat.matchesPlayed,
        starts: stat.starts,
        minutesPlayed: minutes,
        goals: stat.goals,
        assists: stat.assists,
        shots: stat.shots,
        shotsOnTarget: stat.shotsOnTarget,
        passesAttempted: att,
        passesCompleted: cmp,
        passAccuracy: passAcc,
        keyPasses: stat.keyPasses,
        tackles: stat.tackles,
        interceptions: stat.interceptions,
        duelsWon: stat.duelsWon,

        // Outfield Per-90 Metrics
        goalsPer90: goalsP90,
        assistsPer90: assistsP90,
        shotsPer90: shotsP90,
        shotsOnTargetPer90: shotsOnTargetP90,
        passesPer90: passesP90,
        keyPassesPer90: keyPassesP90,
        tacklesPer90: tacklesP90,
        interceptionsPer90: interceptionsP90,
        duelsWonPer90: duelsWonP90,

        // Goalkeeper Specific Metrics (Raw & Derived)
        saves: stat.saves ?? null,
        goalsConceded: stat.goalsConceded ?? null,
        cleanSheets: stat.cleanSheets ?? null,
        penaltiesSaved: stat.penaltiesSaved ?? null,
        penaltiesFaced: stat.penaltiesFaced ?? null,
        savesPer90: savesP90,
        goalsConcededPer90: goalsConcededP90,
        savePercentage: savePct,
        cleanSheetPercentage: cleanSheetPct,
      });
    }

    return results;
  }
}
