import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ShortlistRepository } from '../../../../domain/repositories/shortlist.repository';
import {
  Shortlist,
  ShortlistVisibility,
} from '../../../../domain/entities/shortlist';
import { ShortlistOrmEntity } from '../entities/shortlist.orm-entity';
import { ShortlistMapper } from '../mappers/shortlist.mapper';

@Injectable()
export class TypeOrmShortlistRepository implements ShortlistRepository {
  constructor(
    @InjectRepository(ShortlistOrmEntity)
    private readonly ormRepository: Repository<ShortlistOrmEntity>,
  ) {}

  async findById(id: string): Promise<Shortlist | null> {
    const entity = await this.ormRepository.findOne({
      where: { id },
    });

    return entity ? ShortlistMapper.toDomain(entity) : null;
  }

  async findByOwner(ownerId: string): Promise<Shortlist[]> {
    const entities = await this.ormRepository.find({
      where: { ownerId },
      order: { updatedAt: 'DESC' },
    });

    return entities.map((e) => ShortlistMapper.toDomain(e));
  }

  async create(data: {
    ownerId: string;
    name: string;
    description?: string | null;
    visibility?: ShortlistVisibility;
  }): Promise<Shortlist> {
    const entity = this.ormRepository.create({
      ownerId: data.ownerId,
      name: data.name.trim(),
      description: data.description ? data.description.trim() : null,
      visibility: data.visibility || 'PRIVATE',
    });

    const saved = await this.ormRepository.save(entity);
    return ShortlistMapper.toDomain(saved);
  }

  async save(shortlist: Shortlist): Promise<Shortlist> {
    const entity = ShortlistMapper.toPersistence(shortlist);
    const updated = await this.ormRepository.save(entity);
    const fetched = await this.findById(updated.id);
    return fetched || ShortlistMapper.toDomain(updated);
  }

  async delete(id: string): Promise<void> {
    await this.ormRepository.delete({ id });
  }
}
