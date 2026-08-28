import { GetSquadByIdUseCase } from './get-squad-by-id.use-case';
import { SquadRepository } from '../../domain/repositories/squad.repository';
import { Squad } from '../../domain/entities/squad';
import { SquadNotFoundError } from '../../domain/errors/squad.errors';

describe('GetSquadByIdUseCase', () => {
  let useCase: GetSquadByIdUseCase;
  let mockSquadRepository: jest.Mocked<SquadRepository>;

  beforeEach(() => {
    mockSquadRepository = {
      findById: jest.fn(),
      findByOwner: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
      delete: jest.fn(),
    };
    useCase = new GetSquadByIdUseCase(mockSquadRepository);
  });

  it('should return squad if it exists and belongs to owner', async () => {
    const squad = new Squad(
      'squad-1',
      'owner-1',
      'My Squad',
      '4-3-3',
    );
    mockSquadRepository.findById.mockResolvedValue(squad);

    const result = await useCase.execute({ id: 'squad-1', ownerId: 'owner-1' });
    expect(result).toBe(squad);
  });

  it('should throw SquadNotFoundError if squad not found', async () => {
    mockSquadRepository.findById.mockResolvedValue(null);

    await expect(
      useCase.execute({ id: 'squad-1', ownerId: 'owner-1' }),
    ).rejects.toThrow(SquadNotFoundError);
  });

  it('should throw SquadNotFoundError if squad belongs to another user', async () => {
    const squad = new Squad(
      'squad-1',
      'owner-2',
      'Another User Squad',
      '4-3-3',
    );
    mockSquadRepository.findById.mockResolvedValue(squad);

    await expect(
      useCase.execute({ id: 'squad-1', ownerId: 'owner-1' }),
    ).rejects.toThrow(SquadNotFoundError);
  });
});
