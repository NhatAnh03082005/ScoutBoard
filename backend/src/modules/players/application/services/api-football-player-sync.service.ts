import { Injectable, Inject, Logger, Optional } from '@nestjs/common';
import {
  API_FOOTBALL_CLIENT,
  ApiFootballClientPort,
} from '../../../external-football/application/ports/api-football-client.port';
import { ApiFootballPlayerMapper } from '../../../external-football/infrastructure/mappers/api-football-player.mapper';
import { PersistPlayerUseCase } from '../use-cases/persist-player.use-case';
import { PersistPlayerPositionsUseCase } from '../use-cases/persist-player-positions.use-case';
import { PersistPlayerTeamHistoryUseCase } from '../use-cases/persist-player-team-history.use-case';

export interface PlayerSyncResult {
  totalSquadPlayers: number;
  persistedPlayers: number;
  positionsPersisted: number;
  historyPersisted: number;
  playerIds: string[];
  errors: { externalId: string; name?: string; error: string }[];
}

@Injectable()
export class ApiFootballPlayerSyncService {
  private readonly logger = new Logger(ApiFootballPlayerSyncService.name);

  constructor(
    @Inject(API_FOOTBALL_CLIENT)
    private readonly apiClient: ApiFootballClientPort,
    private readonly persistPlayerUseCase: PersistPlayerUseCase,
    private readonly persistPlayerPositionsUseCase: PersistPlayerPositionsUseCase,
    @Optional()
    private readonly persistPlayerTeamHistoryUseCase?: PersistPlayerTeamHistoryUseCase,
  ) {}

  async syncSquadForTeam(
    teamInternalId: string,
    teamExternalId: string | number,
    options: { fetchTransfers?: boolean } = {},
  ): Promise<PlayerSyncResult> {
    const teamExtId = String(teamExternalId);
    this.logger.log(`Fetching squad for team ${teamExtId} from API-Football...`);

    const res = await this.apiClient.getSquadByTeam({ team: parseInt(teamExtId, 10) });
    const teamResponse = res?.response?.[0];
    const squadPlayers = teamResponse?.players || [];

    this.logger.log(
      `Received ${squadPlayers.length} squad players for team ${teamExtId} (${teamResponse?.team?.name || 'Team'})`,
    );

    let persistedPlayers = 0;
    let positionsPersisted = 0;
    let historyPersisted = 0;
    const playerIds: string[] = [];
    const errors: { externalId: string; name?: string; error: string }[] = [];

    for (const sp of squadPlayers) {
      const extId = String(sp.id);
      const playerName = sp.name || 'Unknown';

      try {
        const transformed = ApiFootballPlayerMapper.toTransformedPlayerFromSquad(
          sp,
          teamExtId,
        );

        const persistRes = await this.persistPlayerUseCase.execute(transformed);
        const internalPlayerId = persistRes.id;
        playerIds.push(internalPlayerId);

        persistedPlayers++;

        // Persist primary position if available
        if (transformed.primaryPosition) {
          try {
            await this.persistPlayerPositionsUseCase.execute({
              playerId: internalPlayerId,
              positionCode: transformed.primaryPosition,
              isPrimary: true,
            });
            positionsPersisted++;
          } catch (posErr: any) {
            this.logger.warn(
              `Could not persist position ${transformed.primaryPosition} for player ${playerName} (${extId}): ${posErr.message}`,
            );
          }
        }

        // Persist current team history
        if (this.persistPlayerTeamHistoryUseCase && teamInternalId) {
          try {
            await this.persistPlayerTeamHistoryUseCase.execute({
              playerId: internalPlayerId,
              teamId: teamInternalId,
              isCurrent: true,
              shirtNumber: transformed.shirtNumber,
              externalProvider: 'API_FOOTBALL',
            });
            historyPersisted++;
          } catch (histErr: any) {
            this.logger.warn(
              `Could not persist current team history for player ${playerName} (${extId}): ${histErr.message}`,
            );
          }

          // Optional: fetch transfers from API-Football
          if (options.fetchTransfers) {
            try {
              const transferRes = await this.apiClient.getTransfers({
                player: parseInt(extId, 10),
              });
              const transfers = transferRes?.response?.[0]?.transfers || [];
              for (const t of transfers) {
                if (t.date) {
                  await this.persistPlayerTeamHistoryUseCase.execute({
                    playerId: internalPlayerId,
                    startDate: t.date,
                    teamExternalId: t.teams?.in?.id ? String(t.teams.in.id) : undefined,
                    isCurrent: false,
                    externalProvider: 'API_FOOTBALL',
                  });
                  historyPersisted++;
                }
              }
            } catch (trErr: any) {
              this.logger.debug(
                `Transfers fetch skipped or failed for player ${extId}: ${trErr.message}`,
              );
            }
          }
        }
      } catch (err: any) {
        this.logger.error(
          `Failed to sync player ${playerName} (${extId}): ${err.message}`,
        );
        errors.push({
          externalId: extId,
          name: playerName,
          error: err.message,
        });
      }
    }

    return {
      totalSquadPlayers: squadPlayers.length,
      persistedPlayers,
      positionsPersisted,
      historyPersisted,
      playerIds,
      errors,
    };
  }
}
