import { Injectable, BadRequestException } from '@nestjs/common';
import { PersistTeamUseCase } from './persist-team.use-case';
import { PersistPlayerUseCase } from '../../../players/application/use-cases/persist-player.use-case';
import { TransformedTeam } from '../../../external-football/domain/models/transformed-team.model';
import { TeamOrmEntity } from '../../infrastructure/persistence/typeorm/entities/team.orm-entity';
import { PlayerOrmEntity } from '../../../players/infrastructure/persistence/typeorm/entities/player.orm-entity';

export interface PersistTeamWithSquadResult {
  teamId: string;
  team: TeamOrmEntity;
  playersPersisted: number;
  players: PlayerOrmEntity[];
}

@Injectable()
export class PersistTeamWithSquadUseCase {
  constructor(
    private readonly persistTeamUseCase: PersistTeamUseCase,
    private readonly persistPlayerUseCase: PersistPlayerUseCase,
  ) {}

  async execute(input: TransformedTeam): Promise<PersistTeamWithSquadResult> {
    if (!input) {
      throw new BadRequestException('Transformed team input is required');
    }

    if (!input.externalProvider || String(input.externalProvider).trim() === '') {
      throw new BadRequestException('externalProvider is required');
    }

    if (!input.externalId || String(input.externalId).trim() === '') {
      throw new BadRequestException('externalId is required');
    }

    if (!input.name || String(input.name).trim() === '') {
      throw new BadRequestException('Team name is required');
    }

    // 1. Persist Team first
    const team = await this.persistTeamUseCase.execute(input);

    const teamId = team.id;
    if (!teamId) {
      throw new Error('Team persistence succeeded but returned empty internal ID');
    }

    // 2. Persist Squad players linking current_team_id
    let players: PlayerOrmEntity[] = [];
    if (Array.isArray(input.squad) && input.squad.length > 0) {
      players = await this.persistPlayerUseCase.executeMany(input.squad, teamId);
    }

    return {
      teamId,
      team,
      playersPersisted: players.length,
      players,
    };
  }
}
