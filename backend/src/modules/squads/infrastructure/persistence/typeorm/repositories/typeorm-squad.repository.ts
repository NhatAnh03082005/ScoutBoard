import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SquadRepository } from '../../../../domain/repositories/squad.repository';
import {
  Squad,
  SquadVisibility,
  FormationCode,
} from '../../../../domain/entities/squad';
import { SquadOrmEntity } from '../entities/squad.orm-entity';
import { SquadMapper } from '../mappers/squad.mapper';

@Injectable()
export class TypeOrmSquadRepository implements SquadRepository {
  constructor(
    @InjectRepository(SquadOrmEntity)
    private readonly ormRepository: Repository<SquadOrmEntity>,
  ) {}

  async findById(id: string): Promise<Squad | null> {
    const entity = await this.ormRepository.findOne({
      where: { id },
    });

    return entity ? SquadMapper.toDomain(entity) : null;
  }

  async findByOwner(ownerId: string): Promise<Squad[]> {
    const entities = await this.ormRepository.find({
      where: { ownerId },
      order: { updatedAt: 'DESC' },
    });

    return entities.map((e) => SquadMapper.toDomain(e));
  }

  async create(data: {
    ownerId: string;
    name: string;
    formationCode: FormationCode | string;
    seasonId?: string | null;
    description?: string | null;
    visibility?: SquadVisibility;
  }): Promise<Squad> {
    const entity = this.ormRepository.create({
      ownerId: data.ownerId,
      name: data.name.trim(),
      formationCode: String(data.formationCode).trim(),
      seasonId: data.seasonId || null,
      description: data.description ? data.description.trim() : null,
      visibility: data.visibility || 'PRIVATE',
    });

    const saved = await this.ormRepository.save(entity);
    return SquadMapper.toDomain(saved);
  }

  async save(squad: Squad): Promise<Squad> {
    const entity = SquadMapper.toPersistence(squad);
    const updated = await this.ormRepository.save(entity);
    const fetched = await this.findById(updated.id);
    return fetched || SquadMapper.toDomain(updated);
  }

  async delete(id: string): Promise<void> {
    await this.ormRepository.delete({ id });
  }
}
