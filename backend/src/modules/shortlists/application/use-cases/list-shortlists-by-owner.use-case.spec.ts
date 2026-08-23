import { ListShortlistsByOwnerUseCase } from './list-shortlists-by-owner.use-case';
import { ShortlistRepository } from '../../domain/repositories/shortlist.repository';
import { Shortlist } from '../../domain/entities/shortlist';

describe('ListShortlistsByOwnerUseCase (Unit)', () => {
  let useCase: ListShortlistsByOwnerUseCase;
  let mockRepository: jest.Mocked<ShortlistRepository>;

  beforeEach(() => {
    mockRepository = {
      create: jest.fn(),
      findById: jest.fn(),
      findByOwner: jest.fn(),
      save: jest.fn(),
      delete: jest.fn(),
    };
    useCase = new ListShortlistsByOwnerUseCase(mockRepository);
  });

  it('should return all shortlists belonging to the owner', async () => {
    const list = [
      new Shortlist('sl-1', 'user-1', 'List 1'),
      new Shortlist('sl-2', 'user-1', 'List 2'),
    ];
    mockRepository.findByOwner.mockResolvedValue(list);

    const result = await useCase.execute('user-1');
    expect(result).toEqual(list);
    expect(mockRepository.findByOwner).toHaveBeenCalledWith('user-1');
  });
});
