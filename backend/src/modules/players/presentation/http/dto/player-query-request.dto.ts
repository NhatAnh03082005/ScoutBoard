/**
 * ScoutBoard — Player Query Request DTO
 *
 * Typed shape of the QUERY /players request body.
 * Shallow class-validator decorators handle the top-level structure.
 * Deep recursive tree validation is performed by PlayerQueryValidator in the use-case.
 */

import { IsOptional, IsUUID, IsInt, Min, Max, IsObject } from 'class-validator';
import { Type } from 'class-transformer';
import { ValidateNested } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class PlayerQueryScopeDto {
  @ApiPropertyOptional({
    description: 'Filter season statistics by competition ID',
  })
  @IsOptional()
  @IsUUID()
  competitionId?: string;

  @ApiPropertyOptional({ description: 'Filter season statistics by season ID' })
  @IsOptional()
  @IsUUID()
  seasonId?: string;
}

export class PlayerQueryPaginationDto {
  @ApiPropertyOptional({ default: 20, minimum: 1, maximum: 100 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  limit: number = 20;

  @ApiPropertyOptional({ default: 0, minimum: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  offset: number = 0;
}

export class PlayerQueryRequestDto {
  @ApiPropertyOptional({
    description: 'Optional scope to restrict season statistics context',
    type: PlayerQueryScopeDto,
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => PlayerQueryScopeDto)
  scope?: PlayerQueryScopeDto;

  @ApiPropertyOptional({
    description: 'Pagination settings for the advanced query',
    type: PlayerQueryPaginationDto,
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => PlayerQueryPaginationDto)
  pagination?: PlayerQueryPaginationDto;

  /**
   * The query tree root node.
   * Accepts any object — deep recursive validation is performed
   * by PlayerQueryValidator.validateQueryNode() inside QueryPlayersUseCase.
   * This keeps the DTO simple and lets the domain layer own the validation logic.
   */
  @IsObject()
  query: Record<string, unknown>;
}
