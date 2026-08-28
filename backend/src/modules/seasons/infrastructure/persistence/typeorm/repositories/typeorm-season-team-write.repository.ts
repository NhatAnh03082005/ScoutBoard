import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SeasonTeamOrmEntity } from '../entities/season-team.orm-entity';
import { SeasonTeamWriteRepository } from '../../../../application/ports/season-team-write.repository';

@Injectable()
export class TypeOrmSeasonTeamWriteRepository implements SeasonTeamWriteRepository {
  constructor(
    @InjectRepository(SeasonTeamOrmEntity)
    private readonly repository: Repository<SeasonTeamOrmEntity>,
  ) {}

  async findBySeasonAndTeam(
    seasonId: string,
    teamId: string,
  ): Promise<SeasonTeamOrmEntity | null> {
    return this.repository.findOne({
      where: {
        seasonId: seasonId.trim(),
        teamId: teamId.trim(),
      },
    });
  }

  async findBySeasonId(seasonId: string): Promise<SeasonTeamOrmEntity[]> {
    return this.repository.find({
      where: {
        seasonId: seasonId.trim(),
      },
    });
  }

  async addTeamToSeason(
    seasonId: string,
    teamId: string,
  ): Promise<SeasonTeamOrmEntity> {
    const sId = seasonId.trim();
    const tId = teamId.trim();

    const existing = await this.findBySeasonAndTeam(sId, tId);
    if (existing) {
      return existing;
    }

    const entity = this.repository.create({
      seasonId: sId,
      teamId: tId,
    });

    return this.repository.save(entity);
  }

  async addTeamsToSeason(
    seasonId: string,
    teamIds: string[],
  ): Promise<SeasonTeamOrmEntity[]> {
    const sId = seasonId.trim();
    const uniqueTeamIds = Array.from(
      new Set(teamIds.map((id) => id.trim()).filter((id) => id !== '')),
    );

    const results: SeasonTeamOrmEntity[] = [];
    for (const tId of uniqueTeamIds) {
      const persisted = await this.addTeamToSeason(sId, tId);
      results.push(persisted);
    }

    return results;
  }

  async removeTeamFromSeason(seasonId: string, teamId: string): Promise<void> {
    await this.repository.delete({
      seasonId: seasonId.trim(),
      teamId: teamId.trim(),
    });
  }
}
