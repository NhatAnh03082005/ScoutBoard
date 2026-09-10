import { BadRequestException } from '@nestjs/common';
import { PersistTeamUseCase } from './persist-team.use-case';
import { TeamWriteRepository } from '../ports/team-write.repository';
import { TransformedTeam } from '../../../external-football/domain/models/transformed-team.model';
import { TeamOrmEntity } from '../../infrastructure/persistence/typeorm/entities/team.orm-entity';

describe('PersistTeamUseCase', () => {
  let useCase: PersistTeamUseCase;
  let mockRepository: jest.Mocked<TeamWriteRepository>;

  const mockTransformedTeam: TransformedTeam = {
    externalProvider: 'FOOTBALL_DATA_ORG',
    externalId: '66',
    name: 'Manchester United FC',
    shortName: 'Man United',
    tla: 'MUN',
    country: 'England',
    foundedYear: 1878,
    venueName: 'Old Trafford',
    logoUrl: 'https://crests.football-data.org/66.png',
    status: 'ACTIVE',
    dataUpdatedAt: null,
    squad: [],
  };

  const mockTeamEntity: TeamOrmEntity = {
    id: 'team-uuid-1',
    ...mockTransformedTeam,
    createdAt: new Date(),
    updatedAt: new Date(),
    players: [],
    teamHistory: [],
    homeMatches: [],
    awayMatches: [],
    matchStatistics: [],
    seasonStatistics: [],
    seasonTeams: [],
  };

  beforeEach(() => {
    mockRepository = {
      findByExternalIdentity: jest.fn(),
      upsert: jest.fn().mockResolvedValue(mockTeamEntity),
      upsertMany: jest.fn().mockResolvedValue([mockTeamEntity]),
    };

    useCase = new PersistTeamUseCase(mockRepository);
  });

  it('should persist a valid transformed team', async () => {
    const result = await useCase.execute(mockTransformedTeam);

    expect(mockRepository.upsert).toHaveBeenCalledWith(mockTransformedTeam);
    expect(result).toBe(mockTeamEntity);
  });

  it('should persist an array of transformed teams', async () => {
    const result = await useCase.executeMany([mockTransformedTeam]);

    expect(mockRepository.upsertMany).toHaveBeenCalledWith([
      mockTransformedTeam,
    ]);
    expect(result).toEqual([mockTeamEntity]);
  });

  it('should return empty array when executeMany receives empty list', async () => {
    const result = await useCase.executeMany([]);

    expect(result).toEqual([]);
    expect(mockRepository.upsertMany).not.toHaveBeenCalled();
  });

  it('should reject invalid input missing required fields', async () => {
    await expect(useCase.execute(null as any)).rejects.toThrow(
      BadRequestException,
    );
    await expect(
      useCase.execute({ ...mockTransformedTeam, externalProvider: '' }),
    ).rejects.toThrow(BadRequestException);
    await expect(
      useCase.execute({ ...mockTransformedTeam, externalId: '  ' }),
    ).rejects.toThrow(BadRequestException);
    await expect(
      useCase.execute({ ...mockTransformedTeam, name: '' }),
    ).rejects.toThrow(BadRequestException);
  });
});
