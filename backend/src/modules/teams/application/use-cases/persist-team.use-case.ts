import { Injectable, Inject, BadRequestException } from '@nestjs/common';
import {
  TEAM_WRITE_REPOSITORY,
  TeamWriteRepository,
} from '../ports/team-write.repository';
import { TeamOrmEntity } from '../../infrastructure/persistence/typeorm/entities/team.orm-entity';
import { TransformedTeam } from '../../../external-football/domain/models/transformed-team.model';

@Injectable()
export class PersistTeamUseCase {
  constructor(
    @Inject(TEAM_WRITE_REPOSITORY)
    private readonly teamWriteRepository: TeamWriteRepository,
  ) {}

  async execute(input: TransformedTeam): Promise<TeamOrmEntity> {
    if (!input) {
      throw new BadRequestException('Transformed team input is required');
    }

    if (
      !input.externalProvider ||
      String(input.externalProvider).trim() === ''
    ) {
      throw new BadRequestException('externalProvider is required');
    }

    if (!input.externalId || String(input.externalId).trim() === '') {
      throw new BadRequestException('externalId is required');
    }

    if (!input.name || String(input.name).trim() === '') {
      throw new BadRequestException('Team name is required');
    }

    return this.teamWriteRepository.upsert(input);
  }

  async executeMany(inputs: TransformedTeam[]): Promise<TeamOrmEntity[]> {
    if (!Array.isArray(inputs) || inputs.length === 0) {
      return [];
    }

    const validated: TransformedTeam[] = [];
    for (const item of inputs) {
      if (
        item &&
        item.externalProvider &&
        item.externalId &&
        item.name &&
        String(item.name).trim() !== ''
      ) {
        validated.push(item);
      }
    }

    return this.teamWriteRepository.upsertMany(validated);
  }
}
