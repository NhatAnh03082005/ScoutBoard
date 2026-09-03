import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
  ParseUUIDPipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../../../../auth/presentation/http/guards/jwt-auth.guard';
import { RolesGuard } from '../../../../auth/presentation/http/guards/roles.guard';
import { Roles } from '../../../../auth/presentation/http/decorators/roles.decorator';
import { TriggerAdminSyncDto } from '../dto/trigger-admin-sync.dto';
import { ListSyncJobsQueryDto } from '../dto/list-sync-jobs-query.dto';
import { ExecuteAdminSyncUseCase } from '../../../application/use-cases/execute-admin-sync.use-case';
import { GetDataSyncJobByIdUseCase } from '../../../application/use-cases/get-data-sync-job-by-id.use-case';
import { ListSyncJobsUseCase } from '../../../application/use-cases/list-sync-jobs.use-case';
import { ExecuteAdminSyncResult } from '../../../application/dto/execute-admin-sync.result';
import { GetDataSyncJobResult } from '../../../application/dto/get-data-sync-job.result';
import { SyncTriggerType } from '../../../domain/enums/sync-trigger-type.enum';

interface RequestWithAuthUser {
  user: {
    id: string;
    email: string;
    fullName: string;
    status: string;
    roles: string[];
  };
}

@ApiTags('Admin Data Sync')
@ApiBearerAuth()
@Controller(['admin/data-sync', 'v1/admin/data-sync'])
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
export class AdminDataSyncController {
  constructor(
    private readonly executeAdminSyncUseCase: ExecuteAdminSyncUseCase,
    private readonly getDataSyncJobByIdUseCase: GetDataSyncJobByIdUseCase,
    private readonly listSyncJobsUseCase: ListSyncJobsUseCase,
  ) {}

  @Post()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Trigger Data Synchronization',
    description:
      'Creates and executes a synchronization job for a selected competition and season scope. Restricted to ADMIN role.',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description:
      'Synchronization job executed successfully or with isolated partial errors.',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description:
      'Invalid input parameters, malformed UUIDs, or scope/target mismatch.',
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Unauthenticated user.',
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Forbidden. Requires ADMIN role.',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Competition or Season not found.',
  })
  @ApiResponse({
    status: HttpStatus.CONFLICT,
    description:
      'An equivalent synchronization job is already PENDING or RUNNING.',
  })
  async triggerSync(
    @Body() dto: TriggerAdminSyncDto,
    @Request() req: RequestWithAuthUser,
  ): Promise<ExecuteAdminSyncResult> {
    const adminUserId = req?.user?.id ?? null;

    return this.executeAdminSyncUseCase.execute({
      adminUserId,
      competitionId: dto.competitionId,
      seasonId: dto.seasonId,
      triggerType: SyncTriggerType.MANUAL,
      scope: dto.scope,
      target: dto.target,
      mode: dto.mode,
      date: dto.date,
      matchId: dto.matchId,
    });
  }

  @Get('jobs')
  @ApiOperation({
    summary: 'List Synchronization Jobs',
    description:
      'Returns a paginated list of data synchronization jobs with optional filtering by status, competition, or season.',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'List of synchronization jobs and pagination metadata.',
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Unauthenticated user.',
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Forbidden. Requires ADMIN role.',
  })
  async listJobs(@Query() query: ListSyncJobsQueryDto) {
    return this.listSyncJobsUseCase.execute({
      limit: query.limit,
      offset: query.offset,
      status: query.status,
      competitionId: query.competitionId,
      seasonId: query.seasonId,
    });
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Get Synchronization Job Details',
    description:
      'Fetches details, execution statistics, and chronological event logs for a specific sync job.',
  })
  @ApiParam({
    name: 'id',
    type: 'string',
    description: 'Job Canonical UUID',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Data sync job details and associated logs.',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Malformed Job UUID.',
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Unauthenticated user.',
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Forbidden. Requires ADMIN role.',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Data sync job not found.',
  })
  async getJobById(
    @Param(
      'id',
      new ParseUUIDPipe({
        version: '4',
        errorHttpStatusCode: HttpStatus.BAD_REQUEST,
      }),
    )
    id: string,
  ): Promise<GetDataSyncJobResult> {
    return this.getDataSyncJobByIdUseCase.execute(id);
  }
}
