import {
  Injectable,
  Inject,
  Logger,
  BadRequestException,
} from '@nestjs/common';
import {
  API_FOOTBALL_CLIENT,
  ApiFootballClientPort,
} from '../../../external-football/application/ports/api-football-client.port';
import { ApiFootballPlayerMapper } from '../../../external-football/infrastructure/mappers/api-football-player.mapper';
import { EnrichPlayerProfileUseCase } from '../use-cases/enrich-player-profile.use-case';
import {
  PLAYER_WRITE_REPOSITORY,
  PlayerWriteRepository,
} from '../ports/player-write.repository';
import {
  TEAM_WRITE_REPOSITORY,
  TeamWriteRepository,
} from '../../../teams/application/ports/team-write.repository';
import { PlayerOrmEntity } from '../../infrastructure/persistence/typeorm/entities/player.orm-entity';
import { TeamOrmEntity } from '../../../teams/infrastructure/persistence/typeorm/entities/team.orm-entity';

export interface PlayerEnrichmentBatchResult {
  totalCandidates: number;
  enrichedCount: number;
  unmatchedCount: number;
  failedCount: number;
  enrichedPlayers: Array<{
    playerId: string;
    playerName: string;
    photoUrl: string | null;
  }>;
  errors: Array<{ playerId?: string; error: string }>;
}

@Injectable()
export class PlayerEnrichmentSyncService {
  private readonly logger = new Logger(PlayerEnrichmentSyncService.name);

  constructor(
    @Inject(API_FOOTBALL_CLIENT)
    private readonly apiFootballClient: ApiFootballClientPort,
    private readonly enrichPlayerProfileUseCase: EnrichPlayerProfileUseCase,
    @Inject(PLAYER_WRITE_REPOSITORY)
    private readonly playerWriteRepository: PlayerWriteRepository,
    @Inject(TEAM_WRITE_REPOSITORY)
    private readonly teamWriteRepository: TeamWriteRepository,
  ) {}

  private static readonly TEAM_NAME_TO_API_FOOTBALL_ID: Record<string, number> =
    {
      ARS: 42,
      ARSENAL: 42,
      'ARSENAL FC': 42,
      AVL: 66,
      'ASTON VILLA': 66,
      'ASTON VILLA FC': 66,
      BOU: 35,
      BOURNEMOUTH: 35,
      'AFC BOURNEMOUTH': 35,
      BRE: 55,
      BRENTFORD: 55,
      'BRENTFORD FC': 55,
      BHA: 51,
      BRIGHTON: 51,
      'BRIGHTON & HOVE ALBION': 51,
      'BRIGHTON & HOVE ALBION FC': 51,
      CHE: 49,
      CHELSEA: 49,
      'CHELSEA FC': 49,
      CRY: 52,
      'CRYSTAL PALACE': 52,
      'CRYSTAL PALACE FC': 52,
      EVE: 45,
      EVERTON: 45,
      'EVERTON FC': 45,
      FUL: 36,
      FULHAM: 36,
      'FULHAM FC': 36,
      IPS: 57,
      IPSWICH: 57,
      'IPSWICH TOWN': 57,
      'IPSWICH TOWN FC': 57,
      LEI: 46,
      LEICESTER: 46,
      'LEICESTER CITY': 46,
      'LEICESTER CITY FC': 46,
      LIV: 40,
      LIVERPOOL: 40,
      'LIVERPOOL FC': 40,
      MCI: 50,
      'MAN CITY': 50,
      'MANCHESTER CITY': 50,
      'MANCHESTER CITY FC': 50,
      MUN: 33,
      'MAN UNITED': 33,
      'MANCHESTER UNITED': 33,
      'MANCHESTER UNITED FC': 33,
      NEW: 34,
      NEWCASTLE: 34,
      'NEWCASTLE UNITED': 34,
      'NEWCASTLE UNITED FC': 34,
      NFO: 65,
      NOTTINGHAM: 65,
      'NOTTINGHAM FOREST': 65,
      'NOTTINGHAM FOREST FC': 65,
      SOU: 41,
      SOUTHAMPTON: 41,
      'SOUTHAMPTON FC': 41,
      TOT: 47,
      TOTTENHAM: 47,
      'TOTTENHAM HOTSPUR': 47,
      'TOTTENHAM HOTSPUR FC': 47,
      BUR: 44,
      BURNLEY: 44,
      'BURNLEY FC': 44,
      LEE: 63,
      LEEDS: 63,
      'LEEDS UNITED': 63,
      'LEEDS UNITED FC': 63,
      SUN: 746,
      SUNDERLAND: 746,
      'SUNDERLAND AFC': 746,
      HUL: 68,
      HULL: 68,
      'HULL CITY': 68,
      'HULL CITY AFC': 68,
      COV: 1359,
      COVENTRY: 1359,
      'COVENTRY CITY': 1359,
      'COVENTRY CITY FC': 1359,
      WHU: 48,
      'WEST HAM': 48,
      'WEST HAM UNITED': 48,
      'WEST HAM UNITED FC': 48,
      WOL: 39,
      WOLVES: 39,
      'WOLVERHAMPTON WANDERERS': 39,
      'WOLVERHAMPTON WANDERERS FC': 39,
    };

  /**
   * Resolves API-Football team ID from team entity
   */
  private resolveApiFootballTeamId(team: TeamOrmEntity): number | null {
    if (
      team.tla &&
      PlayerEnrichmentSyncService.TEAM_NAME_TO_API_FOOTBALL_ID[
        team.tla.toUpperCase()
      ]
    ) {
      return PlayerEnrichmentSyncService.TEAM_NAME_TO_API_FOOTBALL_ID[
        team.tla.toUpperCase()
      ];
    }
    if (
      team.shortName &&
      PlayerEnrichmentSyncService.TEAM_NAME_TO_API_FOOTBALL_ID[
        team.shortName.toUpperCase()
      ]
    ) {
      return PlayerEnrichmentSyncService.TEAM_NAME_TO_API_FOOTBALL_ID[
        team.shortName.toUpperCase()
      ];
    }
    if (
      team.name &&
      PlayerEnrichmentSyncService.TEAM_NAME_TO_API_FOOTBALL_ID[
        team.name.toUpperCase()
      ]
    ) {
      return PlayerEnrichmentSyncService.TEAM_NAME_TO_API_FOOTBALL_ID[
        team.name.toUpperCase()
      ];
    }
    const cleanName = team.name.replace(/ FC$/i, '').toUpperCase().trim();
    if (PlayerEnrichmentSyncService.TEAM_NAME_TO_API_FOOTBALL_ID[cleanName]) {
      return PlayerEnrichmentSyncService.TEAM_NAME_TO_API_FOOTBALL_ID[
        cleanName
      ];
    }
    return null;
  }

  /**
   * Enriches all players belonging to a specific team
   */
  async enrichPlayersForTeam(
    teamInternalId: string,
    seasonYear: number = 2025,
  ): Promise<PlayerEnrichmentBatchResult> {
    const teamRepo =
      (this.teamWriteRepository as any).teamRepository ||
      (this.teamWriteRepository as any).repository;
    const team = await teamRepo?.findOne({
      where: { id: teamInternalId },
    });

    if (!team) {
      throw new BadRequestException(`Team with ID ${teamInternalId} not found`);
    }

    this.logger.log(
      `[Enrichment] Starting player enrichment for team "${team.name}" (ID: ${team.id})`,
    );

    const playerRepo =
      (this.playerWriteRepository as any).playerRepository ||
      (this.playerWriteRepository as any).repository;

    const localPlayers: PlayerOrmEntity[] =
      (await playerRepo?.find({
        where: { currentTeamId: team.id },
      })) ?? [];

    if (localPlayers.length === 0) {
      this.logger.warn(
        `[Enrichment] No players found in database for team "${team.name}"`,
      );
      return {
        totalCandidates: 0,
        enrichedCount: 0,
        unmatchedCount: 0,
        failedCount: 0,
        enrichedPlayers: [],
        errors: [],
      };
    }

    // 1. Resolve API-Football team ID
    const apiFootballTeamId = this.resolveApiFootballTeamId(team);
    let remoteSquadPlayers: any[] = [];
    let remoteFullPlayers: any[] = [];

    try {
      if (apiFootballTeamId) {
        // Fetch squad directly from API-Football
        const squadResp = await this.apiFootballClient.getSquadByTeam({
          team: apiFootballTeamId,
        });
        if (squadResp.response?.[0]?.players) {
          remoteSquadPlayers = squadResp.response[0].players;
        }

        // Also fetch detailed player metrics (height, weight, stats) from /players
        try {
          const playersResp = await this.apiFootballClient.getPlayers({
            team: apiFootballTeamId,
            season: seasonYear || 2024,
          });
          if (Array.isArray(playersResp?.response)) {
            remoteFullPlayers = playersResp.response;
          }
        } catch (detailErr: any) {
          this.logger.debug(
            `[Enrichment] Detailed /players fetch skipped for team ${team.name}: ${detailErr.message}`,
          );
        }
      } else {
        // Fallback: search players by team name
        const resp = await this.apiFootballClient.getPlayers({
          search: team.shortName || team.name,
          season: seasonYear,
        });
        remoteFullPlayers = resp.response || [];
      }
    } catch (err: any) {
      this.logger.warn(
        `[Enrichment] API-Football fetch failed for team "${team.name}": ${err.message}`,
      );
      return {
        totalCandidates: localPlayers.length,
        enrichedCount: 0,
        unmatchedCount: localPlayers.length,
        failedCount: 1,
        enrichedPlayers: [],
        errors: [{ error: err.message }],
      };
    }

    const enrichedPlayers: Array<{
      playerId: string;
      playerName: string;
      photoUrl: string | null;
    }> = [];
    const errors: Array<{ playerId?: string; error: string }> = [];
    let enrichedCount = 0;
    let unmatchedCount = 0;

    // 2. Map and match remote players with local players
    for (const localPlayer of localPlayers) {
      const localNormName =
        localPlayer.normalizedName ||
        ApiFootballPlayerMapper.normalizeName(localPlayer.name);

      let matchedProfile: any = null;

      if (remoteSquadPlayers.length > 0) {
        // Match from squad players list
        const matchedSquad = remoteSquadPlayers.find((sq) => {
          const sqNorm = ApiFootballPlayerMapper.normalizeName(sq.name);
          if (sqNorm === localNormName) return true;

          // Partial / token matching
          const localTokens = localNormName.split(' ');
          const sqTokens = sqNorm.split(' ');

          const hasSignificantMatch = localTokens.some(
            (t: string) => t.length > 3 && sqTokens.includes(t),
          );
          if (hasSignificantMatch) return true;

          // Check if last word matches
          const localLast = localTokens[localTokens.length - 1];
          const sqLast = sqTokens[sqTokens.length - 1];
          if (
            localLast &&
            sqLast &&
            localLast.length > 3 &&
            localLast === sqLast
          ) {
            return true;
          }

          return false;
        });

        if (matchedSquad) {
          matchedProfile =
            ApiFootballPlayerMapper.fromSquadPlayer(matchedSquad);

          // Enrich with height and weight from full player details if available
          if (remoteFullPlayers.length > 0) {
            const sqId = String(matchedSquad.id);
            const sqNorm = ApiFootballPlayerMapper.normalizeName(
              matchedSquad.name,
            );
            const fullMatch = remoteFullPlayers.find((item) => {
              if (!item?.player) return false;
              if (String(item.player.id) === sqId) return true;
              return (
                ApiFootballPlayerMapper.normalizeName(item.player.name) ===
                  sqNorm ||
                (item.player.lastname &&
                  sqNorm.includes(
                    ApiFootballPlayerMapper.normalizeName(item.player.lastname),
                  ))
              );
            });
            if (fullMatch) {
              const fullProf =
                ApiFootballPlayerMapper.toEnrichedProfile(fullMatch);
              if (fullProf.heightCm)
                matchedProfile.heightCm = fullProf.heightCm;
              if (fullProf.weightKg)
                matchedProfile.weightKg = fullProf.weightKg;
              if (fullProf.preferredFoot)
                matchedProfile.preferredFoot = fullProf.preferredFoot;
              if (fullProf.dateOfBirth && !matchedProfile.dateOfBirth) {
                matchedProfile.dateOfBirth = fullProf.dateOfBirth;
              }
              if (fullProf.nationality && !matchedProfile.nationality) {
                matchedProfile.nationality = fullProf.nationality;
              }
            }
          }
        }
      } else if (remoteFullPlayers.length > 0) {
        const matchedFull = remoteFullPlayers.find((item) => {
          const p = item.player;
          if (!p) return false;
          const remoteNormName = ApiFootballPlayerMapper.normalizeName(p.name);
          return remoteNormName === localNormName;
        });

        if (matchedFull) {
          matchedProfile =
            ApiFootballPlayerMapper.toEnrichedProfile(matchedFull);
        }
      }

      if (!matchedProfile) {
        unmatchedCount++;
        continue;
      }

      try {
        const updated = await this.enrichPlayerProfileUseCase.execute({
          playerId: localPlayer.id,
          enrichment: matchedProfile,
        });

        enrichedCount++;
        enrichedPlayers.push({
          playerId: updated.id,
          playerName: updated.name,
          photoUrl: updated.imageUrl,
        });
      } catch (err: any) {
        this.logger.error(
          `[Enrichment] Failed to update player "${localPlayer.name}" (${localPlayer.id}): ${err.message}`,
        );
        errors.push({
          playerId: localPlayer.id,
          error: err.message,
        });
      }
    }

    this.logger.log(
      `[Enrichment] Enriched ${enrichedCount}/${localPlayers.length} players for team "${team.name}" (Unmatched: ${unmatchedCount})`,
    );

    return {
      totalCandidates: localPlayers.length,
      enrichedCount,
      unmatchedCount,
      failedCount: errors.length,
      enrichedPlayers,
      errors,
    };
  }
}
