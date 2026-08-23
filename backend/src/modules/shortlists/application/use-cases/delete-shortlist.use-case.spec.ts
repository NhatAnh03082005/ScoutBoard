import { DeleteShortlistUseCase } from './delete-shortlist.use-case';
import { ShortlistRepository } from '../../domain/repositories/shortlist.repository';
import { Shortlist } from '../../domain/entities/shortlist';
import { ShortlistNotFoundError } from '../../domain/errors/shortlist.errors';

describe('DeleteShortlistUseCase (Unit)', () => {
  let useCase: DeleteShortlistUseCase;
  let mockRepository: jest.Mocked<ShortlistRepository>;

  beforeEach(() => {
    mockRepository = {
      create: jest.fn(),
      findById: jest.fn(),
      findByOwner: jest.fn(),
      save: jest.fn(),
      delete: jest.fn(),
    };
    useCase = new DeleteShortlistUseCase(mockRepository);
  });

  it('should delete shortlist when owned by the requester', async () => {
    const shortlist = new Shortlist('sl-1', 'user-1', 'Target Name');
    mockRepository.findById.mockResolvedValue(shortlist);
    mockRepository.delete.mockResolvedValue(undefined);

    await useCase.execute({ id: 'sl-1', ownerId: 'user-1' });
    expect(mockRepository.delete).toHaveBeenCalledWith('sl-1');
  });

  it('should throw ShortlistNotFoundError when shortlist belongs to another owner', async () => {
    const shortlist = new Shortlist('sl-1', 'user-2', 'Target Name');
    mockRepository.findById.mockResolvedValue(shortlist);

    await expect(
      useCase.execute({ id: 'sl-1', ownerId: 'user-1' }),
    ).rejects.toThrow(ShortlistNotFoundError);
    expect(mockRepository.delete).not.toHaveBeenCalled();
  });
});
