const { DataSource } = require('../backend/node_modules/typeorm');
const { PlayerOrmEntity } = require('../backend/dist/modules/players/infrastructure/persistence/typeorm/entities/player.orm-entity');
const { TeamOrmEntity } = require('../backend/dist/modules/teams/infrastructure/persistence/typeorm/entities/team.orm-entity');
const { PlayerPositionOrmEntity } = require('../backend/dist/modules/players/infrastructure/persistence/typeorm/entities/player-position.orm-entity');

const ds = new DataSource({
  type: 'postgres',
  host: 'localhost',
  port: 5432,
  username: 'postgres',
  password: 'postgres123',
  database: 'scoutboard_db',
  entities: [PlayerOrmEntity, TeamOrmEntity, PlayerPositionOrmEntity],
  synchronize: false,
});

async function run() {
  await ds.initialize();
  console.log('DB connected');

  const repo = ds.getRepository(PlayerOrmEntity);

  try {
    console.log('--- Attempt 1: addSelect + orderBy alias ---');
    const qb1 = repo
      .createQueryBuilder('player')
      .leftJoinAndSelect('player.currentTeam', 'currentTeam')
      .leftJoinAndSelect('player.positions', 'positions')
      .innerJoin('player_season_statistics', 'pss', 'pss.player_id = player.id')
      .where('player.primary_position = :pos', { pos: 'CM' })
      .addSelect('pss.goals_per_90', 'metric_order')
      .orderBy('metric_order', 'DESC')
      .addOrderBy('player.name', 'ASC')
      .take(10)
      .skip(0);

    const res1 = await qb1.getManyAndCount();
    console.log('Attempt 1 succeeded! Total:', res1[1], 'Items:', res1[0].length);
  } catch (e) {
    console.log('Attempt 1 failed:', e.message);
  }

  try {
    console.log('\n--- Attempt 2: getRawMany or manual ID subquery ---');
    // If take/skip fails with innerJoin on table, we can select IDs first or use limit/offset
    const idQb = repo
      .createQueryBuilder('player')
      .innerJoin('player_season_statistics', 'pss', 'pss.player_id = player.id')
      .where('player.primary_position = :pos', { pos: 'CM' })
      .select('player.id', 'id')
      .addSelect('MAX(pss.goals_per_90)', 'metric')
      .groupBy('player.id, player.name')
      .orderBy('metric', 'DESC')
      .addOrderBy('player.name', 'ASC')
      .limit(10)
      .offset(0);

    const raw = await idQb.getRawMany();
    console.log('Attempt 2 raw IDs count:', raw.length);
  } catch (e) {
    console.log('Attempt 2 failed:', e.message);
  }

  await ds.destroy();
}

run().catch(console.error);
