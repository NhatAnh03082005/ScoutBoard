import { Test, TestingModule } from '@nestjs/testing';
import { PlayerEnrichmentSyncService } from './player-enrichment-sync.service';
import { API_FOOTBALL_CLIENT } from '../../../external-football/application/ports/api-football-client.port';
import { EnrichPlayerProfileUseCase } from '../use-cases/enrich-player-profile.use-case';
import { PLAYER_WRITE_REPOSITORY } from '../ports/player-write.repository';
import { TEAM_WRITE_REPOSITORY } from '../../../teams/application/ports/team-write.repository';

describe('PlayerEnrichmentSyncService', () => {
  let service: PlayerEnrichmentSyncService;
  let mockApiClient: any;
  let mockEnrichUseCase: any;
  let mockPlayerRepo: any;
  let mockTeamRepo: any;

  beforeEach(async () => {
    mockApiClient = {
      getPlayers: jest.fn(),
      getSquadByTeam: jest.fn(),
    };

    mockEnrichUseCase = {
      execute: jest.fn((input) =>
        Promise.resolve({
          id: input.playerId,
          name: input.enrichment.name,
          imageUrl: input.enrichment.imageUrl,
        }),
      ),
    };

    mockPlayerRepo = {
      find: jest.fn(),
    };

    mockTeamRepo = {
      findOne: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PlayerEnrichmentSyncService,
        { provide: API_FOOTBALL_CLIENT, useValue: mockApiClient },
        { provide: EnrichPlayerProfileUseCase, useValue: mockEnrichUseCase },
        {
          provide: PLAYER_WRITE_REPOSITORY,
          useValue: { playerRepository: mockPlayerRepo },
        },
        {
          provide: TEAM_WRITE_REPOSITORY,
          useValue: { teamRepository: mockTeamRepo },
        },
      ],
    }).compile();

    service = module.get<PlayerEnrichmentSyncService>(
      PlayerEnrichmentSyncService,
    );
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should enrich local players from API-Football squad response', async () => {
    mockTeamRepo.findOne.mockResolvedValue({
      id: 'team-uuid-1',
      name: 'West Ham United FC',
      shortName: 'West Ham',
      externalId: '48',
    });

    mockPlayerRepo.find.mockResolvedValue([
      {
        id: 'player-uuid-1',
        name: 'Aaron Wan-Bissaka',
        normalizedName: 'aaron wan bissaka',
        dateOfBirth: '1997-11-26',
        nationality: 'DR Congo',
        currentTeamId: 'team-uuid-1',
      },
    ]);

    mockApiClient.getSquadByTeam.mockResolvedValue({
      get: 'players/squads',
      results: 1,
      response: [
        {
          team: { id: 48, name: 'West Ham' },
          players: [
            {
              id: 18883,
              name: 'A. Wan-Bissaka',
              age: 27,
              number: 29,
              position: 'Defender',
              photo: 'https://media.api-sports.io/football/players/18883.png',
            },
          ],
        },
      ],
    });

    mockApiClient.getPlayers.mockResolvedValue({
      get: 'players',
      results: 1,
      response: [
        {
          player: {
            id: 18883,
            name: 'A. Wan-Bissaka',
            lastname: 'Wan-Bissaka',
            birth: { date: '1997-11-26' },
            nationality: 'DR Congo',
            height: '183 cm',
            weight: '72 kg',
            photo: 'https://media.api-sports.io/football/players/18883.png',
          },
          statistics: [
            {
              games: { number: 29, position: 'Defender' },
            },
          ],
        },
      ],
    });

    const result = await service.enrichPlayersForTeam('team-uuid-1', 2025);

    expect(result.enrichedCount).toBe(1);
    expect(result.unmatchedCount).toBe(0);
    expect(mockEnrichUseCase.execute).toHaveBeenCalled();
  });
});
