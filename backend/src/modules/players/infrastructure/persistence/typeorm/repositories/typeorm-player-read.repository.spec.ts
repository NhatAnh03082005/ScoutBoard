import { Repository, SelectQueryBuilder } from 'typeorm';
import { TypeOrmPlayerReadRepository } from './typeorm-player-read.repository';
import { PlayerOrmEntity } from '../entities/player.orm-entity';
import { PreferredFoot } from 'src/modules/players/domain/enums/preferred-foot.enum';

describe('TypeOrmPlayerReadRepository (Unit)', () => {
  let repository: TypeOrmPlayerReadRepository;
  let mockOrmRepository: jest.Mocked<Partial<Repository<PlayerOrmEntity>>>;
  let mockQueryBuilder: jest.Mocked<
    Partial<SelectQueryBuilder<PlayerOrmEntity>>
  >;

  beforeEach(() => {
    mockQueryBuilder = {
      leftJoinAndSelect: jest.fn().mockReturnThis(),
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

  it('should apply nationality filter with exact case-insensitive comparison (LOWER)', async () => {
    await repository.search({
      nationality: '  Brazil  ',
      limit: 20,
      offset: 0,
    });

    expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
      'LOWER(player.nationality) = LOWER(:nationality)',
      { nationality: 'Brazil' },
    );
  });

  it('should combine multiple filters with AND (search OR in parentheses)', async () => {
    await repository.search({
      search: 'martin',
      preferredFoot: PreferredFoot.RIGHT,
      nationality: 'Brazil',
      limit: 10,
      offset: 0,
    });

    expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
      '(player.name ILIKE :search OR player.shortName ILIKE :search)',
      { search: '%martin%' },
    );
    expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
      'player.preferredFoot = :preferredFoot',
      { preferredFoot: PreferredFoot.RIGHT },
    );
    expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
      'LOWER(player.nationality) = LOWER(:nationality)',
      { nationality: 'Brazil' },
    );
  });
});
