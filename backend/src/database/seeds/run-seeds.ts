import AppDataSource from '../data-source';
import { seedRoles } from './role.seed';
import { seedAdminUser } from './admin.seed';

async function runSeeds() {
  console.log('🌱 Starting database seeding...');
  try {
    await AppDataSource.initialize();
    console.log('🔌 Connected to PostgreSQL for seeding.');

    const { adminRole } = await seedRoles(AppDataSource);
    await seedAdminUser(AppDataSource, adminRole);

    console.log('🎉 Seeding completed successfully!');
  } catch (error) {
    console.error('❌ Error during seeding:', error);
  } finally {
    if (AppDataSource.isInitialized) {
      await AppDataSource.destroy();
    }
  }
}

runSeeds();
