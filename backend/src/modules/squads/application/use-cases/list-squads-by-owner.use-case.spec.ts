import { ListSquadsByOwnerUseCase } from './list-squads-by-owner.use-case';
import { SquadRepository } from '../../domain/repositories/squad.repository';
import { Squad } from '../../domain/entities/squad';

describe('ListSquadsByOwnerUseCase', () => {
  let useCase: ListSquadsByOwnerUseCase;
  let mockSquadRepository: jest.Mocked<SquadRepository>;

  beforeEach(() => {
    mockSquadRepository = {
      findById: jest.fn(),
      findByOwner: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
      delete: jest.fn(),
    };
    useCase = new ListSquadsByOwnerUseCase(mockSquadRepository);
  });

  it('should return list of squads for owner', async () => {
    const squads = [
      new Squad('squad-1', 'owner-1', 'Squad 1', '4-3-3'),
      new Squad('squad-2', 'owner-1', 'Squad 2', '4-2-3-1'),
    ];
    mockSquadRepository.findByOwner.mockResolvedValue(squads);

    const result = await useCase.execute('owner-1');
    expect(mockSquadRepository.findByOwner).toHaveBeenCalledWith('owner-1');
    expect(result).toBe(squads);
  });
});
