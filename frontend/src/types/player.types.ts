export const CANONICAL_PLAYER_POSITIONS = [
  'GK',
  'LB',
  'CB',
  'RB',
  'LWB',
  'RWB',
  'CM',
  'CDM',
  'CAM',
  'LM',
  'RM',
  'LW',
  'RW',
  'CF',
  'ST',
] as const;

export type PlayerPosition = (typeof CANONICAL_PLAYER_POSITIONS)[number];

export interface PlayerTeam {
  id: string;
  name: string;
  shortName: string | null;
  logoUrl?: string | null;
  country?: string | null;
}

export interface PlayerItem {
  id: string;
  fullName: string;
  imageUrl?: string | null;
  dateOfBirth?: string | null;
  nationality?: string | null;
  nationalityFlagUrl?: string | null;
  heightCm?: number | null;
  weightKg?: number | null;
  rawPosition?: string | null;
  primaryPosition?: string | null;
  positionGroup?: string | null;
  positions?: PlayerPositionItem[];
  shirtNumber?: number | null;
  currentTeam?: PlayerTeam | null;
}

export interface PlayerPositionItem {
  id: string;
  positionCode: string;
  isPrimary: boolean;
}

export interface PlayerDetail {
  id: string;
  name: string;
  fullName?: string;
  shortName?: string | null;
  dateOfBirth?: string | null;
  nationality?: string | null;
  nationalityFlagUrl?: string | null;
  heightCm?: number | null;
  weightKg?: number | null;
  rawPosition?: string | null;
  primaryPosition?: string | null;
  positionGroup?: string | null;
  shirtNumber?: number | null;
  imageUrl?: string | null;
  status?: string;
  currentTeam?: PlayerTeam | null;
  positions?: PlayerPositionItem[];
}

export interface PlayerTeamHistoryItem {
  id: string;
  team: PlayerTeam;
  joinedAt: string | null;
  leftAt: string | null;
  shirtNumber: number | null;
  isCurrent: boolean;
}

export interface PlayerSeasonStatisticItem {
  id: string;
  season: {
    id: string;
    seasonCode: string | null;
    isCurrent: boolean;
  };
  competition: {
    id: string;
    name: string;
    country: string | null;
  };
  team: PlayerTeam | null;
  appearances: number;
  starts: number;
  minutesPlayed: number;
  goals: number;
  assists: number;
  shots: number;
  shotsOnTarget: number;
  passesAttempted: number;
  passesCompleted: number;
  passAccuracy: number | null;
  keyPasses: number;
  tackles: number;
  interceptions: number;
  duelsWon: number;

  // Outfield Per-90 Metrics
  goalsPer90: number | null;
  assistsPer90: number | null;
  shotsPer90: number | null;
  shotsOnTargetPer90: number | null;
  passesPer90: number | null;
  keyPassesPer90: number | null;
  tacklesPer90: number | null;
  interceptionsPer90: number | null;
  duelsWonPer90: number | null;

  // Goalkeeper Specific Metrics (Nullable for Outfield)
  saves?: number | null;
  goalsConceded?: number | null;
  cleanSheets?: number | null;
  penaltiesSaved?: number | null;
  penaltiesFaced?: number | null;
  savesPer90?: number | null;
  goalsConcededPer90?: number | null;
  savePercentage?: number | null;
  cleanSheetPercentage?: number | null;
  penaltySavePercentage?: number | null;
}

export interface PlayerMatchStatisticItem {
  id: string;
  match: {
    id: string;
    kickoffAt: string | null;
    status: string;
    competition: {
      id: string;
      name: string;
      country: string | null;
    };
    season: {
      id: string;
      seasonCode: string | null;
    };
    homeTeam: PlayerTeam;
    awayTeam: PlayerTeam;
    homeScore: number | null;
    awayScore: number | null;
  };
  team: PlayerTeam;
  minutesPlayed: number;
  isStarter: boolean;
  rating: number | null;
  goals: number;
  assists: number;
  shots: number;
  keyPasses: number;
  passesAttempted: number;
  passesCompleted: number;
  passAccuracy: number | null;
  tackles: number;
  interceptions: number;
  yellowCards: number;
  redCards: number;
  saves?: number | null;
  goalsConceded?: number | null;
  cleanSheets?: number | null;
  penaltiesSaved?: number | null;
  statistics: Record<string, unknown> | null;
}

export interface PaginationMetadata {
  limit: number;
  offset: number;
  total: number;
}

export interface PlayerListResponse {
  items: PlayerItem[];
  pagination: PaginationMetadata;
}

export interface PlayerMatchStatisticsResponse {
  items: PlayerMatchStatisticItem[];
  pagination: PaginationMetadata;
}

export interface PlayerFilterParams {
  search?: string;
  nationality?: string;
  currentTeamId?: string;
  position?: string;
  competitionId?: string;
  minAge?: number | string;
  maxAge?: number | string;
  minHeightCm?: number | string;
  maxHeightCm?: number | string;
  minWeightKg?: number | string;
  maxWeightKg?: number | string;
  limit?: number;
  offset?: number;
}

export interface PlayerMatchFilterParams {
  seasonId?: string;
  competitionId?: string;
  teamId?: string;
  limit?: number;
  offset?: number;
}

export type ComparisonScopeType = "COMPETITION" | "ALL";

export interface ComparisonCandidateParams {
  scope: ComparisonScopeType;
  seasonId: string;
  competitionId?: string;
  currentTeamId?: string;
  search?: string;
  position?: string;
  nationality?: string;
  minAge?: number | string;
  maxAge?: number | string;
  minHeightCm?: number | string;
  maxHeightCm?: number | string;
  minWeightKg?: number | string;
  maxWeightKg?: number | string;
  limit?: number;
  offset?: number;
}

// =============================================================================
// Advanced Query Types (QUERY /players)
// Added additively — do not modify types above this line.
// =============================================================================

export type BooleanOperator = 'AND' | 'OR';

export type ConditionOperator =
  | 'EQ'
  | 'NE'
  | 'GT'
  | 'GTE'
  | 'LT'
  | 'LTE'
  | 'IN'
  | 'NOT_IN'
  | 'BETWEEN';

export type ConditionValue =
  | number
  | string
  | number[]
  | string[]
  | [number, number];

/** Leaf condition: field + operator + scalar/array/range value. */
export interface FieldCondition {
  kind: 'CONDITION';
  field: string;
  operator: ConditionOperator;
  value: ConditionValue;
}

/**
 * Group node: a boolean operator + one or more children (conditions or nested groups).
 * OR is represented as an explicit GroupNode(operator:'OR'), not implicit precedence.
 */
export interface GroupNode {
  kind: 'GROUP';
  operator: BooleanOperator;
  conditions: QueryNode[];
}

/** Discriminated union — the `kind` field distinguishes leaf from group. */
export type QueryNode = FieldCondition | GroupNode;

export interface PlayerQueryScope {
  competitionId?: string;
  seasonId?: string;
}

/** The full request body for QUERY /players. Root must always be a GroupNode. */
export interface PlayerAdvancedQueryRequest {
  scope?: PlayerQueryScope;
  query: GroupNode;
  pagination?: {
    limit?: number;
    offset?: number;
  };
}

/** Data type for a queryable metric — controls operators and input rendering. */
export type MetricDataType = 'NUMBER' | 'ENUM' | 'STRING';

/** Self-describing metric definition (mirrors backend registry, single source of truth for UI). */
export interface QueryMetricDefinition {
  key: string;
  label: string;
  dataType: MetricDataType;
  allowedOperators: ConditionOperator[];
  /** For ENUM metrics: the set of valid string values. */
  enumValues?: string[];
  /** For position-specific metrics (e.g. GK-only) — informs UI hints. */
  applicablePositions?: string[];
}

