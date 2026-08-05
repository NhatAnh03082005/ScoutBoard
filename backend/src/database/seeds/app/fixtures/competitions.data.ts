export interface SeedSeasonData {
  extId: string;
  seasonCode: string;
  name: string;
  startDate: string;
  endDate: string;
  isCurrent: boolean;
}

export interface SeedCompData {
  extId: string;
  name: string;
  country: string;
  type: string;
  logo: string;
  seasons: SeedSeasonData[];
}

export const COMPETITIONS_DATA: SeedCompData[] = [
  {
    extId: 'PL',
    name: 'Premier League',
    country: 'England',
    type: 'LEAGUE',
    logo: 'https://crests.football-data.org/PL.png',
    seasons: [
      {
        extId: 'PL-2024',
        seasonCode: '2024-2025',
        name: 'Premier League 2024/25',
        startDate: '2024-08-16',
        endDate: '2025-05-25',
        isCurrent: false,
      },
      {
        extId: 'PL-2025',
        seasonCode: '2025-2026',
        name: 'Premier League 2025/26',
        startDate: '2025-08-15',
        endDate: '2026-05-24',
        isCurrent: true,
      },
    ],
  },
  {
    extId: 'PD',
    name: 'La Liga',
    country: 'Spain',
    type: 'LEAGUE',
    logo: 'https://crests.football-data.org/PD.png',
    seasons: [
      {
        extId: 'PD-2024',
        seasonCode: '2024-2025',
        name: 'La Liga 2024/25',
        startDate: '2024-08-15',
        endDate: '2025-05-25',
        isCurrent: false,
      },
      {
        extId: 'PD-2025',
        seasonCode: '2025-2026',
        name: 'La Liga 2025/26',
        startDate: '2025-08-16',
        endDate: '2026-05-25',
        isCurrent: true,
      },
    ],
  },
  {
    extId: 'SA',
    name: 'Serie A',
    country: 'Italy',
    type: 'LEAGUE',
    logo: 'https://crests.football-data.org/SA.png',
    seasons: [
      {
        extId: 'SA-2024',
        seasonCode: '2024-2025',
        name: 'Serie A 2024/25',
        startDate: '2024-08-17',
        endDate: '2025-05-25',
        isCurrent: false,
      },
      {
        extId: 'SA-2025',
        seasonCode: '2025-2026',
        name: 'Serie A 2025/26',
        startDate: '2025-08-23',
        endDate: '2026-05-24',
        isCurrent: true,
      },
    ],
  },
  {
    extId: 'BL1',
    name: 'Bundesliga',
    country: 'Germany',
    type: 'LEAGUE',
    logo: 'https://crests.football-data.org/BL1.png',
    seasons: [
      {
        extId: 'BL1-2024',
        seasonCode: '2024-2025',
        name: 'Bundesliga 2024/25',
        startDate: '2024-08-23',
        endDate: '2025-05-17',
        isCurrent: false,
      },
      {
        extId: 'BL1-2025',
        seasonCode: '2025-2026',
        name: 'Bundesliga 2025/26',
        startDate: '2025-08-22',
        endDate: '2026-05-16',
        isCurrent: true,
      },
    ],
  },
  {
    extId: 'FL1',
    name: 'Ligue 1',
    country: 'France',
    type: 'LEAGUE',
    logo: 'https://crests.football-data.org/FL1.png',
    seasons: [
      {
        extId: 'FL1-2024',
        seasonCode: '2024-2025',
        name: 'Ligue 1 2024/25',
        startDate: '2024-08-16',
        endDate: '2025-05-18',
        isCurrent: false,
      },
      {
        extId: 'FL1-2025',
        seasonCode: '2025-2026',
        name: 'Ligue 1 2025/26',
        startDate: '2025-08-15',
        endDate: '2026-05-17',
        isCurrent: true,
      },
    ],
  },
  {
    extId: 'CL',
    name: 'UEFA Champions League',
    country: 'Europe',
    type: 'CUP',
    logo: 'https://crests.football-data.org/CL.png',
    seasons: [
      {
        extId: 'CL-2024',
        seasonCode: '2024-2025',
        name: 'UEFA Champions League 2024/25',
        startDate: '2024-09-17',
        endDate: '2025-05-31',
        isCurrent: false,
      },
      {
        extId: 'CL-2025',
        seasonCode: '2025-2026',
        name: 'UEFA Champions League 2025/26',
        startDate: '2025-09-16',
        endDate: '2026-05-30',
        isCurrent: true,
      },
    ],
  },
];
