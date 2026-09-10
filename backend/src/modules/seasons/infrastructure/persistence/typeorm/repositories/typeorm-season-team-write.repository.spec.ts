import { Repository } from 'typeorm';
import { TypeOrmSeasonTeamWriteRepository } from './typeorm-season-team-write.repository';
import { SeasonTeamOrmEntity } from '../entities/season-team.orm-entity';

describe('TypeOrmSeasonTeamWriteRepository', () => {
  let repository: TypeOrmSeasonTeamWriteRepository;
  let mockOrmRepository: jest.Mocked<Repository<SeasonTeamOrmEntity>>;

  const mockSeasonId = 'season-uuid-1';
  const mockTeamId1 = 'team-uuid-1';
  const mockTeamId2 = 'team-uuid-2';

  const mockSeasonTeamEntity: SeasonTeamOrmEntity = {
    seasonId: mockSeasonId,
    teamId: mockTeamId1,
    createdAt: new Date(),
    season: null as any,
    team: null as any,
  };

  beforeEach(() => {
    mockOrmRepository = {
      findOne: jest.fn(),
      find: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
      delete: jest.fn(),
    } as any;

    repository = new TypeOrmSeasonTeamWriteRepository(mockOrmRepository);
  });

  it('should insert new season_team record when not found', async () => {
    mockOrmRepository.findOne.mockResolvedValue(null);
    mockOrmRepository.create.mockReturnValue(mockSeasonTeamEntity);
    mockOrmRepository.save.mockResolvedValue(mockSeasonTeamEntity);

    const result = await repository.addTeamToSeason(mockSeasonId, mockTeamId1);

    expect(mockOrmRepository.findOne).toHaveBeenCalledWith({
      where: { seasonId: mockSeasonId, teamId: mockTeamId1 },
    });
    expect(mockOrmRepository.create).toHaveBeenCalledWith({
      seasonId: mockSeasonId,
      teamId: mockTeamId1,
    });
    expect(mockOrmRepository.save).toHaveBeenCalledWith(mockSeasonTeamEntity);
    expect(result).toBe(mockSeasonTeamEntity);
  });

  it('should return existing record idempotently without creating duplicate', async () => {
    mockOrmRepository.findOne.mockResolvedValue(mockSeasonTeamEntity);

    const result = await repository.addTeamToSeason(mockSeasonId, mockTeamId1);

    expect(mockOrmRepository.create).not.toHaveBeenCalled();
    expect(mockOrmRepository.save).not.toHaveBeenCalled();
    expect(result).toBe(mockSeasonTeamEntity);
  });

  it('should add multiple teams to season and deduplicate teamIds', async () => {
    mockOrmRepository.findOne.mockResolvedValue(null);
    mockOrmRepository.create.mockImplementation(
      (e) => e as SeasonTeamOrmEntity,
    );
    mockOrmRepository.save.mockImplementation(
      async (e) => e as SeasonTeamOrmEntity,
    );

    const results = await repository.addTeamsToSeason(mockSeasonId, [
      mockTeamId1,
      mockTeamId1, // duplicate
      mockTeamId2,
    ]);

    expect(results).toHaveLength(2);
    expect(results[0].teamId).toBe(mockTeamId1);
    expect(results[1].teamId).toBe(mockTeamId2);
  });

  it('should remove team from season', async () => {
    mockOrmRepository.delete.mockResolvedValue({ affected: 1, raw: [] });

    await repository.removeTeamFromSeason(mockSeasonId, mockTeamId1);

    expect(mockOrmRepository.delete).toHaveBeenCalledWith({
      seasonId: mockSeasonId,
      teamId: mockTeamId1,
    });
  });

  it('should find all teams by seasonId', async () => {
    mockOrmRepository.find.mockResolvedValue([mockSeasonTeamEntity]);

    const results = await repository.findBySeasonId(mockSeasonId);

    expect(mockOrmRepository.find).toHaveBeenCalledWith({
      where: { seasonId: mockSeasonId },
    });
    expect(results).toEqual([mockSeasonTeamEntity]);
  });
});
