import { CreateSquadUseCase } from './create-squad.use-case';
import { SquadRepository } from '../../domain/repositories/squad.repository';
import { Squad } from '../../domain/entities/squad';

describe('CreateSquadUseCase', () => {
  let useCase: CreateSquadUseCase;
  let mockSquadRepository: jest.Mocked<SquadRepository>;

  beforeEach(() => {
    mockSquadRepository = {
      findById: jest.fn(),
      findByOwner: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
      delete: jest.fn(),
    };
    useCase = new CreateSquadUseCase(mockSquadRepository);
  });

  it('should create and return a squad', async () => {
    const expectedSquad = new Squad(
      'squad-1',
      'owner-1',
      'Test Squad',
      '4-3-3',
      'season-1',
      'Desc',
      'PRIVATE',
    );

    mockSquadRepository.create.mockResolvedValue(expectedSquad);

    const result = await useCase.execute({
      ownerId: 'owner-1',
      name: 'Test Squad',
      formationCode: '4-3-3',
      seasonId: 'season-1',
      description: 'Desc',
      visibility: 'PRIVATE',
    });

    expect(mockSquadRepository.create).toHaveBeenCalledWith({
      ownerId: 'owner-1',
      name: 'Test Squad',
      formationCode: '4-3-3',
      seasonId: 'season-1',
      description: 'Desc',
      visibility: 'PRIVATE',
    });
    expect(result).toBe(expectedSquad);
  });
});
