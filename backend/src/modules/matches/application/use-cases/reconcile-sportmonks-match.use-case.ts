import { Injectable, Inject, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SportmonksFixtureDto } from '../../../external-football/infrastructure/dto/sportmonks-fixture.dto';
import { MatchOrmEntity } from '../../infrastructure/persistence/typeorm/entities/match.orm-entity';
import {
  EXTERNAL_MATCH_MAPPING_REPOSITORY,
  ExternalMatchMappingRepository,
} from '../ports/external-match-mapping.repository';
import {
  CrossProviderMatchReconciliationService,
  MatchReconciliationResult,
  ReconciliationOptions,
} from '../../domain/services/cross-provider-match-reconciliation.service';

export interface ReconcileSportmonksMatchInput {
  fixture: SportmonksFixtureDto;
  resolvedHomeTeamId: string;
  resolvedAwayTeamId: string;
  options?: ReconciliationOptions;
}

export interface ReconcileBatchResult {
  total: number;
  matched: number;
  unmatched: number;
  ambiguous: number;
  invalid: number;
  results: Array<{
    fixtureId: number | string;
    result: MatchReconciliationResult;
  }>;
}

@Injectable()
export class ReconcileSportmonksMatchUseCase {
  private readonly logger = new Logger(ReconcileSportmonksMatchUseCase.name);

  constructor(
    @Inject(EXTERNAL_MATCH_MAPPING_REPOSITORY)
    private readonly mappingRepository: ExternalMatchMappingRepository,
    @InjectRepository(MatchOrmEntity)
    private readonly matchRepository: Repository<MatchOrmEntity>,
  ) {}

  /**
   * Reconciles a Sportmonks Fixture to canonical ScoutBoard Match, utilizing O(1) indexed cache
   */
  async execute(input: ReconcileSportmonksMatchInput): Promise<MatchReconciliationResult> {
    const { fixture, resolvedHomeTeamId, resolvedAwayTeamId, options } = input;

    if (!fixture || !fixture.id) {
      return {
        status: 'INVALID',
        matchId: null,
        confidence: 0,
        matchedMatch: null,
        reason: 'Invalid or missing Sportmonks fixture',
      };
    }

    const fixtureIdStr = String(fixture.id).trim();

    // 1. O(1) CACHE LOOKUP: Check if mapping was already confirmed previously
    const existingMapping = await this.mappingRepository.findByProviderFixtureId(
      'SPORTMONKS',
      fixtureIdStr,
    );

    if (existingMapping) {
      const canonicalMatch = await this.matchRepository.findOne({
        where: { id: existingMapping.matchId },
      });

      if (canonicalMatch) {
        this.logger.debug(
          `[Reconciliation] O(1) cache hit for Sportmonks fixture ${fixtureIdStr} -> Match ${canonicalMatch.id}`,
        );
        return {
          status: 'MATCHED',
          matchId: canonicalMatch.id,
          confidence: Number(existingMapping.confidence) || 1.0,
          matchedMatch: canonicalMatch,
        };
      }
    }

    if (!resolvedHomeTeamId || !resolvedAwayTeamId) {
      return {
        status: 'INVALID',
        matchId: null,
        confidence: 0,
        matchedMatch: null,
        reason: 'Home and Away team UUIDs must be resolved before match reconciliation',
      };
    }

    // 2. NARROW CANDIDATES: Query database for canonical matches between these two teams
    const candidates = await this.matchRepository.find({
      where: {
        homeTeamId: resolvedHomeTeamId,
        awayTeamId: resolvedAwayTeamId,
      },
    });

    // 3. DETERMINISTIC RECONCILIATION
    const reconciliationResult = CrossProviderMatchReconciliationService.reconcile(
      fixture,
      candidates,
      resolvedHomeTeamId,
      resolvedAwayTeamId,
      options,
    );

    // 4. PERSIST CONFIRMED MAPPING FOR FUTURE O(1) LOOKUPS
    if (reconciliationResult.status === 'MATCHED' && reconciliationResult.matchId) {
      await this.mappingRepository.saveMapping({
        matchId: reconciliationResult.matchId,
        externalProvider: 'SPORTMONKS',
        externalId: fixtureIdStr,
        confidence: reconciliationResult.confidence,
        status: 'CONFIRMED',
        metadata: {
          startingAt: fixture.starting_at,
          fixtureName: fixture.name,
        },
      });

      this.logger.log(
        `[Reconciliation] Successfully mapped and cached Sportmonks fixture ${fixtureIdStr} -> Match ${reconciliationResult.matchId} (confidence: ${reconciliationResult.confidence})`,
      );
    }

    return reconciliationResult;
  }

  /**
   * Batch reconciles a list of Sportmonks fixtures with error isolation
   */
  async executeBatch(
    items: Array<{
      fixture: SportmonksFixtureDto;
      resolvedHomeTeamId: string;
      resolvedAwayTeamId: string;
      options?: ReconciliationOptions;
    }>,
  ): Promise<ReconcileBatchResult> {
    const results: Array<{
      fixtureId: number | string;
      result: MatchReconciliationResult;
    }> = [];

    let matched = 0;
    let unmatched = 0;
    let ambiguous = 0;
    let invalid = 0;

    for (const item of items) {
      const fixId = item.fixture?.id ?? 'unknown';
      try {
        const res = await this.execute(item);
        results.push({ fixtureId: fixId, result: res });

        if (res.status === 'MATCHED') matched++;
        else if (res.status === 'UNMATCHED') unmatched++;
        else if (res.status === 'AMBIGUOUS') ambiguous++;
        else if (res.status === 'INVALID') invalid++;
      } catch (err: any) {
        const invalidRes: MatchReconciliationResult = {
          status: 'INVALID',
          matchId: null,
          confidence: 0,
          matchedMatch: null,
          reason: err?.message || String(err),
        };
        results.push({ fixtureId: fixId, result: invalidRes });
        invalid++;
      }
    }

    return {
      total: items.length,
      matched,
      unmatched,
      ambiguous,
      invalid,
      results,
    };
  }
}
