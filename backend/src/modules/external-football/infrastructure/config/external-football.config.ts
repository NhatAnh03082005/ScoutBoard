import { ConfigService } from '@nestjs/config';

export interface ExternalFootballConfig {
  baseUrl: string;
  apiKey: string;
  provider: string;
  timeoutMs: number;
}

export function getExternalFootballConfig(configService: ConfigService): ExternalFootballConfig {
  const baseUrl = configService.get<string>(
    'FOOTBALL_API_BASE_URL',
    'https://api.football-data.org/v4',
  ).replace(/\/+$/, '');

  const apiKey = configService.get<string>('FOOTBALL_API_KEY', '').trim();
  const provider = configService.get<string>('FOOTBALL_API_PROVIDER', 'football-data.org');
  const timeoutMs = Number(configService.get<string | number>('FOOTBALL_API_TIMEOUT', 10000)) || 10000;

  return {
    baseUrl,
    apiKey,
    provider,
    timeoutMs,
  };
}
