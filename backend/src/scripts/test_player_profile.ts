import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import {
  API_FOOTBALL_CLIENT,
  ApiFootballClientPort,
} from '../modules/external-football/application/ports/api-football-client.port';

async function main() {
  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: false,
  });
  const client = app.get<any>(API_FOOTBALL_CLIENT);

  console.log('Testing getPlayers for Diogo Dalot (886)...');
  try {
    const res = await client.getPlayers({ id: 886, season: 2024 });
    const p = res?.response?.[0];
    console.log('Player info:');
    console.log('Name:', p?.player?.name);
    console.log('Position on profile:', p?.player?.position);
    console.log('Statistics length:', p?.statistics?.length);
    if (p?.statistics?.[0]) {
      console.log('Games position:', p.statistics[0].games?.position);
      console.log('Team:', p.statistics[0].team?.name);
    }
  } catch (err: any) {
    console.error('Error fetching player:', err.message);
  }

  console.log('\nTesting fixture lineups for 1208021...');
  try {
    const fixtureRes = await client.request('/fixtures/lineups', {
      fixture: 1208021,
    });
    const mu = fixtureRes?.response?.[0];
    console.log('MU startXI:');
    console.table(
      mu?.startXI?.map((x: any) => ({
        id: x.player?.id,
        name: x.player?.name,
        pos: x.player?.pos,
        grid: x.player?.grid,
      })),
    );
  } catch (err: any) {
    console.error('Error fetching lineups:', err.message);
  }

  await app.close();
}

main().catch(console.error);
