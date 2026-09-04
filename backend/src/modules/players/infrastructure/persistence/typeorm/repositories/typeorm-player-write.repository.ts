import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PlayerOrmEntity } from '../entities/player.orm-entity';
import { PlayerWriteRepository } from '../../../../application/ports/player-write.repository';
import { TransformedPlayer } from '../../../../../external-football/domain/models/transformed-player.model';

@Injectable()
export class TypeOrmPlayerWriteRepository implements PlayerWriteRepository {
  constructor(
    @InjectRepository(PlayerOrmEntity)
    private readonly playerRepository: Repository<PlayerOrmEntity>,
  ) {}

  async findByExternalIdentity(
    externalProvider: string,
    externalId: string,
  ): Promise<PlayerOrmEntity | null> {
    return this.playerRepository.findOne({
      where: {
        externalProvider: externalProvider.trim(),
        externalId: externalId.trim(),
      },
    });
  }

  async upsert(
    player: TransformedPlayer,
    teamId?: string | null,
  ): Promise<PlayerOrmEntity> {
    const existing = await this.findByExternalIdentity(
      player.externalProvider,
      player.externalId,
    );

    if (!existing) {
      const entity = this.playerRepository.create({
        currentTeamId: teamId ?? null,
        externalProvider: player.externalProvider.trim(),
        externalId: player.externalId.trim(),
        name: player.name.trim(),
        normalizedName: player.normalizedName ? player.normalizedName.trim() : null,
        shortName: player.shortName ? player.shortName.trim() : null,
        dateOfBirth: player.dateOfBirth || null,
        nationality: player.nationality ? player.nationality.trim() : null,
        heightCm: player.heightCm ?? null,
        weightKg: player.weightKg ?? null,
        preferredFoot: player.preferredFoot ?? null,
        rawPosition: player.rawPosition ? player.rawPosition.trim() : null,
        primaryPosition: player.primaryPosition ? player.primaryPosition.trim() : null,
        shirtNumber: player.shirtNumber ?? null,
        imageUrl: player.imageUrl ?? null,
        status: player.status || 'ACTIVE',
        dataUpdatedAt: player.dataUpdatedAt || null,
      });

      return this.playerRepository.save(entity);
    }

    existing.name = player.name.trim();
    if (player.normalizedName) {
      existing.normalizedName = player.normalizedName.trim();
    }
    if (player.shortName) {
      existing.shortName = player.shortName.trim();
    }
    if (player.dateOfBirth) {
      existing.dateOfBirth = player.dateOfBirth;
    }
    if (player.nationality) {
      existing.nationality = player.nationality.trim();
    }
    if (player.heightCm !== undefined && player.heightCm !== null) {
      existing.heightCm = player.heightCm;
    }
    if (player.weightKg !== undefined && player.weightKg !== null) {
      existing.weightKg = player.weightKg;
    }
    if (player.preferredFoot !== undefined && player.preferredFoot !== null) {
      existing.preferredFoot = player.preferredFoot;
    }
    if (player.imageUrl) {
      existing.imageUrl = player.imageUrl.trim();
    }
    if (player.rawPosition) {
      existing.rawPosition = player.rawPosition.trim();
    }
    if (player.primaryPosition) {
      existing.primaryPosition = player.primaryPosition.trim();
    }
    if (player.shirtNumber !== undefined && player.shirtNumber !== null) {
      existing.shirtNumber = player.shirtNumber;
    }
    if (teamId !== undefined) {
      existing.currentTeamId = teamId;
    }
    if (player.status) {
      existing.status = player.status;
    }
    if (player.dataUpdatedAt) {
      existing.dataUpdatedAt = player.dataUpdatedAt;
    }

    return this.playerRepository.save(existing);
  }

  async upsertMany(
    players: TransformedPlayer[],
    teamId?: string | null,
  ): Promise<PlayerOrmEntity[]> {
    const results: PlayerOrmEntity[] = [];
    for (const player of players) {
      const persisted = await this.upsert(player, teamId);
      results.push(persisted);
    }
    return results;
  }
}
