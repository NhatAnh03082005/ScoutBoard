import AppDataSource from '../data-source';
import { seedRoles } from './app/role.seed';
import { seedAdminUser } from './app/admin.seed';
import { seedFootballZone2 } from './app/football-zone2.seed';

async function runSeeds() {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('Seeds must not run in production environment');
  }

  console.log('🌱 Starting database seeding...');
  try {
    await AppDataSource.initialize();
    console.log('🔌 Connected to PostgreSQL for seeding.');

    const { adminRole } = await seedRoles(AppDataSource);
    await seedAdminUser(AppDataSource, adminRole);
    await seedFootballZone2(AppDataSource);

    console.log('🎉 Seeding completed successfully!');
  } catch (error) {
    console.error('❌ Error during seeding:', error);
  } finally {
    if (AppDataSource.isInitialized) {
      await AppDataSource.destroy();
    }
  }
}

void runSeeds();
