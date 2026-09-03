import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { DataSyncLogOrmEntity } from '../entities/data-sync-log.orm-entity';
import {
  DataSyncLogRepository,
  CreateDataSyncLogInput,
} from '../../../../application/ports/data-sync-log.repository';

@Injectable()
export class TypeOrmDataSyncLogRepository implements DataSyncLogRepository {
  constructor(
    @InjectRepository(DataSyncLogOrmEntity)
    private readonly repository: Repository<DataSyncLogOrmEntity>,
  ) {}

  async create(input: CreateDataSyncLogInput): Promise<DataSyncLogOrmEntity> {
    const log = this.repository.create({
      jobId: input.jobId,
      level: input.level,
      entityType: input.entityType ?? null,
      externalId: input.externalId ?? null,
      message: input.message,
      details: input.details ?? null,
    });

    return this.repository.save(log);
  }

  async createBatch(
    inputs: CreateDataSyncLogInput[],
  ): Promise<DataSyncLogOrmEntity[]> {
    if (!inputs || inputs.length === 0) {
      return [];
    }

    const logs = inputs.map((input) =>
      this.repository.create({
        jobId: input.jobId,
        level: input.level,
        entityType: input.entityType ?? null,
        externalId: input.externalId ?? null,
        message: input.message,
        details: input.details ?? null,
      }),
    );

    return this.repository.save(logs);
  }

  async findByJobId(jobId: string): Promise<DataSyncLogOrmEntity[]> {
    return this.repository.find({
      where: { jobId },
      order: { createdAt: 'ASC' },
    });
  }
}
