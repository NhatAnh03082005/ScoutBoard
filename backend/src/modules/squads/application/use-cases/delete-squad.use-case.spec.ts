import { DeleteSquadUseCase } from './delete-squad.use-case';
import { SquadRepository } from '../../domain/repositories/squad.repository';
import { Squad } from '../../domain/entities/squad';
import { SquadNotFoundError } from '../../domain/errors/squad.errors';

describe('DeleteSquadUseCase', () => {
  let useCase: DeleteSquadUseCase;
  let mockSquadRepository: jest.Mocked<SquadRepository>;

  beforeEach(() => {
    mockSquadRepository = {
      findById: jest.fn(),
      findByOwner: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
      delete: jest.fn(),
    };
    useCase = new DeleteSquadUseCase(mockSquadRepository);
  });

  it('should delete squad when owner matches', async () => {
    const squad = new Squad('squad-1', 'owner-1', 'Name', '4-3-3');
    mockSquadRepository.findById.mockResolvedValue(squad);

    await useCase.execute({ id: 'squad-1', ownerId: 'owner-1' });

    expect(mockSquadRepository.delete).toHaveBeenCalledWith('squad-1');
  });

  it('should throw SquadNotFoundError when squad does not exist', async () => {
    mockSquadRepository.findById.mockResolvedValue(null);

    await expect(
      useCase.execute({ id: 'squad-1', ownerId: 'owner-1' }),
    ).rejects.toThrow(SquadNotFoundError);
  });

  it('should throw SquadNotFoundError when squad belongs to another user', async () => {
    const squad = new Squad('squad-1', 'owner-2', 'Name', '4-3-3');
    mockSquadRepository.findById.mockResolvedValue(squad);

    await expect(
      useCase.execute({ id: 'squad-1', ownerId: 'owner-1' }),
    ).rejects.toThrow(SquadNotFoundError);
  });
});
