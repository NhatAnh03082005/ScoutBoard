import * as dotenv from 'dotenv';
import * as path from 'path';
import * as https from 'https';
import * as dns from 'dns';
import { Client } from 'pg';

dns.setDefaultResultOrder('ipv4first');
dotenv.config({ path: path.resolve(__dirname, '../../backend/.env') });

const API_KEY = process.env.API_FOOTBALL_KEY || '09b395257421d95a43fa4fd945df43b7';
const BASE_HOST = 'v3.football.api-sports.io';
const DB_HOST = process.env.POSTGRES_HOST || 'localhost';
const DB_PORT = parseInt(process.env.POSTGRES_PORT || '5432', 10);
const DB_USER = process.env.POSTGRES_USER || 'postgres';
const DB_PASSWORD = process.env.POSTGRES_PASSWORD || 'postgres123';
const DB_NAME = process.env.POSTGRES_DB || 'scoutboard_db';

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

function callApi(endpoint: string): Promise<any> {
  const cleanPath = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  return new Promise((resolve, reject) => {
    const req = https.request(
      {
        hostname: BASE_HOST,
        path: cleanPath,
        method: 'GET',
        headers: { 'x-apisports-key': API_KEY, Accept: 'application/json' },
        family: 4,
        timeout: 20000,
      },
      (res) => {
        let body = '';
        res.on('data', (c) => (body += c));
        res.on('end', () => {
          try {
            resolve(JSON.parse(body));
          } catch (e) {
            resolve({ raw: body });
          }
        });
      },
    );
    req.on('error', reject);
    req.end();
  });
}

function mapPos(raw?: string) {
  const p = (raw || '').toLowerCase();
  if (p.includes('goal') || p === 'gk') return 'GK';
  if (p.includes('def')) return 'CB';
  if (p.includes('mid')) return 'CM';
  if (p.includes('att') || p.includes('for')) return 'ST';
  return 'CM';
}

async function main() {
  const client = new Client({ host: DB_HOST, port: DB_PORT, user: DB_USER, password: DB_PASSWORD, database: DB_NAME });
  await client.connect();

  const missingTeams = await client.query(`
    SELECT t.id, t.name, t.external_id
    FROM teams t
    LEFT JOIN players p ON p.current_team_id = t.id
    WHERE t.country = 'Germany'
    GROUP BY t.id, t.name, t.external_id
    HAVING count(p.id) = 0;
  `);

  console.log(`Missing teams count: ${missingTeams.rows.length}`);

  for (const team of missingTeams.rows) {
    console.log(`Fetching squad for ${team.name} (ExtID: ${team.external_id})...`);
    const data = await callApi(`/players/squads?team=${team.external_id}`);
    const players = data?.response?.[0]?.players || [];
    console.log(`Received ${players.length} players for ${team.name}`);

    for (const pl of players) {
      const pos = mapPos(pl.position);
      const pRes = await client.query(`
        INSERT INTO players (current_team_id, external_provider, external_id, name, short_name, primary_position, shirt_number, image_url, status, data_updated_at)
        VALUES ($1, 'API_FOOTBALL', $2, $3, $3, $4, $5, $6, 'ACTIVE', NOW())
        ON CONFLICT (external_provider, external_id)
        DO UPDATE SET current_team_id = $1, name = $3, primary_position = COALESCE(players.primary_position, $4), shirt_number = COALESCE($5, players.shirt_number), image_url = COALESCE($6, players.image_url), data_updated_at = NOW()
        RETURNING id;
      `, [team.id, String(pl.id), pl.name, pos, pl.number || null, pl.photo || null]);
      const pId = pRes.rows[0].id;

      // Safe position insert
      const hasPrimary = await client.query(`SELECT 1 FROM player_positions WHERE player_id = $1 AND is_primary = true`, [pId]);
      await client.query(`
        INSERT INTO player_positions (player_id, position_code, is_primary)
        VALUES ($1, $2, $3)
        ON CONFLICT (player_id, position_code) DO NOTHING;
      `, [pId, pos, hasPrimary.rowCount === 0]);

      // Team history
      await client.query(`
        INSERT INTO player_team_history (player_id, team_id, shirt_number, is_current)
        VALUES ($1, $2, $3, true)
        ON CONFLICT DO NOTHING;
      `, [pId, team.id, pl.number || null]);
    }
    await sleep(6200);
  }

  await client.end();
  console.log('Finished 4 teams.');
}

main().catch(console.error);
