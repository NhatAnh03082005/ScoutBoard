import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import {
  PLAYER_READ_REPOSITORY,
  PlayerReadRepository,
} from '../ports/player-read.repository';
import { PlayerTeamHistoryResponseDto } from '../../presentation/http/dto/player-team-history-response.dto';

@Injectable()
export class GetPlayerTeamHistoryUseCase {
  constructor(
    @Inject(PLAYER_READ_REPOSITORY)
    private readonly playerReadRepository: PlayerReadRepository,
  ) {}

  async execute(playerId: string): Promise<PlayerTeamHistoryResponseDto[]> {
    const player = await this.playerReadRepository.findById(playerId);
    if (!player) {
      throw new NotFoundException('Cầu thủ không tồn tại');
    }

    const history = await this.playerReadRepository.findTeamHistoryByPlayerId(
      playerId,
    );

    return history.map((h) => ({
      id: h.id,
      team: {
        id: h.team.id,
        name: h.team.name,
        shortName: h.team.shortName,
        logoUrl: h.team.logoUrl,
        country: h.team.country,
      },
      joinedAt: h.startDate,
      leftAt: h.endDate,
      shirtNumber: h.shirtNumber,
      isCurrent: h.isCurrent,
    }));
  }
}
