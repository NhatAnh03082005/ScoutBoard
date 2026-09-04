import { ApiFootballPlayerMapper } from './api-football-player.mapper';
import { ApiFootballPlayerItemDto } from '../dto/api-football-player.dto';

describe('ApiFootballPlayerMapper', () => {
  const sampleDto: ApiFootballPlayerItemDto = {
    player: {
      id: 18883,
      name: 'Aaron Wan-Bissaka',
      firstname: 'Aaron',
      lastname: 'Wan-Bissaka',
      age: 28,
      birth: {
        date: '1997-11-26',
        place: 'London',
        country: 'England',
      },
      nationality: 'DR Congo',
      height: '183 cm',
      weight: '72 kg',
      injured: false,
      photo: 'https://media.api-sports.io/football/players/18883.png',
    },
    statistics: [
      {
        team: { id: 48, name: 'West Ham' },
        league: { id: 39, name: 'Premier League', season: 2025 },
        games: {
          appearences: 20,
          lineups: 18,
          minutes: 1620,
          number: 29,
          position: 'Defender',
          rating: '7.15',
        },
      },
    ],
  };

  it('should parse height and weight correctly', () => {
    expect(ApiFootballPlayerMapper.parseHeightCm('183 cm')).toBe(183);
    expect(ApiFootballPlayerMapper.parseHeightCm('194cm')).toBe(194);
    expect(ApiFootballPlayerMapper.parseHeightCm(null)).toBeNull();
    expect(ApiFootballPlayerMapper.parseHeightCm('invalid')).toBeNull();

    expect(ApiFootballPlayerMapper.parseWeightKg('72 kg')).toBe(72);
    expect(ApiFootballPlayerMapper.parseWeightKg('88kg')).toBe(88);
    expect(ApiFootballPlayerMapper.parseWeightKg(null)).toBeNull();
  });

  it('should normalize position to canonical football codes with 3-tier resolution', () => {
    expect(ApiFootballPlayerMapper.normalizePosition('Goalkeeper')).toBe('GK');
    expect(ApiFootballPlayerMapper.normalizePosition('Defender')).toBe('DEF');
    expect(ApiFootballPlayerMapper.normalizePosition('Midfielder')).toBe('MID');
    expect(ApiFootballPlayerMapper.normalizePosition('Attacker')).toBe('FWD');
    expect(ApiFootballPlayerMapper.normalizePosition('Right-Back')).toBe('RB');
    expect(ApiFootballPlayerMapper.normalizePosition('Left-Back')).toBe('LB');
    expect(ApiFootballPlayerMapper.normalizePosition('Centre-Back')).toBe('CB');
    expect(ApiFootballPlayerMapper.normalizePosition('Defensive Midfielder')).toBe('CDM');
    expect(ApiFootballPlayerMapper.normalizePosition('DM')).toBe('CDM');
    expect(ApiFootballPlayerMapper.normalizePosition('Attacking Midfielder')).toBe('CAM');
    expect(ApiFootballPlayerMapper.normalizePosition('AM')).toBe('CAM');
    expect(ApiFootballPlayerMapper.normalizePosition('Left Winger')).toBe('LW');
    expect(ApiFootballPlayerMapper.normalizePosition('Right Winger')).toBe('RW');
    expect(ApiFootballPlayerMapper.normalizePosition('Striker')).toBe('ST');
  });

  it('should normalize player name for cross-provider matching', () => {
    expect(ApiFootballPlayerMapper.normalizeName('Mohamed Salah Ghaly')).toBe(
      'mohamed salah ghaly',
    );
    expect(ApiFootballPlayerMapper.normalizeName('Érling Håaland')).toBe(
      'erling haaland',
    );
  });

  it('should transform ApiFootballPlayerItemDto to TransformedPlayer', () => {
    const transformed = ApiFootballPlayerMapper.toTransformedPlayer(sampleDto);

    expect(transformed.externalProvider).toBe('API_FOOTBALL');
    expect(transformed.externalId).toBe('18883');
    expect(transformed.name).toBe('Aaron Wan-Bissaka');
    expect(transformed.heightCm).toBe(183);
    expect(transformed.weightKg).toBe(72);
    expect(transformed.shirtNumber).toBe(29);
    expect(transformed.rawPosition).toBe('Defender');
    expect(transformed.primaryPosition).toBe('DEF');
    expect(transformed.imageUrl).toBe(
      'https://media.api-sports.io/football/players/18883.png',
    );
    expect(transformed.nationality).toBe('DR Congo');
    expect(transformed.dateOfBirth).toBe('1997-11-26');
  });

  it('should extract EnrichedPlayerProfile for enrichment use case', () => {
    const enriched = ApiFootballPlayerMapper.toEnrichedProfile(sampleDto);

    expect(enriched.externalId).toBe('18883');
    expect(enriched.name).toBe('Aaron Wan-Bissaka');
    expect(enriched.heightCm).toBe(183);
    expect(enriched.weightKg).toBe(72);
    expect(enriched.imageUrl).toBe(
      'https://media.api-sports.io/football/players/18883.png',
    );
    expect(enriched.shirtNumber).toBe(29);
    expect(enriched.primaryPosition).toBe('DEF');
  });
});
