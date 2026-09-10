import React, { useCallback, useId } from 'react';
import type {
  GroupNode,
  FieldCondition,
  QueryNode,
  BooleanOperator,
  ConditionOperator,
  ConditionValue,
} from '../../types/player.types';
import {
  PLAYER_QUERY_METRICS,
  PLAYER_QUERY_METRICS_BY_CATEGORY,
  PLAYER_QUERY_METRICS_MAP,
  type CategorizedMetric,
} from '../../types/player-query-metrics';

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
    kind: 'CONDITION',
    field: firstMetric.key,
    operator: firstMetric.allowedOperators[0],
    value: firstMetric.dataType === 'NUMBER' ? 0 : '',
  };
}

export function defaultGroupNode(): GroupNode {
  return {
    kind: 'GROUP',
    operator: 'AND',
    conditions: [defaultCondition()],
  };
}

function defaultValue(metric: CategorizedMetric, op: ConditionOperator): ConditionValue {
  if (op === 'BETWEEN') return [0, 0];
  if (op === 'IN' || op === 'NOT_IN') {
    return metric.dataType === 'NUMBER' ? [] : [];
  }
  if (metric.dataType === 'NUMBER') return 0;
  if (metric.dataType === 'ENUM') return metric.enumValues?.[0] ?? '';
  return '';
}

function updateNode(root: GroupNode, targetId: string, updater: (n: QueryNode) => QueryNode): GroupNode {
  function walk(node: QueryNode): QueryNode {
    if ((node as any).__id === targetId) return updater(node);
    if (node.kind === 'GROUP') {
      return { ...node, conditions: node.conditions.map(walk) };
    }
    return node;
  }
  return walk(root) as GroupNode;
}

function removeNode(root: GroupNode, targetId: string): GroupNode {
  function walk(node: QueryNode): QueryNode[] {
    if (node.kind === 'GROUP') {
      const filtered = node.conditions.flatMap(walk);
      return [{ ...node, conditions: filtered }];
    }
    if ((node as any).__id === targetId) return [];
    return [node];
  }
  const result = walk(root);
  return result[0] as GroupNode;
}

function addCondition(root: GroupNode, groupId: string): GroupNode {
  function walk(node: QueryNode): QueryNode {
    if (node.kind === 'GROUP' && (node as any).__id === groupId) {
      const newCond: any = { ...defaultCondition(), __id: nextId() };
      return { ...node, conditions: [...node.conditions, newCond] };
    }
    if (node.kind === 'GROUP') {
      return { ...node, conditions: node.conditions.map(walk) };
    }
    return node;
  }
  return walk(root) as GroupNode;
}

function addGroup(root: GroupNode, parentId: string): GroupNode {
  function walk(node: QueryNode): QueryNode {
    if (node.kind === 'GROUP' && (node as any).__id === parentId) {
      const newGroup: any = {
        kind: 'GROUP',
        operator: 'AND',
        conditions: [{ ...defaultCondition(), __id: nextId() }],
        __id: nextId(),
      };
      return { ...node, conditions: [...node.conditions, newGroup] };
    }
    if (node.kind === 'GROUP') {
      return { ...node, conditions: node.conditions.map(walk) };
    }
    return node;
  }
  return walk(root) as GroupNode;
}

/** Strip __id before sending to API */
function stripIds(node: QueryNode): QueryNode {
  if (node.kind === 'CONDITION') {
    const { __id, ...rest } = node as any;
    void __id;
    return rest as FieldCondition;
  }
  return {
    kind: 'GROUP',
    operator: node.operator,
    conditions: node.conditions.map(stripIds),
  };
}

// Seed IDs into a node tree for React key tracking
function seedIds(node: QueryNode): QueryNode {
  if (node.kind === 'CONDITION') {
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
  EQ: '=  equals',
  NE: '≠  not equals',
  GT: '>  greater than',
  GTE: '≥  at least',
  LT: '<  less than',
  LTE: '≤  at most',
  IN: 'in list',
  NOT_IN: 'not in list',
  BETWEEN: 'between',
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

const ValueInput: React.FC<ValueInputProps> = ({ metric, operator, value, onChange }) => {
  const uid = useId();

  if (operator === 'BETWEEN') {
    const arr = (Array.isArray(value) && value.length === 2 ? value : [0, 0]) as [number, number];
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

  if (operator === 'IN' || operator === 'NOT_IN') {
    const arrVal = Array.isArray(value) ? (value as (string | number)[]) : [];
    const rawStr = arrVal.join(', ');
    return (
      <input
        type="text"
        className="aqb-value-input aqb-value-input--wide"
        value={rawStr}
        placeholder={metric.dataType === 'NUMBER' ? 'e.g. 1, 2, 3' : 'e.g. CM, CDM'}
        onChange={(e) => {
          const parts = e.target.value.split(',').map((s) => s.trim()).filter(Boolean);
          const parsed = metric.dataType === 'NUMBER'
            ? parts.map(Number).filter((n) => !isNaN(n))
            : parts;
          onChange(parsed as ConditionValue);
        }}
        aria-label="List of values (comma-separated)"
      />
    );
  }

  if (metric.dataType === 'ENUM' && metric.enumValues) {
    return (
      <select
        id={`${uid}-val`}
        className="aqb-select aqb-value-select"
        value={value as string}
        onChange={(e) => onChange(e.target.value)}
        aria-label="Enum value"
      >
        {metric.enumValues.map((v) => (
          <option key={v} value={v}>{v}</option>
        ))}
      </select>
    );
  }

  if (metric.dataType === 'NUMBER') {
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

const ConditionRow: React.FC<ConditionRowProps> = ({ node, parentSize, onUpdate, onRemove }) => {
  const uid = useId();
  const metric = PLAYER_QUERY_METRICS_MAP.get(node.field) ?? PLAYER_QUERY_METRICS[0];

  const handleFieldChange = (newField: string) => {
    const newMetric = PLAYER_QUERY_METRICS_MAP.get(newField) ?? PLAYER_QUERY_METRICS[0];
    const newOp = newMetric.allowedOperators[0];
    onUpdate({ ...node, field: newField, operator: newOp, value: defaultValue(newMetric, newOp) });
  };

  const handleOpChange = (newOp: ConditionOperator) => {
    onUpdate({ ...node, operator: newOp, value: defaultValue(metric, newOp) });
  };

  return (
    <div className="aqb-condition-row" role="group" aria-label="Query condition">
      {/* Field */}
      <select
        id={`${uid}-field`}
        className="aqb-select aqb-field-select"
        value={node.field}
        onChange={(e) => handleFieldChange(e.target.value)}
        aria-label="Metric field"
      >
        {Array.from(PLAYER_QUERY_METRICS_BY_CATEGORY.entries()).map(([cat, metrics]) => (
          <optgroup key={cat} label={cat}>
            {metrics.map((m) => (
              <option key={m.key} value={m.key}>{m.label}</option>
            ))}
          </optgroup>
        ))}
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
          <option key={op} value={op}>{OPERATOR_LABELS[op]}</option>
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
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
          <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
        </svg>
      </button>
    </div>
  );
};

// ---------------------------------------------------------------------------
// Group Node View (recursive)
// ---------------------------------------------------------------------------

interface GroupNodeViewProps {
  node: GroupNode & { __id: string; conditions: (QueryNode & { __id: string })[] };
  depth: number;
  isRoot: boolean;
  onUpdate: (updated: GroupNode) => void;
  onRemove: () => void;
}

const GroupNodeView: React.FC<GroupNodeViewProps> = ({ node, depth, isRoot, onUpdate, onRemove }) => {
  const isAnd = node.operator === 'AND';

  const toggleOperator = () => {
    onUpdate({ ...node, operator: (isAnd ? 'OR' : 'AND') as BooleanOperator });
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
      kind: 'GROUP',
      operator: 'OR',
      conditions: [{ ...defaultCondition(), __id: nextId() }],
      __id: nextId(),
    };
    onUpdate({ ...node, conditions: [...node.conditions, newGroup] });
  };

  return (
    <div
      className={`aqb-group aqb-group--depth-${Math.min(depth, 4)} ${isAnd ? 'aqb-group--and' : 'aqb-group--or'}`}
      data-depth={depth}
    >
      {/* Group header */}
      <div className="aqb-group-header">
        <button
          type="button"
          className={`aqb-bool-toggle ${isAnd ? 'aqb-bool-toggle--and' : 'aqb-bool-toggle--or'}`}
          onClick={toggleOperator}
          title={`Switch to ${isAnd ? 'OR' : 'AND'}`}
          aria-label={`Boolean operator: ${node.operator}. Click to toggle.`}
        >
          {node.operator}
        </button>
        <span className="aqb-group-label">
          {isAnd ? 'All conditions must match' : 'Any condition must match'}
        </span>
        {!isRoot && (
          <button
            type="button"
            className="aqb-remove-group-btn"
            onClick={onRemove}
            title="Remove this group"
            aria-label="Remove group"
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
            Remove group
          </button>
        )}
      </div>

      {/* Children */}
      <div className="aqb-group-children">
        {node.conditions.map((child, idx) => {
          const childAny = child as any;
          if (child.kind === 'CONDITION') {
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
          if (child.kind === 'GROUP') {
            return (
              <GroupNodeView
                key={childAny.__id}
                node={childAny}
                depth={depth + 1}
                isRoot={false}
                onUpdate={(updated) => updateChild(idx, updated as any)}
                onRemove={() => removeChild(idx)}
              />
            );
          }
          return null;
        })}
      </div>

      {/* Footer actions */}
      <div className="aqb-group-footer">
        <button type="button" className="aqb-add-btn" onClick={handleAddCondition}>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          Add Condition
        </button>
        <button type="button" className="aqb-add-group-btn" onClick={handleAddGroup}>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <rect x="3" y="3" width="18" height="18" rx="2" /><line x1="12" y1="8" x2="12" y2="16" /><line x1="8" y1="12" x2="16" y2="12" />
          </svg>
          Add Group
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
  loading?: boolean;
  error?: string | null;
}

export const PlayerAdvancedQueryBuilder: React.FC<PlayerAdvancedQueryBuilderProps> = ({
  onExecute,
  loading = false,
  error,
}) => {
  const [rootNode, setRootNode] = React.useState<GroupNode & { __id: string }>(() => {
    return seedIds(defaultGroupNode()) as any;
  });

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
        node={rootNode}
        depth={0}
        isRoot={true}
        onUpdate={(updated) => setRootNode(updated as any)}
        onRemove={() => {}} // root cannot be removed
      />

      {/* Error banner */}
      {error && (
        <div className="aqb-error" role="alert">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
          {error}
        </div>
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
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
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
