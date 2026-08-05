import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { CompetitionsController } from './competitions.controller';
import { COMPETITION_READ_REPOSITORY } from '../../../application/ports/competition-read.repository';
import { SEASON_READ_REPOSITORY } from '../../../../seasons/application/ports/season-read.repository';
import { CompetitionOrmEntity } from '../../../infrastructure/persistence/typeorm/entities/competition.orm-entity';
import { SeasonOrmEntity } from '../../../../seasons/infrastructure/persistence/typeorm/entities/season.orm-entity';

describe('CompetitionsController', () => {
  let controller: CompetitionsController;
  let mockCompetitionRepo: {
    findAll: jest.Mock;
    findById: jest.Mock;
  };
  let mockSeasonRepo: {
    findByCompetition: jest.Mock;
  };

  const sampleComp: CompetitionOrmEntity = {
    id: 'comp-uuid-1',
    externalProvider: 'FOOTBALL_DATA',
    externalId: 'PL',
    name: 'Premier League',
    country: 'England',
    type: 'LEAGUE',
    logoUrl: 'https://crests.football-data.org/PL.png',
    dataUpdatedAt: new Date(),
    createdAt: new Date(),
    updatedAt: new Date(),
    seasons: [],
    matches: [],
    seasonStatistics: [],
  };

  const sampleSeason: SeasonOrmEntity = {
    id: 'season-uuid-1',
    competitionId: 'comp-uuid-1',
    externalProvider: 'FOOTBALL_DATA',
    externalId: 'PL_2025',
    seasonCode: '2025-2026',
    name: 'Premier League 2025/26',
    startDate: '2025-08-15',
    endDate: '2026-05-24',
    isCurrent: true,
    dataUpdatedAt: new Date(),
    createdAt: new Date(),
    updatedAt: new Date(),
    competition: sampleComp,
    matches: [],
    seasonStatistics: [],
  };

  beforeEach(async () => {
    mockCompetitionRepo = {
      findAll: jest.fn(),
      findById: jest.fn(),
    };
    mockSeasonRepo = {
      findByCompetition: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [CompetitionsController],
      providers: [
        {
          provide: COMPETITION_READ_REPOSITORY,
          useValue: mockCompetitionRepo,
        },
        {
          provide: SEASON_READ_REPOSITORY,
          useValue: mockSeasonRepo,
        },
      ],
    }).compile();

    controller = module.get<CompetitionsController>(CompetitionsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('findAll', () => {
    it('should return an array of competitions', async () => {
      mockCompetitionRepo.findAll.mockResolvedValue([sampleComp]);

      const result = await controller.findAll();

      expect(result).toEqual([sampleComp]);
      expect(mockCompetitionRepo.findAll).toHaveBeenCalledTimes(1);
    });
  });

  describe('findOne', () => {
    it('should return a competition by id', async () => {
      mockCompetitionRepo.findById.mockResolvedValue(sampleComp);

      const result = await controller.findOne('comp-uuid-1');

      expect(result).toEqual(sampleComp);
      expect(mockCompetitionRepo.findById).toHaveBeenCalledWith('comp-uuid-1');
    });

    it('should throw NotFoundException when competition is not found', async () => {
      mockCompetitionRepo.findById.mockResolvedValue(null);

      await expect(controller.findOne('non-existent-id')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('findSeasonsByCompetitionId', () => {
    it('should return seasons for a valid competition id', async () => {
      mockCompetitionRepo.findById.mockResolvedValue(sampleComp);
      mockSeasonRepo.findByCompetition.mockResolvedValue([sampleSeason]);

      const result = await controller.findSeasonsByCompetitionId('comp-uuid-1');

      expect(result).toEqual([sampleSeason]);
      expect(mockCompetitionRepo.findById).toHaveBeenCalledWith('comp-uuid-1');
      expect(mockSeasonRepo.findByCompetition).toHaveBeenCalledWith(
        'comp-uuid-1',
      );
    });

    it('should throw NotFoundException if competition does not exist', async () => {
      mockCompetitionRepo.findById.mockResolvedValue(null);

      await expect(
        controller.findSeasonsByCompetitionId('non-existent-id'),
      ).rejects.toThrow(NotFoundException);
    });
  });
});
