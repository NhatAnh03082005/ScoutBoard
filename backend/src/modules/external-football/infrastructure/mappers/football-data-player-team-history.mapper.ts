import {
  TransformedPlayerTeamHistory,
  PlayerMatchAppearanceInput,
  PlayerPersonDetailInput,
} from '../../domain/models/transformed-player-team-history.model';

export class FootballDataPlayerTeamHistoryMapper {
  /**
   * Derives a career timeline for a player across clubs from match appearances and person detail.
   * Pure & deterministic function. Zero DB, zero HTTP.
   */
  static deriveTimelineFromAppearances(
    playerDetail: PlayerPersonDetailInput,
    appearances: PlayerMatchAppearanceInput[] = [],
    provider: string = 'FOOTBALL_DATA_ORG',
  ): TransformedPlayerTeamHistory[] {
    if (!playerDetail || !playerDetail.playerExternalId) {
      return [];
    }

    const playerExtIdStr = String(playerDetail.playerExternalId).trim();
    if (playerExtIdStr === '') {
      return [];
    }

    const currentTeamExtIdStr =
      playerDetail.currentTeamExternalId !== null &&
      playerDetail.currentTeamExternalId !== undefined &&
      String(playerDetail.currentTeamExternalId).trim() !== ''
        ? String(playerDetail.currentTeamExternalId).trim()
        : null;

    // Group appearances by teamExternalId
    const teamGroups = new Map<
      string,
      {
        years: number[];
        shirtNumbers: number[];
      }
    >();

    if (Array.isArray(appearances)) {
      for (const app of appearances) {
        if (!app) continue;

        const appPlayerId = String(app.playerExternalId || '').trim();
        const appTeamId = String(app.teamExternalId || '').trim();

        // Must match this player and have a valid team ID
        if (appPlayerId !== playerExtIdStr || appTeamId === '') {
          continue;
        }

        if (!teamGroups.has(appTeamId)) {
          teamGroups.set(appTeamId, { years: [], shirtNumbers: [] });
        }

        const group = teamGroups.get(appTeamId)!;

        // Extract year from matchUtcDate safely
        if (app.matchUtcDate) {
          const d = new Date(app.matchUtcDate);
          if (!isNaN(d.getTime())) {
            const year = d.getUTCFullYear();
            group.years.push(year);
          }
        }

        // Collect shirt number if provided
        if (app.shirtNumber !== null && app.shirtNumber !== undefined && !isNaN(Number(app.shirtNumber))) {
          group.shirtNumbers.push(Number(app.shirtNumber));
        }
      }
    }

    const results: TransformedPlayerTeamHistory[] = [];

    // Process all teams with match appearances
    for (const [teamExtId, group] of teamGroups.entries()) {
      const isCurrent = currentTeamExtIdStr !== null && currentTeamExtIdStr === teamExtId;
      const firstObservedYear = group.years.length > 0 ? Math.min(...group.years) : null;
      const lastObservedYear = isCurrent
        ? null
        : group.years.length > 0
          ? Math.max(...group.years)
          : null;

      // Start date derivation
      let startDate: string | null = null;
      if (isCurrent && playerDetail.currentTeamContractStart) {
        startDate = playerDetail.currentTeamContractStart;
      } else if (firstObservedYear !== null) {
        startDate = `${firstObservedYear}-01-01`;
      }

      // End date derivation (null for current team)
      let endDate: string | null = null;
      if (!isCurrent) {
        if (lastObservedYear !== null) {
          endDate = `${lastObservedYear}-12-31`;
        }
      }

      // Shirt number derivation
      let shirtNumber: number | null = null;
      if (isCurrent && playerDetail.shirtNumber !== null && playerDetail.shirtNumber !== undefined) {
        shirtNumber = Number(playerDetail.shirtNumber);
      } else if (group.shirtNumbers.length > 0) {
        shirtNumber = group.shirtNumbers[group.shirtNumbers.length - 1];
      }

      results.push({
        playerExternalId: playerExtIdStr,
        teamExternalId: teamExtId,
        externalProvider: provider,
        firstObservedYear,
        lastObservedYear,
        startDate,
        endDate,
        shirtNumber,
        isCurrent,
      });
    }

    // If current team was not in match appearances, add current team entry
    if (currentTeamExtIdStr && !teamGroups.has(currentTeamExtIdStr)) {
      let firstObservedYear: number | null = null;
      let startDate: string | null = null;

      if (playerDetail.currentTeamContractStart) {
        startDate = playerDetail.currentTeamContractStart;
        const d = new Date(playerDetail.currentTeamContractStart);
        if (!isNaN(d.getTime())) {
          firstObservedYear = d.getUTCFullYear();
        }
      }

      results.push({
        playerExternalId: playerExtIdStr,
        teamExternalId: currentTeamExtIdStr,
        externalProvider: provider,
        firstObservedYear,
        lastObservedYear: null,
        startDate,
        endDate: null,
        shirtNumber:
          playerDetail.shirtNumber !== null && playerDetail.shirtNumber !== undefined
            ? Number(playerDetail.shirtNumber)
            : null,
        isCurrent: true,
      });
    }

    // Sort: historical teams by firstObservedYear ascending, current team last
    return results.sort((a, b) => {
      if (a.isCurrent && !b.isCurrent) return 1;
      if (!a.isCurrent && b.isCurrent) return -1;
      return (a.firstObservedYear || 0) - (b.firstObservedYear || 0);
    });
  }
}
