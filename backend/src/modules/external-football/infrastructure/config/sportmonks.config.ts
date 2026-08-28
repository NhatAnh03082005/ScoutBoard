import { ConfigService } from '@nestjs/config';

export interface SportmonksConfig {
  baseUrl: string;
  apiKey: string;
  provider: string;
  timeoutMs: number;
}

export function getSportmonksConfig(configService: ConfigService): SportmonksConfig {
  const baseUrl = configService
    .get<string>('SPORTMONKS_API_BASE_URL', 'https://api.sportmonks.com/v3/football')
    .replace(/\/+$/, '');

  const apiKey = configService.get<string>('SPORTMONKS_API_KEY', '').trim();
  const provider = configService.get<string>('SPORTMONKS_PROVIDER', 'SPORTMONKS');
  const timeoutMs = Number(configService.get<string | number>('SPORTMONKS_TIMEOUT', 10000)) || 10000;

  return {
    baseUrl,
    apiKey,
    provider,
    timeoutMs,
  };
}
