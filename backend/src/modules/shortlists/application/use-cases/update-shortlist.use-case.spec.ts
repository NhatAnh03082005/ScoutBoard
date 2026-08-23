import { UpdateShortlistUseCase } from './update-shortlist.use-case';
import { ShortlistRepository } from '../../domain/repositories/shortlist.repository';
import { Shortlist } from '../../domain/entities/shortlist';
import { ShortlistNotFoundError } from '../../domain/errors/shortlist.errors';

describe('UpdateShortlistUseCase (Unit)', () => {
  let useCase: UpdateShortlistUseCase;
  let mockRepository: jest.Mocked<ShortlistRepository>;

  beforeEach(() => {
    mockRepository = {
      create: jest.fn(),
      findById: jest.fn(),
      findByOwner: jest.fn(),
      save: jest.fn(),
      delete: jest.fn(),
    };
    useCase = new UpdateShortlistUseCase(mockRepository);
  });

  it('should update name, description and visibility for owned shortlist', async () => {
    const shortlist = new Shortlist('sl-1', 'user-1', 'Old Name', 'Old Desc', 'PRIVATE');
    mockRepository.findById.mockResolvedValue(shortlist);
    mockRepository.save.mockImplementation(async (s) => s);

    const result = await useCase.execute({
      id: 'sl-1',
      ownerId: 'user-1',
      name: 'New Name',
      description: 'New Desc',
      visibility: 'PUBLIC',
    });

    expect(result.getName()).toBe('New Name');
    expect(result.getDescription()).toBe('New Desc');
    expect(result.getVisibility()).toBe('PUBLIC');
    expect(mockRepository.save).toHaveBeenCalled();
  });

  it('should throw ShortlistNotFoundError when shortlist belongs to another owner', async () => {
    const shortlist = new Shortlist('sl-1', 'user-2', 'Old Name');
    mockRepository.findById.mockResolvedValue(shortlist);

    await expect(
      useCase.execute({
        id: 'sl-1',
        ownerId: 'user-1',
        name: 'Hacked Name',
      }),
    ).rejects.toThrow(ShortlistNotFoundError);
  });
});
