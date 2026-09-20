import * as dotenv from 'dotenv';
import * as path from 'path';
import * as https from 'https';
import * as dns from 'dns';
import { Client } from 'pg';

dns.setDefaultResultOrder('ipv4first');
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const API_KEY = process.env.API_FOOTBALL_KEY || '09b395257421d95a43fa4fd945df43b7';
const BASE_HOST = 'v3.football.api-sports.io';

const LOCAL_CLIENT = new Client({
  host: process.env.POSTGRES_HOST || '127.0.0.1',
  port: parseInt(process.env.POSTGRES_PORT || '5432', 10),
  user: process.env.POSTGRES_USER || 'postgres',
  password: process.env.POSTGRES_PASSWORD || 'postgres123',
  database: process.env.POSTGRES_DB || 'scoutboard_db',
});

const SUPABASE_CLIENT = new Client({
  host: process.env.SUPABASE_HOST || 'aws-0-ap-south-1.pooler.supabase.com',
  port: parseInt(process.env.SUPABASE_PORT || '6543', 10),
  user: process.env.SUPABASE_USER || 'postgres.utpuxqpokpqnxpqqiens',
  password: process.env.SUPABASE_PASSWORD || '03082005Anhle@@',
  database: process.env.SUPABASE_DB || 'postgres',
  ssl: { rejectUnauthorized: false },
  statement_timeout: 60000,
});

const DELAY_MS = 6200; // strictly <= 10 reqs/min

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function callApi(endpoint: string): Promise<any> {
  const cleanPath = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  return new Promise((resolve, reject) => {
    const req = https.request(
      {
        hostname: BASE_HOST,
        path: cleanPath,
        method: 'GET',
        headers: {
          'x-apisports-key': API_KEY,
          Accept: 'application/json',
        },
        family: 4,
        timeout: 20000,
      },
      (res) => {
        let body = '';
        res.on('data', (chunk) => (body += chunk));
        res.on('end', () => {
          try {
            resolve(JSON.parse(body));
          } catch (e) {
            resolve({ raw: body, statusCode: res.statusCode });
          }
        });
      },
    );
    req.on('timeout', () => {
      req.destroy();
      reject(new Error(`Timeout on ${cleanPath}`));
    });
    req.on('error', reject);
    req.end();
  });
}

// Tactical Map for the 4 clubs
const TACTICAL_MAP: Record<string, { primary: string; secondary?: string[]; raw: string }> = {
  // === BAYER LEVERKUSEN ===
  'L. Hrádecký': { primary: 'GK', raw: 'Goalkeeper' },
  'Lukas Hradecky': { primary: 'GK', raw: 'Goalkeeper' },
  'M. Kovář': { primary: 'GK', raw: 'Goalkeeper' },
  'Matej Kovar': { primary: 'GK', raw: 'Goalkeeper' },
  'N. Lomb': { primary: 'GK', raw: 'Goalkeeper' },
  'J. Tah': { primary: 'CB', raw: 'Defender' },
  'Jonathan Tah': { primary: 'CB', raw: 'Defender' },
  'E. Tapsoba': { primary: 'CB', raw: 'Defender' },
  'Edmond Tapsoba': { primary: 'CB', raw: 'Defender' },
  'P. Hincapié': { primary: 'CB', secondary: ['LB'], raw: 'Defender' },
  'Piero Hincapie': { primary: 'CB', secondary: ['LB'], raw: 'Defender' },
  'J. Frimpong': { primary: 'RWB', secondary: ['RB', 'RM'], raw: 'Defender' },
  'Jeremie Frimpong': { primary: 'RWB', secondary: ['RB', 'RM'], raw: 'Defender' },
  'Álex Grimaldo': { primary: 'LWB', secondary: ['LB', 'LM'], raw: 'Defender' },
  'Alejandro Grimaldo': { primary: 'LWB', secondary: ['LB', 'LM'], raw: 'Defender' },
  'A. Grimaldo': { primary: 'LWB', secondary: ['LB', 'LM'], raw: 'Defender' },
  'Arthur': { primary: 'RB', secondary: ['RWB'], raw: 'Defender' },
  'J. Belocian': { primary: 'CB', secondary: ['LB'], raw: 'Defender' },
  'Jeanuël Belocian': { primary: 'CB', secondary: ['LB'], raw: 'Defender' },
  'S. Mukiele': { primary: 'RB', secondary: ['CB', 'RWB'], raw: 'Defender' },
  'Nordi Mukiele': { primary: 'RB', secondary: ['CB', 'RWB'], raw: 'Defender' },
  'G. Xhaka': { primary: 'CDM', secondary: ['CM'], raw: 'Midfielder' },
  'Granit Xhaka': { primary: 'CDM', secondary: ['CM'], raw: 'Midfielder' },
  'R. Andrich': { primary: 'CDM', secondary: ['CB', 'CM'], raw: 'Midfielder' },
  'Robert Andrich': { primary: 'CDM', secondary: ['CB', 'CM'], raw: 'Midfielder' },
  'E. Palacios': { primary: 'CM', secondary: ['CDM'], raw: 'Midfielder' },
  'Exequiel Palacios': { primary: 'CM', secondary: ['CDM'], raw: 'Midfielder' },
  'Aleix García': { primary: 'CM', secondary: ['CDM'], raw: 'Midfielder' },
  'Aleix Garcia': { primary: 'CM', secondary: ['CDM'], raw: 'Midfielder' },
  'F. Wirtz': { primary: 'CAM', secondary: ['LW', 'RW'], raw: 'Midfielder' },
  'Florian Wirtz': { primary: 'CAM', secondary: ['LW', 'RW'], raw: 'Midfielder' },
  'J. Hofmann': { primary: 'CAM', secondary: ['RM', 'RW'], raw: 'Midfielder' },
  'Jonas Hofmann': { primary: 'CAM', secondary: ['RM', 'RW'], raw: 'Midfielder' },
  'A. Adli': { primary: 'LW', secondary: ['RW', 'CAM'], raw: 'Attacker' },
  'Amine Adli': { primary: 'LW', secondary: ['RW', 'CAM'], raw: 'Attacker' },
  'M. Terrier': { primary: 'LW', secondary: ['ST', 'CAM'], raw: 'Attacker' },
  'Martin Terrier': { primary: 'LW', secondary: ['ST', 'CAM'], raw: 'Attacker' },
  'V. Boniface': { primary: 'ST', secondary: ['CF'], raw: 'Attacker' },
  'Victor Boniface': { primary: 'ST', secondary: ['CF'], raw: 'Attacker' },
  'P. Schick': { primary: 'ST', secondary: ['CF'], raw: 'Attacker' },
  'Patrik Schick': { primary: 'ST', secondary: ['CF'], raw: 'Attacker' },

  // === EINTRACHT FRANKFURT ===
  'K. Trapp': { primary: 'GK', raw: 'Goalkeeper' },
  'Kevin Trapp': { primary: 'GK', raw: 'Goalkeeper' },
  'K. Santos': { primary: 'GK', raw: 'Goalkeeper' },
  'J. Grahl': { primary: 'GK', raw: 'Goalkeeper' },
  'R. Koch': { primary: 'CB', raw: 'Defender' },
  'Robin Koch': { primary: 'CB', raw: 'Defender' },
  'Tuta': { primary: 'CB', secondary: ['CDM', 'RB'], raw: 'Defender' },
  'A. Theate': { primary: 'CB', secondary: ['LB'], raw: 'Defender' },
  'Arthur Theate': { primary: 'CB', secondary: ['LB'], raw: 'Defender' },
  'A. Amenda': { primary: 'CB', raw: 'Defender' },
  'N. Collins': { primary: 'CB', secondary: ['RB'], raw: 'Defender' },
  'R. Kristensen': { primary: 'RB', secondary: ['RWB'], raw: 'Defender' },
  'Rasmus Kristensen': { primary: 'RB', secondary: ['RWB'], raw: 'Defender' },
  'N. Nkounkou': { primary: 'LB', secondary: ['LWB'], raw: 'Defender' },
  'Niels Nkounkou': { primary: 'LB', secondary: ['LWB'], raw: 'Defender' },
  'E. Skhiri': { primary: 'CDM', secondary: ['CM'], raw: 'Midfielder' },
  'Ellyes Skhiri': { primary: 'CDM', secondary: ['CM'], raw: 'Midfielder' },
  'H. Larsson': { primary: 'CM', secondary: ['CDM'], raw: 'Midfielder' },
  'Hugo Larsson': { primary: 'CM', secondary: ['CDM'], raw: 'Midfielder' },
  'M. Dahoud': { primary: 'CM', secondary: ['CDM'], raw: 'Midfielder' },
  'Mahmoud Dahoud': { primary: 'CM', secondary: ['CDM'], raw: 'Midfielder' },
  'E. Ebimbe': { primary: 'RM', secondary: ['CM', 'RWB'], raw: 'Midfielder' },
  'Junior Dina Ebimbe': { primary: 'RM', secondary: ['CM', 'RWB'], raw: 'Midfielder' },
  'M. Götze': { primary: 'CAM', secondary: ['CM'], raw: 'Midfielder' },
  'Mario Götze': { primary: 'CAM', secondary: ['CM'], raw: 'Midfielder' },
  'Mario Gotze': { primary: 'CAM', secondary: ['CM'], raw: 'Midfielder' },
  'F. Chaïbi': { primary: 'CAM', secondary: ['LW', 'CM'], raw: 'Midfielder' },
  'Fares Chaibi': { primary: 'CAM', secondary: ['LW', 'CM'], raw: 'Midfielder' },
  'A. Knauff': { primary: 'RW', secondary: ['RM', 'LW'], raw: 'Attacker' },
  'Ansgar Knauff': { primary: 'RW', secondary: ['RM', 'LW'], raw: 'Attacker' },
  'C. Uzun': { primary: 'CAM', secondary: ['ST'], raw: 'Attacker' },
  'Can Uzun': { primary: 'CAM', secondary: ['ST'], raw: 'Attacker' },
  'O. Marmoush': { primary: 'ST', secondary: ['LW', 'CF'], raw: 'Attacker' },
  'Omar Marmoush': { primary: 'ST', secondary: ['LW', 'CF'], raw: 'Attacker' },
  'H. Ekitiké': { primary: 'ST', secondary: ['LW', 'CF'], raw: 'Attacker' },
  'Hugo Ekitike': { primary: 'ST', secondary: ['LW', 'CF'], raw: 'Attacker' },
  'I. Matanović': { primary: 'ST', raw: 'Attacker' },
  'Igor Matanovic': { primary: 'ST', raw: 'Attacker' },

  // === 1899 HOFFENHEIM ===
  'O. Baumann': { primary: 'GK', raw: 'Goalkeeper' },
  'Oliver Baumann': { primary: 'GK', raw: 'Goalkeeper' },
  'L. Philipp': { primary: 'GK', raw: 'Goalkeeper' },
  'O. Kabak': { primary: 'CB', raw: 'Defender' },
  'Ozan Kabak': { primary: 'CB', raw: 'Defender' },
  'K. Akpoguma': { primary: 'CB', secondary: ['RB'], raw: 'Defender' },
  'Kevin Akpoguma': { primary: 'CB', secondary: ['RB'], raw: 'Defender' },
  'A. Stach': { primary: 'CB', secondary: ['CDM', 'CM'], raw: 'Defender' },
  'Anton Stach': { primary: 'CB', secondary: ['CDM', 'CM'], raw: 'Defender' },
  'T. Drexler': { primary: 'CB', raw: 'Defender' },
  'Robin Hranáč': { primary: 'CB', raw: 'Defender' },
  'P. Kadeřábek': { primary: 'RWB', secondary: ['RB', 'RM'], raw: 'Defender' },
  'Pavel Kaderabek': { primary: 'RWB', secondary: ['RB', 'RM'], raw: 'Defender' },
  'V. Gendrey': { primary: 'RB', secondary: ['RWB'], raw: 'Defender' },
  'Valentin Gendrey': { primary: 'RB', secondary: ['RWB'], raw: 'Defender' },
  'A. Prass': { primary: 'LWB', secondary: ['LB', 'CM'], raw: 'Midfielder' },
  'Alexander Prass': { primary: 'LWB', secondary: ['LB', 'CM'], raw: 'Midfielder' },
  'D. Jurásek': { primary: 'LB', secondary: ['LWB'], raw: 'Defender' },
  'David Jurasek': { primary: 'LB', secondary: ['LWB'], raw: 'Defender' },
  'M. Bülter': { primary: 'LWB', secondary: ['LW', 'LM'], raw: 'Attacker' },
  'Marius Bülter': { primary: 'LWB', secondary: ['LW', 'LM'], raw: 'Attacker' },
  'F. Grillitsch': { primary: 'CDM', secondary: ['CB', 'CM'], raw: 'Midfielder' },
  'Florian Grillitsch': { primary: 'CDM', secondary: ['CB', 'CM'], raw: 'Midfielder' },
  'D. Geiger': { primary: 'CM', secondary: ['CDM'], raw: 'Midfielder' },
  'Dennis Geiger': { primary: 'CM', secondary: ['CDM'], raw: 'Midfielder' },
  'U. Tohumcu': { primary: 'CM', secondary: ['CDM'], raw: 'Midfielder' },
  'Tom Bischof': { primary: 'CAM', secondary: ['CM'], raw: 'Midfielder' },
  'T. Bischof': { primary: 'CAM', secondary: ['CM'], raw: 'Midfielder' },
  'A. Kramarić': { primary: 'CF', secondary: ['CAM', 'ST'], raw: 'Attacker' },
  'Andrej Kramaric': { primary: 'CF', secondary: ['CAM', 'ST'], raw: 'Attacker' },
  'A. Hložek': { primary: 'ST', secondary: ['LW', 'CAM'], raw: 'Attacker' },
  'Adam Hlozek': { primary: 'ST', secondary: ['LW', 'CAM'], raw: 'Attacker' },
  'M. Berisha': { primary: 'ST', raw: 'Attacker' },
  'Mergim Berisha': { primary: 'ST', raw: 'Attacker' },
  'H. Tabaković': { primary: 'ST', raw: 'Attacker' },
  'Haris Tabakovic': { primary: 'ST', raw: 'Attacker' },
  'Jacob Bruun Larsen': { primary: 'LW', secondary: ['RW'], raw: 'Attacker' },
  'J. Bruun Larsen': { primary: 'LW', secondary: ['RW'], raw: 'Attacker' },

  // === FC AUGSBURG ===
  'N. Labrović': { primary: 'GK', raw: 'Goalkeeper' },
  'Nediljko Labrovic': { primary: 'GK', raw: 'Goalkeeper' },
  'F. Dahmen': { primary: 'GK', raw: 'Goalkeeper' },
  'Finn Dahmen': { primary: 'GK', raw: 'Goalkeeper' },
  'J. Gouweleeuw': { primary: 'CB', raw: 'Defender' },
  'Jeffrey Gouweleeuw': { primary: 'CB', raw: 'Defender' },
  'K. Schlotterbeck': { primary: 'CB', raw: 'Defender' },
  'Keven Schlotterbeck': { primary: 'CB', raw: 'Defender' },
  'M. Bauer': { primary: 'CB', raw: 'Defender' },
  'Maximilian Bauer': { primary: 'CB', raw: 'Defender' },
  'C. Matsima': { primary: 'CB', secondary: ['RB'], raw: 'Defender' },
  'Chrislain Matsima': { primary: 'CB', secondary: ['RB'], raw: 'Defender' },
  'R. Oxford': { primary: 'CB', secondary: ['CDM'], raw: 'Defender' },
  'Marius Wolf': { primary: 'RB', secondary: ['RM', 'RWB'], raw: 'Defender' },
  'M. Wolf': { primary: 'RB', secondary: ['RM', 'RWB'], raw: 'Defender' },
  'R. Framberger': { primary: 'RB', raw: 'Defender' },
  'D. Giannoulis': { primary: 'LB', secondary: ['LWB'], raw: 'Defender' },
  'Dimitris Giannoulis': { primary: 'LB', secondary: ['LWB'], raw: 'Defender' },
  'M. Pedersen': { primary: 'LB', secondary: ['RB'], raw: 'Defender' },
  'Mads Pedersen': { primary: 'LB', secondary: ['RB'], raw: 'Defender' },
  'K. Jakić': { primary: 'CDM', secondary: ['CB', 'CM'], raw: 'Midfielder' },
  'Kristijan Jakic': { primary: 'CDM', secondary: ['CB', 'CM'], raw: 'Midfielder' },
  'T. Dorsch': { primary: 'CDM', secondary: ['CM'], raw: 'Midfielder' },
  'Niklas Dorsch': { primary: 'CDM', secondary: ['CM'], raw: 'Midfielder' },
  'E. Rexhbeçaj': { primary: 'CM', secondary: ['CDM'], raw: 'Midfielder' },
  'Elvis Rexhbecaj': { primary: 'CM', secondary: ['CDM'], raw: 'Midfielder' },
  'A. Maier': { primary: 'CAM', secondary: ['CM'], raw: 'Midfielder' },
  'Arne Maier': { primary: 'CAM', secondary: ['CM'], raw: 'Midfielder' },
  'F. Jensen': { primary: 'CAM', secondary: ['RW', 'CM'], raw: 'Midfielder' },
  'Fredrik Jensen': { primary: 'CAM', secondary: ['RW', 'CM'], raw: 'Midfielder' },
  'A. Claude-Maurice': { primary: 'CAM', secondary: ['LW', 'CM'], raw: 'Midfielder' },
  'Alexis Claude-Maurice': { primary: 'CAM', secondary: ['LW', 'CM'], raw: 'Midfielder' },
  'R. Vargas': { primary: 'LW', secondary: ['RW', 'CAM'], raw: 'Attacker' },
  'Ruben Vargas': { primary: 'LW', secondary: ['RW', 'CAM'], raw: 'Attacker' },
  'Y. Kömür': { primary: 'CAM', secondary: ['CM'], raw: 'Midfielder' },
  'M. Tietz': { primary: 'ST', secondary: ['CF'], raw: 'Attacker' },
  'Phillip Tietz': { primary: 'ST', secondary: ['CF'], raw: 'Attacker' },
  'S. Essende': { primary: 'ST', raw: 'Attacker' },
  'Samuel Essende': { primary: 'ST', raw: 'Attacker' },
  'S. Mounié': { primary: 'ST', raw: 'Attacker' },
  'Steve Mounie': { primary: 'ST', raw: 'Attacker' },
};

function determinePosition(name: string, rawPos: string, num: number | null, height: number | null) {
  if (TACTICAL_MAP[name]) return TACTICAL_MAP[name];

  const cleanRaw = (rawPos || '').toLowerCase();
  if (cleanRaw.includes('goal')) {
    return { primary: 'GK', raw: 'Goalkeeper' };
  }

  if (cleanRaw.includes('def')) {
    if (num === 2 || num === 12 || num === 22) return { primary: 'RB', secondary: ['RWB'], raw: 'Defender' };
    if (num === 3 || num === 13 || num === 23) return { primary: 'LB', secondary: ['LWB'], raw: 'Defender' };
    if (height && height < 178) return { primary: 'RB', secondary: ['LB'], raw: 'Defender' };
    return { primary: 'CB', raw: 'Defender' };
  }

  if (cleanRaw.includes('mid')) {
    if (num === 6 || num === 16 || num === 26) return { primary: 'CDM', secondary: ['CM'], raw: 'Midfielder' };
    if (num === 10) return { primary: 'CAM', secondary: ['CM', 'LW'], raw: 'Midfielder' };
    if (num === 7 || num === 11) return { primary: 'CAM', secondary: ['LW', 'RW'], raw: 'Midfielder' };
    return { primary: 'CM', secondary: ['CDM', 'CAM'], raw: 'Midfielder' };
  }

  if (cleanRaw.includes('att')) {
    if (num === 7 || num === 17) return { primary: 'RW', secondary: ['RM', 'LW'], raw: 'Attacker' };
    if (num === 11 || num === 27) return { primary: 'LW', secondary: ['LM', 'RW'], raw: 'Attacker' };
    return { primary: 'ST', secondary: ['CF'], raw: 'Attacker' };
  }

  return { primary: 'CM', raw: 'Midfielder' };
}

interface ClubTarget {
  name: string;
  apiTeamId: number;
  dbTeamId: string;
}

const CLUBS: ClubTarget[] = [
  { name: 'Bayer Leverkusen', apiTeamId: 168, dbTeamId: 'af3611cc-2674-4c5e-9944-927e5de886f3' },
  { name: 'Eintracht Frankfurt', apiTeamId: 169, dbTeamId: '3a13f433-b274-456e-8f3e-c82efd31be79' },
  { name: '1899 Hoffenheim', apiTeamId: 167, dbTeamId: 'b4684a7f-e8f5-4ba5-9762-3dae44e2702d' },
  { name: 'FC Augsburg', apiTeamId: 170, dbTeamId: '15a520da-e1d9-496b-9e20-cacab80dedbb' },
];

async function main() {
  console.log('======================================================================');
  console.log('=== SYNC MISSING 4 BUNDESLIGA CLUBS (LEVERKUSEN, FRANKFURT, ETC.)  ===');
  console.log('======================================================================\n');

  await LOCAL_CLIENT.connect();
  await SUPABASE_CLIENT.connect();
  console.log('✓ Connected to Local DB and Supabase Cloud.');

  let totalRequestsUsed = 0;
  let totalPlayersUpserted = 0;

  for (const club of CLUBS) {
    console.log(`\n▶ Syncing squad for ${club.name} (API ID: ${club.apiTeamId})...`);

    // 1. Fetch Page 1
    const p1 = await callApi(`/players?team=${club.apiTeamId}&season=2024&page=1`);
    totalRequestsUsed++;
    const totalPages = p1?.paging?.total || 1;
    let allPlayersResponse = [...(p1?.response || [])];

    console.log(`  Page 1 fetched: ${p1?.response?.length || 0} players (Total pages: ${totalPages})`);

    // Fetch remaining pages (up to page 3)
    for (let page = 2; page <= Math.min(3, totalPages); page++) {
      await sleep(DELAY_MS);
      const nextP = await callApi(`/players?team=${club.apiTeamId}&season=2024&page=${page}`);
      totalRequestsUsed++;
      allPlayersResponse.push(...(nextP?.response || []));
      console.log(`  Page ${page} fetched: ${nextP?.response?.length || 0} players`);
    }

    console.log(`  ✓ Total player profiles fetched for ${club.name}: ${allPlayersResponse.length}`);

    // Process each player
    for (const item of allPlayersResponse) {
      const pl = item.player;
      const stats = item.statistics?.[0];
      if (!pl || !pl.id) continue;

      const extId = String(pl.id);
      const name = pl.name;
      const shortName = pl.firstname && pl.lastname ? `${pl.firstname[0]}. ${pl.lastname}` : name;
      const dob = pl.birth?.date || null;
      const nationality = pl.nationality || null;
      const height = pl.height ? parseInt(pl.height.replace(/\D/g, ''), 10) || null : null;
      const weight = pl.weight ? parseInt(pl.weight.replace(/\D/g, ''), 10) || null : null;
      const img = pl.photo || null;
      const shirtNum = stats?.games?.number ? parseInt(stats.games.number, 10) : null;
      const rawApiPos = stats?.games?.position || pl.position || 'Midfielder';

      const pos = determinePosition(name, rawApiPos, shirtNum, height);

      // Upsert into Local DB
      const localRes = await LOCAL_CLIENT.query(
        `
        INSERT INTO players (
          id, external_provider, external_id, name, short_name, current_team_id,
          date_of_birth, nationality, height_cm, weight_kg, image_url,
          shirt_number, raw_position, primary_position, status, data_updated_at, created_at, updated_at
        ) VALUES (
          gen_random_uuid(), 'API_FOOTBALL', $1, $2, $3, $4,
          $5, $6, $7, $8, $9,
          $10, $11, $12, 'ACTIVE', NOW(), NOW(), NOW()
        )
        ON CONFLICT (external_provider, external_id) DO UPDATE SET
          name = EXCLUDED.name,
          short_name = EXCLUDED.short_name,
          current_team_id = EXCLUDED.current_team_id,
          date_of_birth = COALESCE(EXCLUDED.date_of_birth, players.date_of_birth),
          nationality = COALESCE(EXCLUDED.nationality, players.nationality),
          height_cm = COALESCE(EXCLUDED.height_cm, players.height_cm),
          weight_kg = COALESCE(EXCLUDED.weight_kg, players.weight_kg),
          image_url = COALESCE(EXCLUDED.image_url, players.image_url),
          shirt_number = COALESCE(EXCLUDED.shirt_number, players.shirt_number),
          raw_position = EXCLUDED.raw_position,
          primary_position = EXCLUDED.primary_position,
          data_updated_at = NOW(),
          updated_at = NOW()
        RETURNING id;
      `,
        [
          extId,
          name,
          shortName,
          club.dbTeamId,
          dob,
          nationality,
          height,
          weight,
          img,
          shirtNum,
          pos.raw,
          pos.primary,
        ],
      );
      const localPlayerId = localRes.rows[0].id;

      // Upsert into Supabase Cloud
      const supaRes = await SUPABASE_CLIENT.query(
        `
        INSERT INTO players (
          id, external_provider, external_id, name, short_name, current_team_id,
          date_of_birth, nationality, height_cm, weight_kg, image_url,
          shirt_number, raw_position, primary_position, status, data_updated_at, created_at, updated_at
        ) VALUES (
          $13, 'API_FOOTBALL', $1, $2, $3, $4,
          $5, $6, $7, $8, $9,
          $10, $11, $12, 'ACTIVE', NOW(), NOW(), NOW()
        )
        ON CONFLICT (external_provider, external_id) DO UPDATE SET
          name = EXCLUDED.name,
          short_name = EXCLUDED.short_name,
          current_team_id = EXCLUDED.current_team_id,
          date_of_birth = COALESCE(EXCLUDED.date_of_birth, players.date_of_birth),
          nationality = COALESCE(EXCLUDED.nationality, players.nationality),
          height_cm = COALESCE(EXCLUDED.height_cm, players.height_cm),
          weight_kg = COALESCE(EXCLUDED.weight_kg, players.weight_kg),
          image_url = COALESCE(EXCLUDED.image_url, players.image_url),
          shirt_number = COALESCE(EXCLUDED.shirt_number, players.shirt_number),
          raw_position = EXCLUDED.raw_position,
          primary_position = EXCLUDED.primary_position,
          data_updated_at = NOW(),
          updated_at = NOW()
        RETURNING id;
      `,
        [
          extId,
          name,
          shortName,
          club.dbTeamId,
          dob,
          nationality,
          height,
          weight,
          img,
          shirtNum,
          pos.raw,
          pos.primary,
          localPlayerId,
        ],
      );
      const supaPlayerId = supaRes.rows[0].id;

      // Sync player_positions on both
      const allPositions = [pos.primary, ...(pos.secondary || [])];
      for (const pCode of allPositions) {
        const isPri = pCode === pos.primary;
        await LOCAL_CLIENT.query(
          `INSERT INTO player_positions (id, player_id, position_code, is_primary)
           VALUES (gen_random_uuid(), $1, $2, $3)
           ON CONFLICT DO NOTHING;`,
          [localPlayerId, pCode, isPri],
        );
        await SUPABASE_CLIENT.query(
          `INSERT INTO player_positions (id, player_id, position_code, is_primary)
           VALUES (gen_random_uuid(), $1, $2, $3)
           ON CONFLICT DO NOTHING;`,
          [supaPlayerId, pCode, isPri],
        );
      }

      // Upsert current club in player_team_history
      await LOCAL_CLIENT.query(
        `
        INSERT INTO player_team_history (player_id, team_id, is_current)
        VALUES ($1, $2, true)
        ON CONFLICT (player_id, team_id, COALESCE(start_date, '1900-01-01'::date))
        DO UPDATE SET is_current = true;
      `,
        [localPlayerId, club.dbTeamId],
      );

      await SUPABASE_CLIENT.query(
        `
        INSERT INTO player_team_history (player_id, team_id, is_current)
        VALUES ($1, $2, true)
        ON CONFLICT (player_id, team_id, COALESCE(start_date, '1900-01-01'::date))
        DO UPDATE SET is_current = true;
      `,
        [supaPlayerId, club.dbTeamId],
      );

      totalPlayersUpserted++;
    }

    if (club !== CLUBS[CLUBS.length - 1]) {
      await sleep(DELAY_MS);
    }
  }

  console.log('\n======================================================================');
  console.log(`🎉 PHASE 1 COMPLETE!`);
  console.log(`  Requests used: ${totalRequestsUsed}`);
  console.log(`  Total player profiles created/updated: ${totalPlayersUpserted}`);
  console.log('======================================================================\n');

  // Verify Leverkusen count on Supabase
  const levRes = await SUPABASE_CLIENT.query(`
    SELECT count(*) as count FROM players WHERE current_team_id = 'af3611cc-2674-4c5e-9944-927e5de886f3';
  `);
  console.log(`Bayer Leverkusen squad on Supabase: ${levRes.rows[0].count} players`);

  await LOCAL_CLIENT.end();
  await SUPABASE_CLIENT.end();
}

main().catch((err) => {
  console.error('Fatal sync error:', err);
  process.exit(1);
});
