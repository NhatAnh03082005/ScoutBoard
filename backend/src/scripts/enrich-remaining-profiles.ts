import * as dotenv from 'dotenv';
dotenv.config();

import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { DataSource } from 'typeorm';
import { EnrichPlayerProfileUseCase } from '../modules/players/application/use-cases/enrich-player-profile.use-case';
import { ApiFootballPlayerMapper } from '../modules/external-football/infrastructure/mappers/api-football-player.mapper';
import * as https from 'https';
import * as dns from 'dns';

dns.setDefaultResultOrder('ipv4first');

const API_KEY =
  process.env.API_FOOTBALL_KEY || '09b395257421d95a43fa4fd945df43b7';
const BASE_HOST = 'v3.football.api-sports.io';
const DELAY_BETWEEN_CALLS_MS = 6200; // Strictly adhere to 10 requests / minute max (6.2s delay)
const SAFETY_RESERVE_REQUESTS = 5; // Never spend below this threshold

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function rawApiCall(path: string): Promise<any> {
  return new Promise((resolve, reject) => {
    const req = https.request(
      {
        hostname: BASE_HOST,
        path: path.startsWith('/') ? path : `/${path}`,
        method: 'GET',
        headers: {
          'x-apisports-key': API_KEY,
          Accept: 'application/json',
        },
      },
      (res) => {
        let data = '';
        res.on('data', (chunk) => (data += chunk));
        res.on('end', () => {
          try {
            resolve(JSON.parse(data));
          } catch (e) {
            resolve({ raw: data, status: res.statusCode });
          }
        });
      },
    );

    req.on('error', reject);
    req.end();
  });
}

async function callApiWithRetry(path: string, maxRetries = 3): Promise<any> {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    const res = await rawApiCall(path);

    if (res?.errors) {
      const errStr = JSON.stringify(res.errors);
      if (
        errStr.toLowerCase().includes('rate') ||
        errStr.toLowerCase().includes('limit')
      ) {
        console.warn(
          `  [Rate Limit / Quota Notice] on ${path} (Attempt ${attempt}/${maxRetries}): ${errStr}. Waiting 10s...`,
        );
        await sleep(10000);
        continue;
      }
    }

    return res;
  }
  return rawApiCall(path);
}

async function main() {
  console.log('====================================================');
  console.log('API-FOOTBALL PLAYER PROFILE ENRICHMENT PIPELINE');
  console.log(
    'Pipeline: API-Football -> DTO -> Mapper -> UseCase -> Repository -> PostgreSQL',
  );
  console.log('====================================================\n');

  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: ['error', 'warn'],
  });

  try {
    const dataSource = app.get(DataSource);
    const enrichPlayerProfileUseCase = app.get(EnrichPlayerProfileUseCase);

    // 1. Initial Database Coverage Audit
    console.log('--- 1. INITIAL COVERAGE AUDIT ---');
    const preCoverage = await dataSource.query(`
      SELECT
        COUNT(*) AS total_players,
        COUNT(date_of_birth) AS has_dob,
        COUNT(nationality) AS has_nationality,
        COUNT(height_cm) AS has_height,
        COUNT(weight_kg) AS has_weight,
        COUNT(image_url) AS has_photo,
        COUNT(shirt_number) AS has_shirt_number
      FROM players;
    `);

    const pre = preCoverage[0];
    const total = parseInt(pre.total_players, 10);
    console.table({
      'Total Players': total,
      'DOB Populated': `${pre.has_dob} (Missing: ${total - parseInt(pre.has_dob, 10)})`,
      'Nationality Populated': `${pre.has_nationality} (Missing: ${total - parseInt(pre.has_nationality, 10)})`,
      'Height Populated': `${pre.has_height} (Missing: ${total - parseInt(pre.has_height, 10)})`,
      'Weight Populated': `${pre.has_weight} (Missing: ${total - parseInt(pre.has_weight, 10)})`,
      'Photo Populated': `${pre.has_photo} (Missing: ${total - parseInt(pre.has_photo, 10)})`,
      'Shirt Number Populated': `${pre.has_shirt_number} (Missing: ${total - parseInt(pre.has_shirt_number, 10)})`,
    });

    // 2. Check API Quota
    console.log('\n--- 2. CHECKING API-FOOTBALL QUOTA ---');
    const statusRes = await callApiWithRetry('/status');
    const requestsInfo = statusRes?.response?.requests;
    const limitDay = requestsInfo?.limit_day || 100;
    const currentRequests = requestsInfo?.current || 0;
    let remainingQuota = limitDay - currentRequests;
    console.log(
      `Daily Quota: ${currentRequests}/${limitDay} used. Remaining: ${remainingQuota}\n`,
    );

    if (remainingQuota <= SAFETY_RESERVE_REQUESTS) {
      console.warn(
        `[QUOTA LIMIT] Only ${remainingQuota} request(s) left today (Safety reserve: ${SAFETY_RESERVE_REQUESTS}). Stopping safely to prevent HTTP 429 lockout.`,
      );
    } else {
      // 3. Find Players Where Required Profile Fields Are Missing (Prioritizing Active Match Players)
      console.log(
        '--- 3. FINDING INCOMPLETE PLAYERS (ACTIVE MATCH PLAYERS FIRST) ---',
      );
      const incompletePlayers = await dataSource.query(`
        SELECT p.id, p.name, p.external_id, t.name as team_name, COUNT(pms.id) as match_count
        FROM players p
        JOIN player_match_statistics pms ON pms.player_id = p.id
        LEFT JOIN teams t ON t.id = p.current_team_id
        WHERE (p.date_of_birth IS NULL OR p.nationality IS NULL OR p.height_cm IS NULL OR p.weight_kg IS NULL)
        GROUP BY p.id, p.name, p.external_id, t.name
        ORDER BY match_count DESC, p.name ASC;
      `);

      const maxToProcess = Math.min(
        incompletePlayers.length,
        Math.max(0, remainingQuota - SAFETY_RESERVE_REQUESTS),
      );

      console.log(
        `Found ${incompletePlayers.length} active match players needing profile enrichment.`,
      );
      console.log(
        `Will process up to ${maxToProcess} players (preserving ${SAFETY_RESERVE_REQUESTS} safety reserve requests).\n`,
      );

      let processedCount = 0;
      let enrichedCount = 0;

      for (let i = 0; i < maxToProcess; i++) {
        if (remainingQuota <= SAFETY_RESERVE_REQUESTS) {
          console.warn(
            `\n[SAFETY STOP] Daily quota threshold reached (${remainingQuota} remaining). Stopping safely to prevent HTTP 429 lockout.`,
          );
          break;
        }

        const player = incompletePlayers[i];
        console.log(
          `[${i + 1}/${maxToProcess}] Processing ${player.name} (ExtID: ${player.external_id} | ${player.team_name || 'Free Agent'} | ${player.match_count} matches)...`,
        );

        await sleep(DELAY_BETWEEN_CALLS_MS);

        try {
          const profileRes = await callApiWithRetry(
            `/players/profiles?player=${player.external_id}`,
          );
          remainingQuota--;
          processedCount++;

          // Verify API payload before persisting
          const profileData = profileRes?.response?.[0]?.player;
          if (!profileData || !profileData.id) {
            console.warn(
              `  -> No profile data returned for ${player.name} (ExtID: ${player.external_id})`,
            );
            continue;
          }

          // Map response using official Mapper
          const mappedEnrichment =
            ApiFootballPlayerMapper.fromSingleProfile(profileData);

          // Persist through official Use Case and Repository
          await enrichPlayerProfileUseCase.execute({
            playerId: player.id,
            enrichment: mappedEnrichment,
          });

          enrichedCount++;
          console.log(
            `  -> Enriched: DOB=${mappedEnrichment.dateOfBirth ?? 'NULL'}, Nat=${mappedEnrichment.nationality ?? 'NULL'}, H=${mappedEnrichment.heightCm ?? 'NULL'}cm, W=${mappedEnrichment.weightKg ?? 'NULL'}kg (Quota left: ~${remainingQuota})`,
          );
        } catch (err: any) {
          console.error(`  -> Failed for ${player.name}: ${err.message}`);
        }
      }

      console.log('\n====================================================');
      console.log(
        `BATCH FINISHED: ${processedCount} API requests made, ${enrichedCount} players successfully enriched.`,
      );
      console.log('====================================================\n');
    }

    // 4. Post-Batch Coverage Audit
    console.log('--- 4. POST-BATCH COVERAGE AUDIT ---');
    const postCoverage = await dataSource.query(`
      SELECT
        COUNT(*) AS total_players,
        COUNT(date_of_birth) AS has_dob,
        COUNT(nationality) AS has_nationality,
        COUNT(height_cm) AS has_height,
        COUNT(weight_kg) AS has_weight,
        COUNT(image_url) AS has_photo,
        COUNT(shirt_number) AS has_shirt_number
      FROM players;
    `);

    const post = postCoverage[0];
    const postTotal = parseInt(post.total_players, 10);
    console.table({
      'Total Players': postTotal,
      'DOB Populated': `${post.has_dob} (Missing: ${postTotal - parseInt(post.has_dob, 10)})`,
      'Nationality Populated': `${post.has_nationality} (Missing: ${postTotal - parseInt(post.has_nationality, 10)})`,
      'Height Populated': `${post.has_height} (Missing: ${postTotal - parseInt(post.has_height, 10)})`,
      'Weight Populated': `${post.has_weight} (Missing: ${postTotal - parseInt(post.has_weight, 10)})`,
      'Photo Populated': `${post.has_photo} (Missing: ${postTotal - parseInt(post.has_photo, 10)})`,
      'Shirt Number Populated': `${post.has_shirt_number} (Missing: ${postTotal - parseInt(post.has_shirt_number, 10)})`,
    });
  } finally {
    await app.close();
  }
}

main().catch((err) => {
  console.error('Fatal error in enrichment pipeline:', err);
  process.exit(1);
});
