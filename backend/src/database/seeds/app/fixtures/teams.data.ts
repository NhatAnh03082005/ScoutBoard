export interface SeedTeamData {
  extId: string;
  name: string;
  shortName: string;
  tla: string;
  country: string;
  founded: number;
  venue: string;
  logo: string;
  domesticCompExtId: string;
}

export const TEAMS_DATA: SeedTeamData[] = [
  // Premier League
  {
    extId: '65',
    name: 'Manchester City FC',
    shortName: 'Man City',
    tla: 'MCI',
    country: 'England',
    founded: 1894,
    venue: 'Etihad Stadium',
    logo: 'https://crests.football-data.org/65.png',
    domesticCompExtId: 'PL',
  },
  {
    extId: '57',
    name: 'Arsenal FC',
    shortName: 'Arsenal',
    tla: 'ARS',
    country: 'England',
    founded: 1886,
    venue: 'Emirates Stadium',
    logo: 'https://crests.football-data.org/57.png',
    domesticCompExtId: 'PL',
  },
  {
    extId: '64',
    name: 'Liverpool FC',
    shortName: 'Liverpool',
    tla: 'LIV',
    country: 'England',
    founded: 1892,
    venue: 'Anfield',
    logo: 'https://crests.football-data.org/64.png',
    domesticCompExtId: 'PL',
  },
  {
    extId: '61',
    name: 'Chelsea FC',
    shortName: 'Chelsea',
    tla: 'CHE',
    country: 'England',
    founded: 1905,
    venue: 'Stamford Bridge',
    logo: 'https://crests.football-data.org/61.png',
    domesticCompExtId: 'PL',
  },
  {
    extId: '66',
    name: 'Manchester United FC',
    shortName: 'Man United',
    tla: 'MUN',
    country: 'England',
    founded: 1878,
    venue: 'Old Trafford',
    logo: 'https://crests.football-data.org/66.png',
    domesticCompExtId: 'PL',
  },
  {
    extId: '563',
    name: 'West Ham United FC',
    shortName: 'West Ham',
    tla: 'WHU',
    country: 'England',
    founded: 1895,
    venue: 'London Stadium',
    logo: 'https://crests.football-data.org/563.png',
    domesticCompExtId: 'PL',
  },
  {
    extId: '100',
    name: 'AS Roma',
    shortName: 'Roma',
    tla: 'ROM',
    country: 'Italy',
    founded: 1927,
    venue: 'Stadio Olimpico',
    logo: 'https://crests.football-data.org/100.png',
    domesticCompExtId: 'SA',
  },
  {
    extId: '187',
    name: 'FC Red Bull Salzburg',
    shortName: 'Salzburg',
    tla: 'RBS',
    country: 'Austria',
    founded: 1933,
    venue: 'Red Bull Arena',
    logo: 'https://crests.football-data.org/187.png',
    domesticCompExtId: 'CL',
  },

  // La Liga
  {
    extId: '86',
    name: 'Real Madrid CF',
    shortName: 'Real Madrid',
    tla: 'RMA',
    country: 'Spain',
    founded: 1902,
    venue: 'Santiago Bernabeu',
    logo: 'https://crests.football-data.org/86.png',
    domesticCompExtId: 'PD',
  },
  {
    extId: '81',
    name: 'FC Barcelona',
    shortName: 'Barcelona',
    tla: 'BAR',
    country: 'Spain',
    founded: 1899,
    venue: 'Spotify Camp Nou',
    logo: 'https://crests.football-data.org/81.png',
    domesticCompExtId: 'PD',
  },
  {
    extId: '78',
    name: 'Club Atletico de Madrid',
    shortName: 'Atletico Madrid',
    tla: 'ATM',
    country: 'Spain',
    founded: 1903,
    venue: 'Civitas Metropolitano',
    logo: 'https://crests.football-data.org/78.png',
    domesticCompExtId: 'PD',
  },

  // Serie A
  {
    extId: '108',
    name: 'FC Internazionale Milano',
    shortName: 'Inter Milan',
    tla: 'INT',
    country: 'Italy',
    founded: 1908,
    venue: 'San Siro',
    logo: 'https://crests.football-data.org/108.png',
    domesticCompExtId: 'SA',
  },
  {
    extId: '98',
    name: 'AC Milan',
    shortName: 'AC Milan',
    tla: 'ACM',
    country: 'Italy',
    founded: 1899,
    venue: 'San Siro',
    logo: 'https://crests.football-data.org/98.png',
    domesticCompExtId: 'SA',
  },
  {
    extId: '109',
    name: 'Juventus FC',
    shortName: 'Juventus',
    tla: 'JUV',
    country: 'Italy',
    founded: 1897,
    venue: 'Allianz Stadium',
    logo: 'https://crests.football-data.org/109.png',
    domesticCompExtId: 'SA',
  },

  // Bundesliga
  {
    extId: '503',
    name: 'FC Bayern München',
    shortName: 'Bayern Munich',
    tla: 'BAY',
    country: 'Germany',
    founded: 1900,
    venue: 'Allianz Arena',
    logo: 'https://crests.football-data.org/503.png',
    domesticCompExtId: 'BL1',
  },
  {
    extId: '3',
    name: 'Bayer 04 Leverkusen',
    shortName: 'Bayer Leverkusen',
    tla: 'LEV',
    country: 'Germany',
    founded: 1904,
    venue: 'BayArena',
    logo: 'https://crests.football-data.org/3.png',
    domesticCompExtId: 'BL1',
  },
  {
    extId: '4',
    name: 'Borussia Dortmund',
    shortName: 'Dortmund',
    tla: 'BVB',
    country: 'Germany',
    founded: 1909,
    venue: 'Signal Iduna Park',
    logo: 'https://crests.football-data.org/4.png',
    domesticCompExtId: 'BL1',
  },

  // Ligue 1
  {
    extId: '524',
    name: 'Paris Saint-Germain FC',
    shortName: 'PSG',
    tla: 'PSG',
    country: 'France',
    founded: 1970,
    venue: 'Parc des Princes',
    logo: 'https://crests.football-data.org/524.png',
    domesticCompExtId: 'FL1',
  },
  {
    extId: '548',
    name: 'AS Monaco FC',
    shortName: 'AS Monaco',
    tla: 'ASM',
    country: 'France',
    founded: 1924,
    venue: 'Stade Louis II',
    logo: 'https://crests.football-data.org/548.png',
    domesticCompExtId: 'FL1',
  },
];

// Champions League Teams Participation (by Team external ID)
export const CL_TEAMS_2024: string[] = [
  '65', // Man City
  '57', // Arsenal
  '86', // Real Madrid
  '81', // Barcelona
  '108', // Inter Milan
  '503', // Bayern Munich
  '4', // Dortmund
  '524', // PSG
];

export const CL_TEAMS_2025: string[] = [
  '65', // Man City
  '64', // Liverpool
  '86', // Real Madrid
  '81', // Barcelona
  '108', // Inter Milan
  '109', // Juventus
  '503', // Bayern Munich
  '524', // PSG
];
