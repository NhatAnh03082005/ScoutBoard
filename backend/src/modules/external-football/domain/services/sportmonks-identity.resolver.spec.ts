import {
  SportmonksIdentityResolver,
  CandidatePlayer,
  ResolvePlayerIdentityInput,
  ResolveTeamIdentityInput,
} from './sportmonks-identity.resolver';

describe('SportmonksIdentityResolver', () => {
  const candidateSquad: CandidatePlayer[] = [
    {
      id: 'uuid-player-cr7',
      name: 'Cristiano Ronaldo',
      normalizedName: 'cristiano ronaldo',
      shirtNumber: 7,
      externalProvider: 'FOOTBALL_DATA_ORG',
      externalId: '44',
    },
    {
      id: 'uuid-player-bruno',
      name: 'Bruno Fernandes',
      normalizedName: 'bruno fernandes',
      shirtNumber: 8,
      externalProvider: 'SPORTMONKS',
      externalId: '37281',
    },
    {
      id: 'uuid-player-gabriel-1',
      name: 'Gabriel Magalhaes',
      normalizedName: 'gabriel',
      shirtNumber: 6,
      externalProvider: 'FOOTBALL_DATA_ORG',
      externalId: '5001',
    },
    {
      id: 'uuid-player-gabriel-2',
      name: 'Gabriel Martinelli',
      normalizedName: 'gabriel',
      shirtNumber: 11,
      externalProvider: 'FOOTBALL_DATA_ORG',
      externalId: '5002',
    },
  ];

  describe('Player Identity Resolution', () => {
    it('should resolve known direct SPORTMONKS provider identity with 1.0 confidence', () => {
      const input: ResolvePlayerIdentityInput = {
        sportmonksPlayerId: '37281',
        playerName: 'Bruno Fernandes',
        shirtNumber: 8,
        teamId: 'team-uuid-1',
        candidateSquadPlayers: candidateSquad,
      };

      const result = SportmonksIdentityResolver.resolvePlayerIdentity(input);

      expect(result.resolved).toBe(true);
      expect(result.playerId).toBe('uuid-player-bruno');
      expect(result.confidence).toBe(1.0);
      expect(result.strategy).toBe('DIRECT_PROVIDER_ID');
    });

    it('should resolve player by normalized squad name match when external provider ID is not mapped', () => {
      const input: ResolvePlayerIdentityInput = {
        sportmonksPlayerId: '99999', // New/unmapped Sportmonks ID
        playerName: 'Cristiano Ronaldo',
        shirtNumber: 7,
        teamId: 'team-uuid-1',
        candidateSquadPlayers: candidateSquad,
      };

      const result = SportmonksIdentityResolver.resolvePlayerIdentity(input);

      expect(result.resolved).toBe(true);
      expect(result.playerId).toBe('uuid-player-cr7');
      expect(result.confidence).toBe(0.95);
      expect(result.strategy).toBe('TEAM_SQUAD_EXACT_MATCH');
    });

    it('should disambiguate players sharing identical name using shirt number', () => {
      const input: ResolvePlayerIdentityInput = {
        sportmonksPlayerId: '88888',
        playerName: 'Gabriel',
        shirtNumber: 11,
        teamId: 'team-uuid-1',
        candidateSquadPlayers: candidateSquad,
      };

      const result = SportmonksIdentityResolver.resolvePlayerIdentity(input);

      expect(result.resolved).toBe(true);
      expect(result.playerId).toBe('uuid-player-gabriel-2');
      expect(result.strategy).toBe('TEAM_SQUAD_NUMBER_MATCH');
    });

    it('should reject ambiguous player names when shirt number is missing or does not match', () => {
      const input: ResolvePlayerIdentityInput = {
        sportmonksPlayerId: '88888',
        playerName: 'Gabriel',
        shirtNumber: null,
        teamId: 'team-uuid-1',
        candidateSquadPlayers: candidateSquad,
      };

      const result = SportmonksIdentityResolver.resolvePlayerIdentity(input);

      expect(result.resolved).toBe(false);
      expect(result.playerId).toBeNull();
      expect(result.strategy).toBe('UNRESOLVED');
      expect(result.reason).toContain('Ambiguous player identity');
    });

    it('should return UNRESOLVED for completely unknown player without candidate match', () => {
      const input: ResolvePlayerIdentityInput = {
        sportmonksPlayerId: '77777',
        playerName: 'Erling Haaland',
        shirtNumber: 9,
        teamId: 'team-uuid-1',
        candidateSquadPlayers: candidateSquad,
      };

      const result = SportmonksIdentityResolver.resolvePlayerIdentity(input);

      expect(result.resolved).toBe(false);
      expect(result.playerId).toBeNull();
      expect(result.strategy).toBe('UNRESOLVED');
    });

    it('should reject duplicate direct provider identity as UNRESOLVED', () => {
      const duplicateSquad: CandidatePlayer[] = [
        { id: 'p1', name: 'Player A', externalProvider: 'SPORTMONKS', externalId: '100' },
        { id: 'p2', name: 'Player B', externalProvider: 'SPORTMONKS', externalId: '100' },
      ];

      const result = SportmonksIdentityResolver.resolvePlayerIdentity({
        sportmonksPlayerId: '100',
        teamId: 'team-1',
        candidateSquadPlayers: duplicateSquad,
      });

      expect(result.resolved).toBe(false);
      expect(result.playerId).toBeNull();
    });
  });

  describe('Team Identity Resolution', () => {
    it('should resolve team by participant ID mapping', () => {
      const input: ResolveTeamIdentityInput = {
        sportmonksTeamId: 14,
        matchHomeTeamId: 'uuid-home-team',
        matchAwayTeamId: 'uuid-away-team',
        sportmonksHomeParticipantId: 14,
        sportmonksAwayParticipantId: 11,
      };

      const result = SportmonksIdentityResolver.resolveTeamIdentity(input);

      expect(result.resolved).toBe(true);
      expect(result.teamId).toBe('uuid-home-team');
      expect(result.strategy).toBe('PARTICIPANT_ID_MAPPING');
    });

    it('should resolve team by location metadata fallback', () => {
      const input: ResolveTeamIdentityInput = {
        sportmonksTeamId: 999,
        location: 'away',
        matchHomeTeamId: 'uuid-home-team',
        matchAwayTeamId: 'uuid-away-team',
      };

      const result = SportmonksIdentityResolver.resolveTeamIdentity(input);

      expect(result.resolved).toBe(true);
      expect(result.teamId).toBe('uuid-away-team');
      expect(result.strategy).toBe('MATCH_LOCATION_MAPPING');
    });

    it('should return UNRESOLVED when team ID does not match fixture participants or location', () => {
      const input: ResolveTeamIdentityInput = {
        sportmonksTeamId: 999,
        matchHomeTeamId: 'uuid-home-team',
        matchAwayTeamId: 'uuid-away-team',
        sportmonksHomeParticipantId: 14,
        sportmonksAwayParticipantId: 11,
      };

      const result = SportmonksIdentityResolver.resolveTeamIdentity(input);

      expect(result.resolved).toBe(false);
      expect(result.teamId).toBeNull();
      expect(result.strategy).toBe('UNRESOLVED');
    });
  });
});
