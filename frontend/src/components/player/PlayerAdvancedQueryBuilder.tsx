import React, { useCallback, useId } from "react";
import type {
  GroupNode,
  FieldCondition,
  QueryNode,
  BooleanOperator,
  ConditionOperator,
  ConditionValue,
  MatchAggregationCondition,
  CohortComparisonCondition,
} from "../../types/player.types";
import type { CompetitionItem } from "../../types/competition.types";
import type { SeasonItem } from "../../types/data-sync.types";
import {
  PLAYER_QUERY_METRICS,
  PLAYER_QUERY_METRICS_BY_CATEGORY,
  PLAYER_QUERY_METRICS_MAP,
  PLAYER_MATCH_QUERY_METRICS,
  stripQueryNodeIds,
  type CategorizedMetric,
} from "../../types/player-query-metrics";
import { Notification } from "../common/Notification";

const AGGREGATION_OPS: ConditionOperator[] = [
  "EQ",
  "NE",
  "GT",
  "GTE",
  "LT",
  "LTE",
];
const COHORT_POSITIONS = [
  "GK",
  "LB",
  "CB",
  "RB",
  "LWB",
  "RWB",
  "CM",
  "CDM",
  "CAM",
  "LM",
  "RM",
  "LW",
  "RW",
  "CF",
  "ST",
];

const CohortComparisonRow: React.FC<{
  node: CohortComparisonCondition & { __id: string };
  competitions: CompetitionItem[];
  seasons: SeasonItem[];
  onUpdate: (node: CohortComparisonCondition) => void;
  onRemove: () => void;
}> = ({ node, competitions, seasons, onUpdate, onRemove }) => {
  const cohortSeasons = seasons.filter(
    (season) => season.competitionId === node.cohort.competitionId,
  );
  const updateCohort = (patch: Partial<CohortComparisonCondition["cohort"]>) =>
    onUpdate({ ...node, cohort: { ...node.cohort, ...patch } });
  return (
    <div
      className="aqb-condition-row"
      role="group"
      aria-label="Cohort comparison"
    >
      <select
        className="aqb-select aqb-field-select"
        value={node.metric}
        onChange={(event) => onUpdate({ ...node, metric: event.target.value })}
        aria-label="Cohort metric"
      >
        {PLAYER_QUERY_METRICS.filter(
          (metric) =>
            metric.dataType === "NUMBER" && metric.category !== "Profile",
        ).map((metric) => (
          <option key={metric.key} value={metric.key}>
            {metric.label}
          </option>
        ))}
      </select>
      <select
        className="aqb-select"
        value={node.comparison.type}
        onChange={(event) =>
          onUpdate({
            ...node,
            comparison: {
              ...node.comparison,
              type: event.target.value as
                | "AVERAGE"
                | "MEDIAN"
                | "PERCENTILE"
                | "RANK",
              ...(event.target.value === "PERCENTILE" ||
              event.target.value === "RANK"
                ? {
                    value:
                      node.comparison.value ??
                      (event.target.value === "PERCENTILE" ? 90 : 1),
                  }
                : {}),
            },
          })
        }
        aria-label="Cohort baseline"
      >
        <option value="AVERAGE">Cohort average</option>
        <option value="MEDIAN">Cohort median</option>
        <option value="PERCENTILE">Cohort percentile</option>
        <option value="RANK">Cohort rank</option>
      </select>
      {(node.comparison.type === "PERCENTILE" ||
        node.comparison.type === "RANK") && (
        <input
          type="number"
          className="aqb-value-input"
          min={node.comparison.type === "PERCENTILE" ? 0 : 1}
          max={node.comparison.type === "PERCENTILE" ? 100 : undefined}
          step={node.comparison.type === "PERCENTILE" ? "any" : 1}
          value={
            node.comparison.value ??
            (node.comparison.type === "PERCENTILE" ? 90 : 1)
          }
          onChange={(event) =>
            onUpdate({
              ...node,
              comparison: {
                ...node.comparison,
                value: Number(event.target.value),
              },
            })
          }
          aria-label={
            node.comparison.type === "PERCENTILE" ? "Percentile" : "Rank"
          }
        />
      )}
      <select
        className="aqb-select aqb-op-select"
        value={node.comparison.operator}
        onChange={(event) =>
          onUpdate({
            ...node,
            comparison: {
              ...node.comparison,
              operator: event.target.value as Exclude<
                ConditionOperator,
                "IN" | "NOT_IN" | "BETWEEN"
              >,
            },
          })
        }
        aria-label="Cohort comparison operator"
      >
        {AGGREGATION_OPS.map((operator) => (
          <option key={operator} value={operator}>
            {OPERATOR_LABELS[operator]}
          </option>
        ))}
      </select>
      <select
        className="aqb-select"
        value={node.cohort.competitionId}
        onChange={(event) => {
          const competitionId = event.target.value;
          const firstSeason = seasons.find(
            (season) => season.competitionId === competitionId,
          );
          updateCohort({ competitionId, seasonId: firstSeason?.id ?? "" });
        }}
        aria-label="Cohort competition"
      >
        <option value="">Competition</option>
        {competitions.map((competition) => (
          <option key={competition.id} value={competition.id}>
            {competition.name}
          </option>
        ))}
      </select>
      <select
        className="aqb-select"
        value={node.cohort.seasonId}
        onChange={(event) => updateCohort({ seasonId: event.target.value })}
        aria-label="Cohort season"
      >
        <option value="">Season</option>
        {cohortSeasons.map((season) => (
          <option key={season.id} value={season.id}>
            {season.name}
          </option>
        ))}
      </select>
      <select
        className="aqb-select"
        multiple
        size={2}
        value={node.cohort.position}
        onChange={(event) =>
          updateCohort({
            position: Array.from(
              event.target.selectedOptions,
              (option) => option.value,
            ),
          })
        }
        aria-label="Cohort positions"
      >
        {COHORT_POSITIONS.map((position) => (
          <option key={position} value={position}>
            {position}
          </option>
        ))}
      </select>
      <button
        type="button"
        className="aqb-remove-btn"
        onClick={onRemove}
        aria-label="Remove cohort comparison"
      >
        ×
      </button>
    </div>
  );
};

const MatchAggregationRow: React.FC<{
  node: MatchAggregationCondition & { __id: string };
  onUpdate: (node: MatchAggregationCondition) => void;
  onRemove: () => void;
}> = ({ node, onUpdate, onRemove }) => {
  const criterion =
    PLAYER_MATCH_QUERY_METRICS.find(
      (metric) => metric.key === node.matchCriteria.field,
    ) ?? PLAYER_MATCH_QUERY_METRICS[0];
  const averageField =
    PLAYER_MATCH_QUERY_METRICS.find(
      (metric) => metric.key === node.aggregation.field,
    ) ??
    PLAYER_MATCH_QUERY_METRICS.find((m) => m.dataType === "NUMBER") ??
    PLAYER_MATCH_QUERY_METRICS[0];
  const updateCriterion = (field: string) => {
    const metric = PLAYER_MATCH_QUERY_METRICS.find(
      (item) => item.key === field,
    )!;
    const defaultVal =
      metric.dataType === "BOOLEAN"
        ? true
        : metric.dataType === "NUMBER"
          ? 0
          : "";
    onUpdate({
      ...node,
      matchCriteria: {
        kind: "CONDITION",
        field,
        operator: metric.allowedOperators[0],
        value: defaultVal as any,
      },
    });
  };
  // Determine if the current criteria field is a BOOLEAN metric (renders Yes/No select)
  const isBooleanCriterion = criterion.dataType === "BOOLEAN";
  return (
    <div
      className="aqb-condition-row"
      role="group"
      aria-label="Match aggregation"
    >
      <select
        className="aqb-select aqb-field-select"
        value={criterion.key}
        onChange={(event) => updateCriterion(event.target.value)}
        aria-label="Match metric"
      >
        {PLAYER_MATCH_QUERY_METRICS.map((metric) => (
          <option key={metric.key} value={metric.key}>
            {metric.label}
          </option>
        ))}
      </select>
      <select
        className="aqb-select aqb-op-select"
        value={node.matchCriteria.operator}
        onChange={(event) =>
          onUpdate({
            ...node,
            matchCriteria: {
              ...node.matchCriteria,
              operator: event.target.value as ConditionOperator,
            },
          })
        }
      >
        {criterion.allowedOperators.map((operator) => (
          <option key={operator} value={operator}>
            {OPERATOR_LABELS[operator]}
          </option>
        ))}
      </select>
      {isBooleanCriterion ? (
        <select
          className="aqb-select"
          value={String(node.matchCriteria.value)}
          onChange={(event) =>
            onUpdate({
              ...node,
              matchCriteria: {
                ...node.matchCriteria,
                value: event.target.value === "true",
              },
            })
          }
        >
          <option value="true">Yes</option>
          <option value="false">No</option>
        </select>
      ) : (
        <input
          type="number"
          className="aqb-value-input"
          value={node.matchCriteria.value as number}
          onChange={(event) =>
            onUpdate({
              ...node,
              matchCriteria: {
                ...node.matchCriteria,
                value: Number(event.target.value),
              },
            })
          }
        />
      )}
      <select
        className="aqb-select"
        value={node.aggregation.type}
        onChange={(event) => {
          const type = event.target
            .value as MatchAggregationCondition["aggregation"]["type"];
          onUpdate({
            ...node,
            aggregation: {
              type,
              operator: node.aggregation.operator,
              value: node.aggregation.value,
              ...(type === "AVG" ? { field: averageField.key } : {}),
            },
          });
        }}
      >
        <option value="COUNT">Count (# matches)</option>
        <option value="QUALIFYING_RATE">Qualifying Rate (0–1)</option>
        <option value="AVG">Average value</option>
      </select>
      {node.aggregation.type === "AVG" && (
        <select
          className="aqb-select"
          value={averageField.key}
          onChange={(event) =>
            onUpdate({
              ...node,
              aggregation: { ...node.aggregation, field: event.target.value },
            })
          }
        >
          {PLAYER_MATCH_QUERY_METRICS.filter(
            (metric) => metric.dataType === "NUMBER",
          ).map((metric) => (
            <option key={metric.key} value={metric.key}>
              {metric.label}
            </option>
          ))}
        </select>
      )}
      <select
        className="aqb-select aqb-op-select"
        value={node.aggregation.operator}
        onChange={(event) =>
          onUpdate({
            ...node,
            aggregation: {
              ...node.aggregation,
              operator: event.target.value as any,
            },
          })
        }
      >
        {AGGREGATION_OPS.map((operator) => (
          <option key={operator} value={operator}>
            {OPERATOR_LABELS[operator]}
          </option>
        ))}
      </select>
      <input
        type="number"
        step="any"
        className="aqb-value-input"
        value={node.aggregation.value}
        onChange={(event) =>
          onUpdate({
            ...node,
            aggregation: {
              ...node.aggregation,
              value: Number(event.target.value),
            },
          })
        }
        aria-label="Aggregation threshold"
      />
      <button
        type="button"
        className="aqb-remove-btn"
        onClick={onRemove}
        aria-label="Remove match aggregation"
      >
        ×
      </button>
    </div>
  );
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

let _nodeId = 0;
function nextId(): string {
  return `node-${++_nodeId}`;
}

function defaultCondition(): FieldCondition {
  const firstMetric = PLAYER_QUERY_METRICS[0];
  return {
    kind: "CONDITION",
    field: firstMetric.key,
    operator: firstMetric.allowedOperators[0],
    value: firstMetric.dataType === "NUMBER" ? 0 : "",
  };
}

export function defaultGroupNode(): GroupNode {
  return {
    kind: "GROUP",
    operator: "AND",
    conditions: [defaultCondition()],
  };
}

function defaultValue(
  metric: CategorizedMetric,
  op: ConditionOperator,
): ConditionValue {
  if (op === "BETWEEN") return [0, 0];
  if (op === "IN" || op === "NOT_IN") {
    return metric.dataType === "NUMBER" ? [] : [];
  }
  if (metric.dataType === "NUMBER") return 0;
  if (metric.dataType === "ENUM") return metric.enumValues?.[0] ?? "";
  return "";
}

/** Shared serializer to strip __id before sending to API */
const stripIds = stripQueryNodeIds;

// Seed IDs into a node tree for React key tracking
function seedIds(node: QueryNode): QueryNode {
  if (node.kind === "CONDITION") {
    return { ...(node as any), __id: (node as any).__id ?? nextId() };
  }
  if (node.kind === "MATCH_AGGREGATION") {
    return { ...(node as any), __id: (node as any).__id ?? nextId() };
  }
  if (node.kind === "COHORT_COMPARISON") {
    return { ...(node as any), __id: (node as any).__id ?? nextId() };
  }
  return {
    ...(node as any),
    __id: (node as any).__id ?? nextId(),
    conditions: (node as GroupNode).conditions.map(seedIds),
  };
}

// ---------------------------------------------------------------------------
// Operator labels
// ---------------------------------------------------------------------------

const OPERATOR_LABELS: Record<ConditionOperator, string> = {
  EQ: "=  equals",
  NE: "≠  not equals",
  GT: ">  greater than",
  GTE: "≥  at least",
  LT: "<  less than",
  LTE: "≤  at most",
  IN: "in list",
  NOT_IN: "not in list",
  BETWEEN: "between",
};

// ---------------------------------------------------------------------------
// Value Input
// ---------------------------------------------------------------------------

interface ValueInputProps {
  metric: CategorizedMetric;
  operator: ConditionOperator;
  value: ConditionValue;
  onChange: (v: ConditionValue) => void;
}

const ValueInput: React.FC<ValueInputProps> = ({
  metric,
  operator,
  value,
  onChange,
}) => {
  const uid = useId();

  if (operator === "BETWEEN") {
    const arr = (
      Array.isArray(value) && value.length === 2 ? value : [0, 0]
    ) as [number, number];
    return (
      <div className="aqb-between-inputs">
        <input
          type="number"
          className="aqb-value-input"
          value={arr[0]}
          placeholder="Min"
          onChange={(e) => onChange([Number(e.target.value), arr[1]])}
          aria-label="Minimum value"
        />
        <span className="aqb-between-sep">—</span>
        <input
          type="number"
          className="aqb-value-input"
          value={arr[1]}
          placeholder="Max"
          onChange={(e) => onChange([arr[0], Number(e.target.value)])}
          aria-label="Maximum value"
        />
      </div>
    );
  }

  if (operator === "IN" || operator === "NOT_IN") {
    const arrVal = Array.isArray(value) ? (value as (string | number)[]) : [];
    const rawStr = arrVal.join(", ");
    return (
      <input
        type="text"
        className="aqb-value-input aqb-value-input--wide"
        value={rawStr}
        placeholder={
          metric.dataType === "NUMBER" ? "e.g. 1, 2, 3" : "e.g. CM, CDM"
        }
        onChange={(e) => {
          const parts = e.target.value
            .split(",")
            .map((s) => s.trim())
            .filter(Boolean);
          const parsed =
            metric.dataType === "NUMBER"
              ? parts.map(Number).filter((n) => !isNaN(n))
              : parts;
          onChange(parsed as ConditionValue);
        }}
        aria-label="List of values (comma-separated)"
      />
    );
  }

  if (metric.dataType === "ENUM" && metric.enumValues) {
    return (
      <select
        id={`${uid}-val`}
        className="aqb-select aqb-value-select"
        value={value as string}
        onChange={(e) => onChange(e.target.value)}
        aria-label="Enum value"
      >
        {metric.enumValues.map((v) => (
          <option key={v} value={v}>
            {v}
          </option>
        ))}
      </select>
    );
  }

  if (metric.dataType === "NUMBER") {
    return (
      <input
        type="number"
        className="aqb-value-input"
        value={value as number}
        step="any"
        onChange={(e) => onChange(Number(e.target.value))}
        aria-label="Numeric value"
      />
    );
  }

  return (
    <input
      type="text"
      className="aqb-value-input"
      value={value as string}
      onChange={(e) => onChange(e.target.value)}
      aria-label="Text value"
    />
  );
};

// ---------------------------------------------------------------------------
// Condition Row
// ---------------------------------------------------------------------------

interface ConditionRowProps {
  node: FieldCondition & { __id: string };
  parentSize: number;
  onUpdate: (updated: FieldCondition) => void;
  onRemove: () => void;
}

const ConditionRow: React.FC<ConditionRowProps> = ({
  node,
  parentSize,
  onUpdate,
  onRemove,
}) => {
  const uid = useId();
  const metric =
    PLAYER_QUERY_METRICS_MAP.get(node.field) ?? PLAYER_QUERY_METRICS[0];

  const handleFieldChange = (newField: string) => {
    const newMetric =
      PLAYER_QUERY_METRICS_MAP.get(newField) ?? PLAYER_QUERY_METRICS[0];
    const newOp = newMetric.allowedOperators[0];
    onUpdate({
      ...node,
      field: newField,
      operator: newOp,
      value: defaultValue(newMetric, newOp),
    });
  };

  const handleOpChange = (newOp: ConditionOperator) => {
    onUpdate({ ...node, operator: newOp, value: defaultValue(metric, newOp) });
  };

  return (
    <div
      className="aqb-condition-row"
      role="group"
      aria-label="Query condition"
    >
      {/* Field */}
      <select
        id={`${uid}-field`}
        className="aqb-select aqb-field-select"
        value={node.field}
        onChange={(e) => handleFieldChange(e.target.value)}
        aria-label="Metric field"
      >
        {Array.from(PLAYER_QUERY_METRICS_BY_CATEGORY.entries()).map(
          ([cat, metrics]) => (
            <optgroup key={cat} label={cat}>
              {metrics.map((m) => (
                <option key={m.key} value={m.key}>
                  {m.label}
                </option>
              ))}
            </optgroup>
          ),
        )}
      </select>

      {/* Operator */}
      <select
        id={`${uid}-op`}
        className="aqb-select aqb-op-select"
        value={node.operator}
        onChange={(e) => handleOpChange(e.target.value as ConditionOperator)}
        aria-label="Comparison operator"
      >
        {metric.allowedOperators.map((op) => (
          <option key={op} value={op}>
            {OPERATOR_LABELS[op]}
          </option>
        ))}
      </select>

      {/* Value */}
      <ValueInput
        metric={metric}
        operator={node.operator}
        value={node.value}
        onChange={(v) => onUpdate({ ...node, value: v })}
      />

      {/* Remove */}
      <button
        type="button"
        className="aqb-remove-btn"
        onClick={onRemove}
        disabled={parentSize <= 1}
        title="Remove condition"
        aria-label="Remove condition"
      >
        <svg
          width="13"
          height="13"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
        >
          <line x1="18" y1="6" x2="6" y2="18" />
          <line x1="6" y1="6" x2="18" y2="18" />
        </svg>
      </button>
    </div>
  );
};

// ---------------------------------------------------------------------------
// Group Node View (recursive)
// ---------------------------------------------------------------------------

interface GroupNodeViewProps {
  node: GroupNode & { __id: string };
  depth: number;
  isRoot: boolean;
  competitions: CompetitionItem[];
  seasons: SeasonItem[];
  onUpdate: (updated: GroupNode) => void;
  onRemove: () => void;
}

const GroupNodeView: React.FC<GroupNodeViewProps> = ({
  node,
  depth,
  isRoot,
  competitions,
  seasons,
  onUpdate,
  onRemove,
}) => {
  const isAnd = node.operator === "AND";

  const toggleOperator = () => {
    onUpdate({ ...node, operator: (isAnd ? "OR" : "AND") as BooleanOperator });
  };

  const updateChild = (idx: number, updated: QueryNode) => {
    const newConditions = [...node.conditions];
    newConditions[idx] = updated as any;
    onUpdate({ ...node, conditions: newConditions });
  };

  const removeChild = (idx: number) => {
    const newConditions = node.conditions.filter((_, i) => i !== idx);
    onUpdate({ ...node, conditions: newConditions });
  };

  const handleAddCondition = () => {
    const newCond: any = { ...defaultCondition(), __id: nextId() };
    onUpdate({ ...node, conditions: [...node.conditions, newCond] });
  };

  const handleAddGroup = () => {
    const newGroup: any = {
      kind: "GROUP",
      operator: "OR",
      conditions: [{ ...defaultCondition(), __id: nextId() }],
      __id: nextId(),
    };
    onUpdate({ ...node, conditions: [...node.conditions, newGroup] });
  };

  const handleAddMatchAggregation = () => {
    const metric = PLAYER_MATCH_QUERY_METRICS[0];
    onUpdate({
      ...node,
      conditions: [
        ...node.conditions,
        {
          kind: "MATCH_AGGREGATION",
          matchCriteria: {
            kind: "CONDITION",
            field: metric.key,
            operator: metric.allowedOperators[0],
            value: 0,
          },
          aggregation: { type: "COUNT", operator: "GTE", value: 1 },
          __id: nextId(),
        } as any,
      ],
    });
  };

  const handleAddCohortComparison = () => {
    const metric =
      PLAYER_QUERY_METRICS.find(
        (item) => item.dataType === "NUMBER" && item.category === "Per 90",
      ) ?? PLAYER_QUERY_METRICS[0];
    onUpdate({
      ...node,
      conditions: [
        ...node.conditions,
        {
          kind: "COHORT_COMPARISON",
          metric: metric.key,
          comparison: { type: "AVERAGE", operator: "GTE" },
          cohort: { competitionId: "", seasonId: "", position: ["CM"] },
          __id: nextId(),
        } as any,
      ],
    });
  };

  return (
    <div
      className={`aqb-group aqb-group--depth-${Math.min(depth, 4)} ${isAnd ? "aqb-group--and" : "aqb-group--or"}`}
      data-depth={depth}
    >
      {/* Group header */}
      <div className="aqb-group-header">
        <button
          type="button"
          className={`aqb-bool-toggle ${isAnd ? "aqb-bool-toggle--and" : "aqb-bool-toggle--or"}`}
          onClick={toggleOperator}
          title={`Switch to ${isAnd ? "OR" : "AND"}`}
          aria-label={`Boolean operator: ${node.operator}. Click to toggle.`}
        >
          {node.operator}
        </button>
        <span className="aqb-group-label">
          {isAnd ? "All conditions must match" : "Any condition must match"}
        </span>
        {!isRoot && (
          <button
            type="button"
            className="aqb-remove-group-btn"
            onClick={onRemove}
            title="Remove this group"
            aria-label="Remove group"
          >
            <svg
              width="13"
              height="13"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
            >
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
            Remove group
          </button>
        )}
      </div>

      {/* Children */}
      <div className="aqb-group-children">
        {node.conditions.map((child, idx) => {
          const childAny = child as any;
          if (child.kind === "CONDITION") {
            return (
              <ConditionRow
                key={childAny.__id}
                node={childAny}
                parentSize={node.conditions.length}
                onUpdate={(updated) => updateChild(idx, updated as any)}
                onRemove={() => removeChild(idx)}
              />
            );
          }
          if (child.kind === "GROUP") {
            return (
              <GroupNodeView
                key={childAny.__id}
                node={childAny}
                depth={depth + 1}
                isRoot={false}
                competitions={competitions}
                seasons={seasons}
                onUpdate={(updated) => updateChild(idx, updated as any)}
                onRemove={() => removeChild(idx)}
              />
            );
          }
          if (child.kind === "MATCH_AGGREGATION") {
            return (
              <MatchAggregationRow
                key={childAny.__id}
                node={childAny}
                onUpdate={(updated) => updateChild(idx, updated)}
                onRemove={() => removeChild(idx)}
              />
            );
          }
          if (child.kind === "COHORT_COMPARISON") {
            return (
              <CohortComparisonRow
                key={childAny.__id}
                node={childAny}
                competitions={competitions}
                seasons={seasons}
                onUpdate={(updated) => updateChild(idx, updated)}
                onRemove={() => removeChild(idx)}
              />
            );
          }
          return null;
        })}
      </div>

      {/* Footer actions */}
      <div className="aqb-group-footer">
        <button
          type="button"
          className="aqb-add-btn"
          onClick={handleAddCondition}
        >
          <svg
            width="12"
            height="12"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
          >
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          Add Condition
        </button>
        <button
          type="button"
          className="aqb-add-group-btn"
          onClick={handleAddGroup}
        >
          <svg
            width="12"
            height="12"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
          >
            <rect x="3" y="3" width="18" height="18" rx="2" />
            <line x1="12" y1="8" x2="12" y2="16" />
            <line x1="8" y1="12" x2="16" y2="12" />
          </svg>
          Add Group
        </button>
        <button
          type="button"
          className="aqb-add-group-btn"
          onClick={handleAddMatchAggregation}
        >
          Add Match Aggregation
        </button>
        <button
          type="button"
          className="aqb-add-group-btn"
          onClick={handleAddCohortComparison}
        >
          Add Cohort Comparison
        </button>
      </div>
    </div>
  );
};

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

export interface PlayerAdvancedQueryBuilderProps {
  onExecute: (query: GroupNode) => void;
  competitions: CompetitionItem[];
  seasons: SeasonItem[];
  loading?: boolean;
  error?: string | null;
}

export const PlayerAdvancedQueryBuilder: React.FC<
  PlayerAdvancedQueryBuilderProps
> = ({ onExecute, competitions, seasons, loading = false, error }) => {
  const [rootNode, setRootNode] = React.useState<GroupNode & { __id: string }>(
    () => {
      return seedIds(defaultGroupNode()) as any;
    },
  );

  const handleReset = useCallback(() => {
    setRootNode(seedIds(defaultGroupNode()) as any);
  }, []);

  const handleExecute = () => {
    onExecute(stripIds(rootNode) as GroupNode);
  };

  return (
    <div className="aqb-root">
      {/* Builder */}
      <GroupNodeView
        node={rootNode as any}
        depth={0}
        isRoot={true}
        competitions={competitions}
        seasons={seasons}
        onUpdate={(updated) => setRootNode(updated as any)}
        onRemove={() => {}} // root cannot be removed
      />

      {/* Error notification */}
      {error && (
        <Notification
          variant="error"
          message={error}
          compact
          style={{ marginBottom: 0 }}
        />
      )}

      {/* Actions */}
      <div className="aqb-actions">
        <button
          type="button"
          className="aqb-reset-btn"
          onClick={handleReset}
          disabled={loading}
        >
          Clear Query
        </button>
        <button
          type="button"
          id="aqb-run-query-btn"
          className="aqb-run-btn"
          onClick={handleExecute}
          disabled={loading}
        >
          {loading ? (
            <>
              <span className="aqb-spinner" aria-hidden="true" />
              Running…
            </>
          ) : (
            <>
              <svg
                width="15"
                height="15"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.2"
                strokeLinecap="round"
              >
                <polygon points="5 3 19 12 5 21 5 3" />
              </svg>
              Run Query
            </>
          )}
        </button>
      </div>
    </div>
  );
};
