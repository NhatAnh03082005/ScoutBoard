const dns = require('dns');
dns.setDefaultResultOrder('ipv4first');
const { Client } = require('pg');

async function main() {
  const localClient = new Client({
    host: 'localhost',
    port: 5432,
    user: 'postgres',
    password: 'postgres123',
    database: 'scoutboard_db',
  });

  const supabaseClient = new Client({
    host: 'aws-0-ap-south-1.pooler.supabase.com',
    port: 6543,
    user: 'postgres.utpuxqpokpqnxpqqiens',
    password: '03082005Anhle@@',
    database: 'postgres',
    ssl: { rejectUnauthorized: false },
    statement_timeout: 60000,
  });

  await localClient.connect();
  await supabaseClient.connect();
  console.log('✓ Connected to Local DB and Supabase Cloud.');

  const compIds = [
    '3287afe2-608a-413c-a0b9-3f6b467586c4', // Bundesliga
    'aa209d46-caf3-40ea-ac88-fd516bb0dc18', // Serie A
    '974a6b13-5e12-4508-b45a-ac71a1098120', // Ligue 1
  ];

  const localSeasonStats = await localClient.query(
    `SELECT * FROM player_season_statistics WHERE competition_id = ANY($1::uuid[])`,
    [compIds],
  );

  console.log(`Found ${localSeasonStats.rows.length} season stats records in Local DB to push to Supabase Cloud.`);

  let pushed = 0;
  for (const s of localSeasonStats.rows) {
    await supabaseClient.query(
      `
      INSERT INTO player_season_statistics (
        id, player_id, season_id, competition_id, team_id,
        matches_played, starts, minutes_played, goals, assists,
        shots, shots_on_target, key_passes, passes_attempted, passes_completed,
        tackles, interceptions, yellow_cards, red_cards, duels_won,
        advanced_statistics, goals_per_90, assists_per_90, key_passes_per_90,
        tackles_per_90, interceptions_per_90, saves, goals_conceded,
        clean_sheets, penalties_saved, penalties_faced, saves_per_90,
        goals_conceded_per_90, save_percentage, created_at, updated_at
      ) VALUES (
        $1, $2, $3, $4, $5,
        $6, $7, $8, $9, $10,
        $11, $12, $13, $14, $15,
        $16, $17, $18, $19, $20,
        $21, $22, $23, $24,
        $25, $26, $27, $28,
        $29, $30, $31, $32,
        $33, $34, NOW(), NOW()
      )
      ON CONFLICT (player_id, season_id, competition_id, team_id) DO UPDATE SET
        matches_played = EXCLUDED.matches_played,
        starts = EXCLUDED.starts,
        minutes_played = EXCLUDED.minutes_played,
        goals = EXCLUDED.goals,
        assists = EXCLUDED.assists,
        shots = EXCLUDED.shots,
        shots_on_target = EXCLUDED.shots_on_target,
        key_passes = EXCLUDED.key_passes,
        passes_attempted = EXCLUDED.passes_attempted,
        passes_completed = EXCLUDED.passes_completed,
        tackles = EXCLUDED.tackles,
        interceptions = EXCLUDED.interceptions,
        yellow_cards = EXCLUDED.yellow_cards,
        red_cards = EXCLUDED.red_cards,
        duels_won = EXCLUDED.duels_won,
        advanced_statistics = EXCLUDED.advanced_statistics,
        goals_per_90 = EXCLUDED.goals_per_90,
        assists_per_90 = EXCLUDED.assists_per_90,
        key_passes_per_90 = EXCLUDED.key_passes_per_90,
        tackles_per_90 = EXCLUDED.tackles_per_90,
        interceptions_per_90 = EXCLUDED.interceptions_per_90,
        saves = EXCLUDED.saves,
        goals_conceded = EXCLUDED.goals_conceded,
        clean_sheets = EXCLUDED.clean_sheets,
        penalties_saved = EXCLUDED.penalties_saved,
        penalties_faced = EXCLUDED.penalties_faced,
        saves_per_90 = EXCLUDED.saves_per_90,
        goals_conceded_per_90 = EXCLUDED.goals_conceded_per_90,
        save_percentage = EXCLUDED.save_percentage,
        updated_at = NOW()
    `,
      [
        s.id,
        s.player_id,
        s.season_id,
        s.competition_id,
        s.team_id,
        s.matches_played ?? 0,
        s.starts ?? 0,
        s.minutes_played ?? 0,
        s.goals ?? 0,
        s.assists ?? 0,
        s.shots ?? 0,
        s.shots_on_target ?? 0,
        s.key_passes ?? 0,
        s.passes_attempted ?? 0,
        s.passes_completed ?? 0,
        s.tackles ?? 0,
        s.interceptions ?? 0,
        s.yellow_cards ?? 0,
        s.red_cards ?? 0,
        s.duels_won ?? 0,
        s.advanced_statistics ? JSON.stringify(s.advanced_statistics) : null,
        s.goals_per_90 !== null && !isNaN(s.goals_per_90) ? s.goals_per_90 : 0,
        s.assists_per_90 !== null && !isNaN(s.assists_per_90) ? s.assists_per_90 : 0,
        s.key_passes_per_90 !== null && !isNaN(s.key_passes_per_90) ? s.key_passes_per_90 : 0,
        s.tackles_per_90 !== null && !isNaN(s.tackles_per_90) ? s.tackles_per_90 : 0,
        s.interceptions_per_90 !== null && !isNaN(s.interceptions_per_90) ? s.interceptions_per_90 : 0,
        s.saves,
        s.goals_conceded,
        s.clean_sheets,
        s.penalties_saved,
        s.penalties_faced,
        s.saves_per_90,
        s.goals_conceded_per_90,
        s.save_percentage,
      ],
    );
    pushed++;
    if (pushed % 50 === 0 || pushed === localSeasonStats.rows.length) {
      console.log(`  Pushed ${pushed}/${localSeasonStats.rows.length} season stats...`);
    }
  }

  console.log(`✓ Successfully pushed ${pushed} season statistics to Supabase Cloud!`);

  // Audit
  const lCount = await localClient.query(
    `SELECT count(*) FROM player_season_statistics WHERE competition_id = ANY($1::uuid[])`,
    [compIds],
  );
  const sCount = await supabaseClient.query(
    `SELECT count(*) FROM player_season_statistics WHERE competition_id = ANY($1::uuid[])`,
    [compIds],
  );

  console.log(`\nLocal DB Season Stats: ${lCount.rows[0].count} | Supabase Cloud Season Stats: ${sCount.rows[0].count}`);

  await localClient.end();
  await supabaseClient.end();
}

main().catch(console.error);
