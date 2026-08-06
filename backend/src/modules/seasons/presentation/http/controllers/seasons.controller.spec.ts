import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { SeasonsController } from './seasons.controller';
import { SEASON_READ_REPOSITORY } from '../../../application/ports/season-read.repository';
import { SeasonOrmEntity } from '../../../infrastructure/persistence/typeorm/entities/season.orm-entity';
import { CompetitionOrmEntity } from 'src/modules/competitions/infrastructure/persistence/typeorm/entities/competition.orm-entity';

describe('SeasonsController', () => {
  let controller: SeasonsController;
  let mockSeasonRepo: {
    findAll: jest.Mock;
    findById: jest.Mock;
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
    seasonTeams: [],
  };

  beforeEach(async () => {
    mockSeasonRepo = {
      findAll: jest.fn(),
      findById: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [SeasonsController],
      providers: [
        {
          provide: SEASON_READ_REPOSITORY,
          useValue: mockSeasonRepo,
        },
      ],
    }).compile();

    controller = module.get<SeasonsController>(SeasonsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('findAll', () => {
    it('should return an array of seasons', async () => {
      mockSeasonRepo.findAll.mockResolvedValue([sampleSeason]);

      const result = await controller.findAll();

      expect(result).toEqual([sampleSeason]);
      expect(mockSeasonRepo.findAll).toHaveBeenCalledTimes(1);
    });
  });

  describe('findOne', () => {
    it('should return a season by id', async () => {
      mockSeasonRepo.findById.mockResolvedValue(sampleSeason);

      const result = await controller.findOne('season-uuid-1');

      expect(result).toEqual(sampleSeason);
      expect(mockSeasonRepo.findById).toHaveBeenCalledWith('season-uuid-1');
    });

    it('should throw NotFoundException when season is not found', async () => {
      mockSeasonRepo.findById.mockResolvedValue(null);

      await expect(controller.findOne('non-existent-id')).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
