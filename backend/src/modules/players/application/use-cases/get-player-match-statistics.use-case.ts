import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import {
  PLAYER_READ_REPOSITORY,
  PlayerReadRepository,
  FindPlayerMatchStatisticsQuery,
} from '../ports/player-read.repository';
import { PlayerMatchStatisticListResponseDto } from '../../presentation/http/dto/player-match-statistic-response.dto';
import { calculatePassAccuracy } from './get-player-season-statistics.use-case';

@Injectable()
export class GetPlayerMatchStatisticsUseCase {
  constructor(
    @Inject(PLAYER_READ_REPOSITORY)
    private readonly playerReadRepository: PlayerReadRepository,
  ) {}

  async execute(
    playerId: string,
    query: FindPlayerMatchStatisticsQuery,
  ): Promise<PlayerMatchStatisticListResponseDto> {
    const player = await this.playerReadRepository.findById(playerId);
    if (!player) {
      throw new NotFoundException('Cầu thủ không tồn tại');
    }

    const { items, total } =
      await this.playerReadRepository.findMatchStatisticsByPlayerId(
        playerId,
        query,
      );

    const limit = query.limit ?? 10;
    const offset = query.offset ?? 0;

    return {
      items: items.map((item) => {
        const att = item.passesAttempted || 0;
        const cmp = item.passesCompleted || 0;

        return {
          id: item.id,
          match: {
            id: item.match.id,
            kickoffAt: item.match.matchDate
              ? item.match.matchDate.toISOString()
              : null,
            status: item.match.status,
            competition: {
              id: item.match.competition.id,
              name: item.match.competition.name,
              country: item.match.competition.country,
            },
            season: {
              id: item.match.season.id,
              seasonCode: item.match.season.seasonCode,
            },
            homeTeam: {
              id: item.match.homeTeam.id,
              name: item.match.homeTeam.name,
              shortName: item.match.homeTeam.shortName,
              logoUrl: item.match.homeTeam.logoUrl,
            },
            awayTeam: {
              id: item.match.awayTeam.id,
              name: item.match.awayTeam.name,
              shortName: item.match.awayTeam.shortName,
              logoUrl: item.match.awayTeam.logoUrl,
            },
            homeScore: item.match.homeScore,
            awayScore: item.match.awayScore,
          },
          team: {
            id: item.team.id,
            name: item.team.name,
            shortName: item.team.shortName,
            logoUrl: item.team.logoUrl,
          },
          minutesPlayed: item.minutesPlayed,
          isStarter: item.isStarter,
          rating:
            item.rating !== null && item.rating !== undefined
              ? Number(item.rating)
              : null,
          goals: item.goals,
          assists: item.assists,
          shots: item.shots,
          keyPasses: item.keyPasses,
          passesAttempted: att,
          passesCompleted: cmp,
          passAccuracy: calculatePassAccuracy(cmp, att),
          tackles: item.tackles,
          interceptions: item.interceptions,
          yellowCards: item.yellowCards,
          redCards: item.redCards,
          statistics: item.statistics,
        };
      }),
      pagination: {
        limit,
        offset,
        total,
      },
    };
  }
}
