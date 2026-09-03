import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { DataSyncJobOrmEntity } from '../entities/data-sync-job.orm-entity';
import {
  DataSyncJobRepository,
  CreateDataSyncJobInput,
  UpdateDataSyncJobInput,
  FindActiveJobParams,
  ListJobsParams,
} from '../../../../application/ports/data-sync-job.repository';
import { SyncJobStatus } from '../../../../domain/enums/sync-job-status.enum';

@Injectable()
export class TypeOrmDataSyncJobRepository implements DataSyncJobRepository {
  constructor(
    @InjectRepository(DataSyncJobOrmEntity)
    private readonly repository: Repository<DataSyncJobOrmEntity>,
  ) {}

  async create(input: CreateDataSyncJobInput): Promise<DataSyncJobOrmEntity> {
    const job = this.repository.create({
      initiatedBy: input.initiatedBy ?? null,
      competitionId: input.competitionId,
      seasonId: input.seasonId,
      provider: input.provider ?? 'FOOTBALL_DATA_ORG',
      status: input.status ?? SyncJobStatus.PENDING,
      triggerType: input.triggerType,
      scope: input.scope,
      target: input.target,
      mode: input.mode,
      metadata: input.metadata ?? null,
    });

    return this.repository.save(job);
  }

  async update(
    id: string,
    input: UpdateDataSyncJobInput,
  ): Promise<DataSyncJobOrmEntity> {
    const existing = await this.repository.findOne({ where: { id } });
    if (!existing) {
      throw new NotFoundException(`DataSyncJob with ID ${id} not found`);
    }

    if (input.status !== undefined) existing.status = input.status;
    if (input.processedCount !== undefined)
      existing.processedCount = input.processedCount;
    if (input.createdCount !== undefined)
      existing.createdCount = input.createdCount;
    if (input.updatedCount !== undefined)
      existing.updatedCount = input.updatedCount;
    if (input.failedCount !== undefined)
      existing.failedCount = input.failedCount;
    if (input.startedAt !== undefined) existing.startedAt = input.startedAt;
    if (input.completedAt !== undefined)
      existing.completedAt = input.completedAt;
    if (input.errorMessage !== undefined)
      existing.errorMessage = input.errorMessage;
    if (input.metadata !== undefined) existing.metadata = input.metadata;

    return this.repository.save(existing);
  }

  async findById(id: string): Promise<DataSyncJobOrmEntity | null> {
    return this.repository.findOne({
      where: { id },
      relations: ['user', 'competition', 'season', 'logs'],
      order: {
        logs: {
          createdAt: 'ASC',
        },
      },
    });
  }

  async findActiveJob(
    params: FindActiveJobParams,
  ): Promise<DataSyncJobOrmEntity | null> {
    const query = this.repository
      .createQueryBuilder('job')
      .where('job.competitionId = :competitionId', {
        competitionId: params.competitionId,
      })
      .andWhere('job.seasonId = :seasonId', { seasonId: params.seasonId })
      .andWhere('job.status IN (:...statuses)', {
        statuses: [SyncJobStatus.PENDING, SyncJobStatus.RUNNING],
      });

    if (params.target) {
      query.andWhere('job.target = :target', { target: params.target });
    }

    if (params.scope) {
      query.andWhere('job.scope = :scope', { scope: params.scope });
    }

    return query.getOne();
  }

  async listJobs(
    params?: ListJobsParams,
  ): Promise<[DataSyncJobOrmEntity[], number]> {
    const limit = params?.limit ?? 20;
    const offset = params?.offset ?? 0;

    const where: any = {};
    if (params?.status) {
      where.status = params.status;
    }
    if (params?.competitionId) {
      where.competitionId = params.competitionId;
    }
    if (params?.seasonId) {
      where.seasonId = params.seasonId;
    }

    return this.repository.findAndCount({
      where: Object.keys(where).length > 0 ? where : undefined,
      relations: ['user', 'competition', 'season'],
      order: { createdAt: 'DESC' },
      take: limit,
      skip: offset,
    });
  }
}
