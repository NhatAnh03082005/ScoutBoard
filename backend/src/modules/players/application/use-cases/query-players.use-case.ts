import { Injectable, Inject } from '@nestjs/common';
import {
  PLAYER_READ_REPOSITORY,
  PlayerReadRepository,
} from '../ports/player-read.repository';
import {
  validateQueryNode,
  validatePaginationParams,
} from '../../domain/query/player-query.validator';
import type { GroupNode } from '../../domain/query/player-query.types';
import type { PlayerAdvancedQueryInput } from '../../domain/query/player-query.types';
import {
  PlayerListResponseDto,
  PlayerItemDto,
} from '../../presentation/http/dto/player-response.dto';
import { getPositionGroup } from '../../domain/enums/player-position.enum';
import { resolveNationalityFlagUrl } from '../../domain/services/nationality-flag.resolver';

/**
 * QueryPlayersUseCase
 *
 * Executes a dynamic Boolean query against the player dataset via QUERY /players.
 * Responsibility chain:
 *   1. Validate the query node tree (domain validator — pure, no SQL)
 *   2. Validate pagination params
 *   3. Delegate to playerReadRepository.queryPlayers()
 *   4. Map ORM results to PlayerListResponseDto (same mapping as SearchPlayersUseCase)
 *
 * This use-case does NOT contain SQL logic or metric resolution.
 * It does NOT touch GET /players in any way.
 */
@Injectable()
export class QueryPlayersUseCase {
  constructor(
    @Inject(PLAYER_READ_REPOSITORY)
    private readonly playerReadRepository: PlayerReadRepository,
  ) {}

  async execute(
    input: PlayerAdvancedQueryInput,
  ): Promise<PlayerListResponseDto> {
    // 1. Validate and parse the query tree (throws BadRequestException on failure)
    const validatedNode = validateQueryNode(input.queryNode) as GroupNode;

    // 2. Validate and resolve pagination
    const { limit, offset } = validatePaginationParams(
      input.pagination?.limit,
      input.pagination?.offset,
    );

    // 3. Execute via repository
    const { items, total } = await this.playerReadRepository.queryPlayers(
      validatedNode,
      { limit, offset },
      input.scope,
    );

    // 4. Map to response DTO (same mapping as SearchPlayersUseCase)
    const mappedItems: PlayerItemDto[] = items.map((player) => ({
      id: player.id,
      fullName: player.name,
      imageUrl: player.imageUrl,
      dateOfBirth: player.dateOfBirth,
      nationality: player.nationality,
      nationalityFlagUrl: resolveNationalityFlagUrl(player.nationality),
      heightCm: player.heightCm,
      weightKg: player.weightKg,
      rawPosition: player.rawPosition || null,
      primaryPosition: player.primaryPosition,
      positionGroup: getPositionGroup(player.primaryPosition),
      positions: (player.positions || []).map((position) => ({
        id: position.id,
        positionCode: position.positionCode,
        isPrimary: position.isPrimary,
      })),
      shirtNumber: player.shirtNumber,
      currentTeam: player.currentTeam
        ? {
            id: player.currentTeam.id,
            name: player.currentTeam.name,
            shortName: player.currentTeam.shortName,
            logoUrl: player.currentTeam.logoUrl,
            country: player.currentTeam.country,
          }
        : null,
    }));

    return {
      items: mappedItems,
      pagination: { limit, offset, total },
    };
  }
}
