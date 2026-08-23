import { CreateShortlistUseCase } from './create-shortlist.use-case';
import { ShortlistRepository } from '../../domain/repositories/shortlist.repository';
import { Shortlist } from '../../domain/entities/shortlist';

describe('CreateShortlistUseCase (Unit)', () => {
  let useCase: CreateShortlistUseCase;
  let mockRepository: jest.Mocked<ShortlistRepository>;

  beforeEach(() => {
    mockRepository = {
      create: jest.fn(),
      findById: jest.fn(),
      findByOwner: jest.fn(),
      save: jest.fn(),
      delete: jest.fn(),
    };
    useCase = new CreateShortlistUseCase(mockRepository);
  });

  it('should create a shortlist for the given owner', async () => {
    const createdShortlist = new Shortlist(
      'sl-1',
      'user-1',
      'U21 Talents',
      'Description',
      'PRIVATE',
      new Date(),
      new Date(),
    );

    mockRepository.create.mockResolvedValue(createdShortlist);

    const result = await useCase.execute({
      ownerId: 'user-1',
      name: 'U21 Talents',
      description: 'Description',
      visibility: 'PRIVATE',
    });

    expect(result).toBe(createdShortlist);
    expect(mockRepository.create).toHaveBeenCalledWith({
      ownerId: 'user-1',
      name: 'U21 Talents',
      description: 'Description',
      visibility: 'PRIVATE',
    });
  });
});
