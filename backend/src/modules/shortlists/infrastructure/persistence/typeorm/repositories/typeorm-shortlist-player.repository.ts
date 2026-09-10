import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ShortlistPlayerRepository } from '../../../../domain/repositories/shortlist-player.repository';
import { ShortlistPlayer } from '../../../../domain/entities/shortlist-player';
import { ShortlistPlayerOrmEntity } from '../entities/shortlist-player.orm-entity';
import { ShortlistPlayerMapper } from '../mappers/shortlist-player.mapper';

@Injectable()
export class TypeOrmShortlistPlayerRepository implements ShortlistPlayerRepository {
  constructor(
    @InjectRepository(ShortlistPlayerOrmEntity)
    private readonly ormRepository: Repository<ShortlistPlayerOrmEntity>,
  ) {}

  async findByShortlistAndPlayer(
    shortlistId: string,
    playerId: string,
  ): Promise<ShortlistPlayer | null> {
    const entity = await this.ormRepository.findOne({
      where: { shortlistId, playerId },
    });

    return entity ? ShortlistPlayerMapper.toDomain(entity) : null;
  }

  async findByShortlistId(shortlistId: string): Promise<ShortlistPlayer[]> {
    const entities = await this.ormRepository.find({
      where: { shortlistId },
      order: { addedAt: 'DESC' },
    });

    return entities.map((e) => ShortlistPlayerMapper.toDomain(e));
  }

  async findPlayersWithDetailsByShortlistId(
    shortlistId: string,
  ): Promise<any[]> {
    const entities = await this.ormRepository.find({
      where: { shortlistId },
      relations: ['player', 'player.currentTeam'],
      order: { addedAt: 'DESC' },
    });

    return entities.map((e) => ({
      id: e.id,
      shortlistId: e.shortlistId,
      playerId: e.playerId,
      note: e.note,
      addedAt: e.addedAt,
      player: e.player
        ? {
            id: e.player.id,
            name: e.player.name,
            shortName: e.player.shortName,
            dateOfBirth: e.player.dateOfBirth,
            nationality: e.player.nationality,
            heightCm: e.player.heightCm,
            weightKg: e.player.weightKg,
            primaryPosition: e.player.primaryPosition,
            shirtNumber: e.player.shirtNumber,
            imageUrl: e.player.imageUrl,
            currentTeam: e.player.currentTeam
              ? {
                  id: e.player.currentTeam.id,
                  name: e.player.currentTeam.name,
                  shortName: e.player.currentTeam.shortName,
                  logoUrl: e.player.currentTeam.logoUrl,
                }
              : null,
          }
        : null,
    }));
  }

  async addPlayer(data: {
    shortlistId: string;
    playerId: string;
    note?: string | null;
  }): Promise<ShortlistPlayer> {
    const entity = this.ormRepository.create({
      shortlistId: data.shortlistId,
      playerId: data.playerId,
      note: data.note ? data.note.trim() : null,
    });

    const saved = await this.ormRepository.save(entity);
    return ShortlistPlayerMapper.toDomain(saved);
  }

  async save(shortlistPlayer: ShortlistPlayer): Promise<ShortlistPlayer> {
    const entity = ShortlistPlayerMapper.toPersistence(shortlistPlayer);
    const updated = await this.ormRepository.save(entity);
    const fetched = await this.findByShortlistAndPlayer(
      updated.shortlistId,
      updated.playerId,
    );
    return fetched || ShortlistPlayerMapper.toDomain(updated);
  }

  async removePlayer(shortlistId: string, playerId: string): Promise<void> {
    await this.ormRepository.delete({ shortlistId, playerId });
  }
}
