import { NotFoundException } from '@nestjs/common';
import { GetPlayerTeamHistoryUseCase } from './get-player-team-history.use-case';
import { PlayerReadRepository } from '../ports/player-read.repository';

describe('GetPlayerTeamHistoryUseCase', () => {
  let useCase: GetPlayerTeamHistoryUseCase;
  let mockPlayerRepo: jest.Mocked<PlayerReadRepository>;

  beforeEach(() => {
    mockPlayerRepo = {
      findById: jest.fn(),
      search: jest.fn(),
      findTeamHistoryByPlayerId: jest.fn(),
      findSeasonStatisticsByPlayerId: jest.fn(),
      findSeasonStatisticsByCompetitionAndSeason: jest.fn(),
      findMatchStatisticsByPlayerId: jest.fn(),
      findComparisonCandidates: jest.fn(),
    };

    useCase = new GetPlayerTeamHistoryUseCase(mockPlayerRepo);
  });

  it('should throw NotFoundException if player does not exist', async () => {
    mockPlayerRepo.findById.mockResolvedValue(null);

    await expect(useCase.execute('invalid-id')).rejects.toThrow(
      NotFoundException,
    );
    expect(mockPlayerRepo.findById).toHaveBeenCalledWith('invalid-id');
  });

  it('should return formatted team history if player exists', async () => {
    mockPlayerRepo.findById.mockResolvedValue({ id: 'player-1', name: 'Saka' } as any);
    mockPlayerRepo.findTeamHistoryByPlayerId.mockResolvedValue([
      {
        id: 'hist-1',
        playerId: 'player-1',
        teamId: 'team-1',
        startDate: '2024-07-01',
        endDate: null,
        shirtNumber: 7,
        isCurrent: true,
        team: {
          id: 'team-1',
          name: 'Arsenal FC',
          shortName: 'Arsenal',
          logoUrl: null,
          country: 'England',
        },
      } as any,
    ]);

    const result = await useCase.execute('player-1');

    expect(result).toEqual([
      {
        id: 'hist-1',
        team: {
          id: 'team-1',
          name: 'Arsenal FC',
          shortName: 'Arsenal',
          logoUrl: null,
          country: 'England',
        },
        joinedAt: '2024-07-01',
        leftAt: null,
        shirtNumber: 7,
        isCurrent: true,
      },
    ]);
  });
});
