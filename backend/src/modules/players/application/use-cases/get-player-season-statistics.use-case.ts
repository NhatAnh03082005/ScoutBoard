import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import {
  PLAYER_READ_REPOSITORY,
  PlayerReadRepository,
} from '../ports/player-read.repository';
import { PlayerSeasonStatisticResponseDto } from '../../presentation/http/dto/player-season-statistic-response.dto';

// Helper function to calculate per-90 metrics safely (returns null if minutesPlayed <= 0)
function calculatePer90(metric: number, minutesPlayed: number): number | null {
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

    return statsList.map((stat) => {
      const minutes = stat.minutesPlayed || 0;
      const att = stat.passesAttempted || 0;
      const cmp = stat.passesCompleted || 0;

      return {
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
        passAccuracy: calculatePassAccuracy(cmp, att),
        keyPasses: stat.keyPasses,
        tackles: stat.tackles,
        interceptions: stat.interceptions,
        duelsWon: stat.duelsWon,

        // Derived Per-90 Metrics
        goalsPer90: calculatePer90(stat.goals, minutes),
        assistsPer90: calculatePer90(stat.assists, minutes),
        shotsPer90: calculatePer90(stat.shots, minutes),
        shotsOnTargetPer90: calculatePer90(stat.shotsOnTarget, minutes),
        passesPer90: calculatePer90(att, minutes),
        keyPassesPer90: calculatePer90(stat.keyPasses, minutes),
        tacklesPer90: calculatePer90(stat.tackles, minutes),
        interceptionsPer90: calculatePer90(stat.interceptions, minutes),
        duelsWonPer90: calculatePer90(stat.duelsWon, minutes),
      };
    });
  }
}
