import { NotFoundException } from '@nestjs/common';
import { GetPlayerMatchStatisticsUseCase } from './get-player-match-statistics.use-case';
import { PlayerReadRepository } from '../ports/player-read.repository';

describe('GetPlayerMatchStatisticsUseCase', () => {
  let useCase: GetPlayerMatchStatisticsUseCase;
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

    useCase = new GetPlayerMatchStatisticsUseCase(mockPlayerRepo);
  });

  it('should throw NotFoundException if player does not exist (HTTP 404)', async () => {
    mockPlayerRepo.findById.mockResolvedValue(null);

    await expect(useCase.execute('invalid-id', {})).rejects.toThrow(
      NotFoundException,
    );
    expect(mockPlayerRepo.findById).toHaveBeenCalledWith('invalid-id');
  });

  it('should return empty list with total=0 if player exists but has no match statistics', async () => {
    mockPlayerRepo.findById.mockResolvedValue({ id: 'player-1', name: 'Saka' } as any);
    mockPlayerRepo.findMatchStatisticsByPlayerId.mockResolvedValue({ items: [], total: 0 });

    const result = await useCase.execute('player-1', { limit: 10, offset: 0 });

    expect(result.items).toEqual([]);
    expect(result.pagination).toEqual({ limit: 10, offset: 0, total: 0 });
  });

  it('should pass teamId to repository when teamId filter is provided', async () => {
    mockPlayerRepo.findById.mockResolvedValue({ id: 'player-1', name: 'Kane' } as any);
    mockPlayerRepo.findMatchStatisticsByPlayerId.mockResolvedValue({ items: [], total: 0 });

    await useCase.execute('player-1', { seasonId: 's-1', competitionId: 'c-1', teamId: 't-99', limit: 10, offset: 0 });

    expect(mockPlayerRepo.findMatchStatisticsByPlayerId).toHaveBeenCalledWith('player-1', {
      seasonId: 's-1',
      competitionId: 'c-1',
      teamId: 't-99',
      limit: 10,
      offset: 0,
    });
  });

  it('should return formatted match statistics with full match context and derived passAccuracy', async () => {
    mockPlayerRepo.findById.mockResolvedValue({ id: 'player-1', name: 'Saka' } as any);
    mockPlayerRepo.findMatchStatisticsByPlayerId.mockResolvedValue({
      items: [
        {
          id: 'pms-1',
          minutesPlayed: 90,
          isStarter: true,
          rating: 8.5,
          goals: 1,
          assists: 1,
          shots: 4,
          keyPasses: 3,
          passesAttempted: 50,
          passesCompleted: 45,
          tackles: 2,
          interceptions: 1,
          yellowCards: 0,
          redCards: 0,
          statistics: null,
          team: { id: 'team-1', name: 'Arsenal FC', shortName: 'Arsenal', logoUrl: null },
          match: {
            id: 'match-101',
            matchDate: new Date('2025-10-15T20:00:00Z'),
            status: 'FINISHED',
            homeScore: 2,
            awayScore: 1,
            competition: { id: 'comp-1', name: 'Premier League', country: 'England' },
            season: { id: 'season-1', seasonCode: '2025-2026' },
            homeTeam: { id: 'team-1', name: 'Arsenal FC', shortName: 'Arsenal', logoUrl: null },
            awayTeam: { id: 'team-2', name: 'Chelsea FC', shortName: 'Chelsea', logoUrl: null },
          },
        } as any,
      ],
      total: 1,
    });

    const result = await useCase.execute('player-1', { limit: 10, offset: 0 });

    expect(result.items).toHaveLength(1);
    expect(result.items[0].match.homeTeam.name).toBe('Arsenal FC');
    expect(result.items[0].match.awayTeam.name).toBe('Chelsea FC');
    expect(result.items[0].goals).toBe(1);
    expect(result.items[0].passesAttempted).toBe(50);
    expect(result.items[0].passesCompleted).toBe(45);
    expect(result.items[0].passAccuracy).toBe(90);
    expect(result.items[0].saves).toBeNull();
    expect(result.pagination.total).toBe(1);
  });

  it('should return goalkeeper match statistics (saves, cleanSheets, etc.)', async () => {
    mockPlayerRepo.findById.mockResolvedValue({ id: 'gk-1', name: 'David Raya', primaryPosition: 'GK' } as any);
    mockPlayerRepo.findMatchStatisticsByPlayerId.mockResolvedValue({
      items: [
        {
          id: 'pms-gk-1',
          minutesPlayed: 90,
          isStarter: true,
          rating: 7.8,
          goals: 0,
          assists: 0,
          shots: 0,
          keyPasses: 0,
          passesAttempted: 28,
          passesCompleted: 24,
          tackles: 0,
          interceptions: 1,
          yellowCards: 0,
          redCards: 0,
          saves: 5,
          goalsConceded: 0,
          cleanSheets: 1,
          penaltiesSaved: 0,
          statistics: null,
          team: { id: 'team-1', name: 'Arsenal FC', shortName: 'Arsenal', logoUrl: null },
          match: {
            id: 'match-101',
            matchDate: new Date('2025-10-15T20:00:00Z'),
            status: 'FINISHED',
            homeScore: 2,
            awayScore: 0,
            competition: { id: 'comp-1', name: 'Premier League', country: 'England' },
            season: { id: 'season-1', seasonCode: '2025-2026' },
            homeTeam: { id: 'team-1', name: 'Arsenal FC', shortName: 'Arsenal', logoUrl: null },
            awayTeam: { id: 'team-2', name: 'Chelsea FC', shortName: 'Chelsea', logoUrl: null },
          },
        } as any,
      ],
      total: 1,
    });

    const result = await useCase.execute('gk-1', { limit: 10, offset: 0 });

    expect(result.items).toHaveLength(1);
    expect(result.items[0].saves).toBe(5);
    expect(result.items[0].goalsConceded).toBe(0);
    expect(result.items[0].cleanSheets).toBe(1);
    expect(result.items[0].penaltiesSaved).toBe(0);
    expect(result.items[0].passesAttempted).toBe(28);
    expect(result.items[0].passesCompleted).toBe(24);
    expect(result.items[0].passAccuracy).toBe(85.71);
  });
});
