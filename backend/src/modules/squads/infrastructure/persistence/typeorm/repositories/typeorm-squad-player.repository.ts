import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SquadPlayerRepository } from '../../../../domain/repositories/squad-player.repository';
import { SquadPlayer, SquadPlayerRole } from '../../../../domain/entities/squad-player';
import { SquadPlayerOrmEntity } from '../entities/squad-player.orm-entity';
import { SquadPlayerMapper } from '../mappers/squad-player.mapper';

@Injectable()
export class TypeOrmSquadPlayerRepository implements SquadPlayerRepository {
  constructor(
    @InjectRepository(SquadPlayerOrmEntity)
    private readonly ormRepository: Repository<SquadPlayerOrmEntity>,
  ) {}

  async findBySquadAndPlayer(
    squadId: string,
    playerId: string,
  ): Promise<SquadPlayer | null> {
    const entity = await this.ormRepository.findOne({
      where: { squadId, playerId },
    });

    return entity ? SquadPlayerMapper.toDomain(entity) : null;
  }

  async findBySquadId(squadId: string): Promise<SquadPlayer[]> {
    const entities = await this.ormRepository.find({
      where: { squadId },
      order: { displayOrder: 'ASC', addedAt: 'ASC' },
    });

    return entities.map((e) => SquadPlayerMapper.toDomain(e));
  }

  async findStarterBySlotCode(
    squadId: string,
    slotCode: string,
  ): Promise<SquadPlayer | null> {
    const entity = await this.ormRepository.findOne({
      where: { squadId, slotCode, role: 'STARTER' },
    });

    return entity ? SquadPlayerMapper.toDomain(entity) : null;
  }

  async findCaptainBySquadId(squadId: string): Promise<SquadPlayer | null> {
    const entity = await this.ormRepository.findOne({
      where: { squadId, isCaptain: true },
    });

    return entity ? SquadPlayerMapper.toDomain(entity) : null;
  }

  async findPlayersWithDetailsBySquadId(squadId: string): Promise<any[]> {
    const entities = await this.ormRepository.find({
      where: { squadId },
      relations: ['player', 'player.currentTeam'],
      order: { displayOrder: 'ASC', addedAt: 'ASC' },
    });

    return entities.map((e) => ({
      id: e.id,
      squadId: e.squadId,
      playerId: e.playerId,
      slotCode: e.slotCode,
      role: e.role,
      isCaptain: e.isCaptain,
      displayOrder: e.displayOrder,
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
    squadId: string;
    playerId: string;
    slotCode?: string | null;
    role: SquadPlayerRole | string;
    isCaptain?: boolean;
    displayOrder?: number | null;
  }): Promise<SquadPlayer> {
    const entity = this.ormRepository.create({
      squadId: data.squadId,
      playerId: data.playerId,
      slotCode: data.slotCode ? data.slotCode.trim() : null,
      role: data.role,
      isCaptain: !!data.isCaptain,
      displayOrder: data.displayOrder !== undefined ? data.displayOrder : null,
    });

    const saved = await this.ormRepository.save(entity);
    return SquadPlayerMapper.toDomain(saved);
  }

  async save(squadPlayer: SquadPlayer): Promise<SquadPlayer> {
    const entity = SquadPlayerMapper.toPersistence(squadPlayer);
    const updated = await this.ormRepository.save(entity);
    const fetched = await this.findBySquadAndPlayer(updated.squadId, updated.playerId);
    return fetched || SquadPlayerMapper.toDomain(updated);
  }

  async removePlayer(squadId: string, playerId: string): Promise<void> {
    await this.ormRepository.delete({ squadId, playerId });
  }
}
