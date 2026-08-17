import { Repository, SelectQueryBuilder } from 'typeorm';
import { TypeOrmPlayerReadRepository } from './typeorm-player-read.repository';
import { PlayerOrmEntity } from '../entities/player.orm-entity';
import { PreferredFoot } from 'src/modules/players/domain/enums/preferred-foot.enum';
import { ComparisonScope } from 'src/modules/players/domain/enums/comparison-scope.enum';

describe('TypeOrmPlayerReadRepository (Unit)', () => {
  let repository: TypeOrmPlayerReadRepository;
  let mockOrmRepository: jest.Mocked<Partial<Repository<PlayerOrmEntity>>>;
  let mockQueryBuilder: jest.Mocked<
    Partial<SelectQueryBuilder<PlayerOrmEntity>>
  >;

  beforeEach(() => {
    mockQueryBuilder = {
      leftJoinAndSelect: jest.fn().mockReturnThis(),
      innerJoin: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      addOrderBy: jest.fn().mockReturnThis(),
      take: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      getManyAndCount: jest.fn().mockResolvedValue([[], 0]),
    };

    mockOrmRepository = {
      findOne: jest.fn(),
      createQueryBuilder: jest.fn().mockReturnValue(mockQueryBuilder),
    };

    repository = new TypeOrmPlayerReadRepository(
      mockOrmRepository as Repository<PlayerOrmEntity>,
    );
  });

  it('should build default query with LEFT JOIN currentTeam and stable order (name ASC, id ASC)', async () => {
    await repository.search({ limit: 20, offset: 0 });

    expect(mockOrmRepository.createQueryBuilder).toHaveBeenCalledWith('player');
    expect(mockQueryBuilder.leftJoinAndSelect).toHaveBeenCalledWith(
      'player.currentTeam',
      'currentTeam',
    );
    expect(mockQueryBuilder.orderBy).toHaveBeenCalledWith('player.name', 'ASC');
    expect(mockQueryBuilder.addOrderBy).toHaveBeenCalledWith(
      'player.id',
      'ASC',
    );
    expect(mockQueryBuilder.take).toHaveBeenCalledWith(20);
    expect(mockQueryBuilder.skip).toHaveBeenCalledWith(0);
  });

  it('should apply ILIKE search with parameter binding when search string is provided', async () => {
    await repository.search({ search: '  Martin  ', limit: 10, offset: 0 });

    expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
      '(player.name ILIKE :search OR player.shortName ILIKE :search)',
      { search: '%Martin%' },
    );
    expect(mockQueryBuilder.take).toHaveBeenCalledWith(10);
  });

  it('should apply preferredFoot filter when provided', async () => {
    await repository.search({
      preferredFoot: PreferredFoot.LEFT,
      limit: 20,
      offset: 0,
    });

    expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
      'player.preferredFoot = :preferredFoot',
      { preferredFoot: PreferredFoot.LEFT },
    );
  });

  it('should apply currentTeamId filter when provided', async () => {
    await repository.search({
      currentTeamId: '1eaece5e-59e9-4a16-b521-bec5c13845b3',
      limit: 20,
      offset: 0,
    });

    expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
      'player.currentTeamId = :currentTeamId',
      { currentTeamId: '1eaece5e-59e9-4a16-b521-bec5c13845b3' },
    );
  });

  it('should innerJoin player.positions ONLY when position filter is provided', async () => {
    await repository.search({ position: 'LW', limit: 20, offset: 0 });

    expect(mockQueryBuilder.innerJoin).toHaveBeenCalledWith(
      'player.positions',
      'pos',
    );
    expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
      '(player.primaryPosition = :posCode OR pos.positionCode = :posCode)',
      { posCode: 'LW' },
    );
  });

  it('should apply subquery for currentSeasonId when competition is resolved', async () => {
    await repository.search({
      currentSeasonId: 'season-2025-uuid',
      limit: 20,
      offset: 0,
    });

    expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
      'player.currentTeamId IN (SELECT st.team_id FROM season_teams st WHERE st.season_id = :currentSeasonId)',
      { currentSeasonId: 'season-2025-uuid' },
    );
  });

  it('should apply age range filters relative to CURRENT_DATE', async () => {
    await repository.search({ minAge: 18, maxAge: 25, limit: 20, offset: 0 });

    expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
      'EXTRACT(YEAR FROM age(CURRENT_DATE, player.date_of_birth)) >= :minAge',
      { minAge: 18 },
    );
    expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
      'EXTRACT(YEAR FROM age(CURRENT_DATE, player.date_of_birth)) <= :maxAge',
      { maxAge: 25 },
    );
  });

  it('should apply height range filters', async () => {
    await repository.search({
      minHeightCm: 175,
      maxHeightCm: 190,
      limit: 20,
      offset: 0,
    });

    expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
      'player.heightCm >= :minHeightCm',
      { minHeightCm: 175 },
    );
    expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
      'player.heightCm <= :maxHeightCm',
      { maxHeightCm: 190 },
    );
  });

  describe('findComparisonCandidates', () => {
    it('should filter by season_id, competition_id and exclude currentPlayerId in COMPETITION scope', async () => {
      await repository.findComparisonCandidates('saka-id', {
        scope: ComparisonScope.COMPETITION,
        seasonId: 'season-1',
        competitionId: 'comp-1',
        limit: 20,
        offset: 0,
      });

      expect(mockOrmRepository.createQueryBuilder).toHaveBeenCalledWith('player');
      expect(mockQueryBuilder.innerJoin).toHaveBeenCalledWith(
        'player_season_statistics',
        'pss',
        'pss.player_id = player.id',
      );
      expect(mockQueryBuilder.where).toHaveBeenCalledWith(
        'player.id != :currentPlayerId',
        { currentPlayerId: 'saka-id' },
      );
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'pss.season_id = :seasonId AND pss.competition_id = :competitionId',
        {
          seasonId: 'season-1',
          competitionId: 'comp-1',
        },
      );
    });

    it('should filter by season_id only in ALL scope', async () => {
      await repository.findComparisonCandidates('saka-id', {
        scope: ComparisonScope.ALL,
        seasonId: 'season-1',
        limit: 10,
        offset: 0,
      });

      expect(mockQueryBuilder.where).toHaveBeenCalledWith(
        'player.id != :currentPlayerId',
        { currentPlayerId: 'saka-id' },
      );
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'pss.season_id IN (SELECT s.id FROM seasons s WHERE s.season_code = (SELECT s2.season_code FROM seasons s2 WHERE s2.id = :seasonId))',
        { seasonId: 'season-1' },
      );
    });
  });
});
