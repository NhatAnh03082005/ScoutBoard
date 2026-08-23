import { GetShortlistByIdUseCase } from './get-shortlist-by-id.use-case';
import { ShortlistRepository } from '../../domain/repositories/shortlist.repository';
import { Shortlist } from '../../domain/entities/shortlist';
import { ShortlistNotFoundError } from '../../domain/errors/shortlist.errors';

describe('GetShortlistByIdUseCase (Unit)', () => {
  let useCase: GetShortlistByIdUseCase;
  let mockRepository: jest.Mocked<ShortlistRepository>;

  beforeEach(() => {
    mockRepository = {
      create: jest.fn(),
      findById: jest.fn(),
      findByOwner: jest.fn(),
      save: jest.fn(),
      delete: jest.fn(),
    };
    useCase = new GetShortlistByIdUseCase(mockRepository);
  });

  it('should return shortlist when id exists and belongs to the owner', async () => {
    const shortlist = new Shortlist('sl-1', 'user-1', 'U21 Talents');
    mockRepository.findById.mockResolvedValue(shortlist);

    const result = await useCase.execute({ id: 'sl-1', ownerId: 'user-1' });
    expect(result).toBe(shortlist);
  });

  it('should throw ShortlistNotFoundError when shortlist does not exist', async () => {
    mockRepository.findById.mockResolvedValue(null);

    await expect(
      useCase.execute({ id: 'non-existent', ownerId: 'user-1' }),
    ).rejects.toThrow(ShortlistNotFoundError);
  });

  it('should throw ShortlistNotFoundError when shortlist belongs to another owner', async () => {
    const shortlist = new Shortlist('sl-1', 'user-2', 'U21 Talents');
    mockRepository.findById.mockResolvedValue(shortlist);

    await expect(
      useCase.execute({ id: 'sl-1', ownerId: 'user-1' }),
    ).rejects.toThrow(ShortlistNotFoundError);
  });
});
