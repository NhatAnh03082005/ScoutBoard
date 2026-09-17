import { DataSource, DataSourceOptions } from 'typeorm';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

if (process.env.NODE_ENV === 'production') {
  if (!process.env.POSTGRES_HOST) {
    throw new Error('POSTGRES_HOST is required in production.');
  }
  if (!process.env.POSTGRES_DB) {
    throw new Error('POSTGRES_DB is required in production.');
  }
  if (!process.env.POSTGRES_USER) {
    throw new Error('POSTGRES_USER is required in production.');
  }
  if (
    !process.env.POSTGRES_PASSWORD ||
    process.env.POSTGRES_PASSWORD === 'postgres123'
  ) {
    throw new Error(
      'POSTGRES_PASSWORD must be configured with a secure password in production.',
    );
  }
}

export const dataSourceOptions: DataSourceOptions = {
  type: 'postgres',
  host: process.env.POSTGRES_HOST || 'localhost',
  port: parseInt(process.env.POSTGRES_PORT || '5432', 10),
  username: process.env.POSTGRES_USER || 'postgres',
  password: process.env.POSTGRES_PASSWORD || 'postgres123',
  database: process.env.POSTGRES_DB || 'scoutboard_db',
  entities: [path.join(__dirname, '../**/*.{entity,orm-entity}.{ts,js}')],
  migrations: [path.join(__dirname, './migrations/*.{ts,js}')],
  synchronize: false,
  logging: process.env.NODE_ENV === 'development',
  ssl:
    process.env.POSTGRES_SSL === 'true'
      ? { rejectUnauthorized: false }
      : false,
};

const AppDataSource = new DataSource(dataSourceOptions);
export default AppDataSource;
