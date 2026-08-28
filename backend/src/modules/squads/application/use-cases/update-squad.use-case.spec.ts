import { UpdateSquadUseCase } from './update-squad.use-case';
import { SquadRepository } from '../../domain/repositories/squad.repository';
import { Squad } from '../../domain/entities/squad';
import { SquadNotFoundError } from '../../domain/errors/squad.errors';

describe('UpdateSquadUseCase', () => {
  let useCase: UpdateSquadUseCase;
  let mockSquadRepository: jest.Mocked<SquadRepository>;

  beforeEach(() => {
    mockSquadRepository = {
      findById: jest.fn(),
      findByOwner: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
      delete: jest.fn(),
    };
    useCase = new UpdateSquadUseCase(mockSquadRepository);
  });

  it('should update and save squad', async () => {
    const squad = new Squad(
      'squad-1',
      'owner-1',
      'Old Name',
      '4-3-3',
      'season-1',
      'Old desc',
      'PRIVATE',
    );
    mockSquadRepository.findById.mockResolvedValue(squad);
    mockSquadRepository.save.mockImplementation(async (s) => s);

    const result = await useCase.execute({
      id: 'squad-1',
      ownerId: 'owner-1',
      name: 'New Name',
      formationCode: '4-2-3-1',
      seasonId: 'season-2',
      description: 'New desc',
      visibility: 'PUBLIC',
    });

    expect(result.getName()).toBe('New Name');
    expect(result.getFormationCode()).toBe('4-2-3-1');
    expect(result.getSeasonId()).toBe('season-2');
    expect(result.getDescription()).toBe('New desc');
    expect(result.getVisibility()).toBe('PUBLIC');
    expect(mockSquadRepository.save).toHaveBeenCalledWith(squad);
  });

  it('should throw SquadNotFoundError if squad not found', async () => {
    mockSquadRepository.findById.mockResolvedValue(null);

    await expect(
      useCase.execute({
        id: 'squad-1',
        ownerId: 'owner-1',
        name: 'New Name',
      }),
    ).rejects.toThrow(SquadNotFoundError);
  });

  it('should throw SquadNotFoundError if squad owned by another user', async () => {
    const squad = new Squad('squad-1', 'owner-2', 'Name', '4-3-3');
    mockSquadRepository.findById.mockResolvedValue(squad);

    await expect(
      useCase.execute({
        id: 'squad-1',
        ownerId: 'owner-1',
        name: 'New Name',
      }),
    ).rejects.toThrow(SquadNotFoundError);
  });
});
