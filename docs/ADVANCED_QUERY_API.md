# Advanced Player Query API

> **Task 1** of the Advanced Search roadmap.
> HTTP method: `QUERY` — safe, idempotent, body-bearing read operation.
> GET `/players` is completely unchanged.

---

## Endpoint

```
QUERY /api/players
Content-Type: application/json
```

---

## Request Body

```jsonc
{
  // Required: the root query node. Must be a GROUP.
  "query": QueryNode,

  // Optional: pagination
  "pagination": {
    "limit": 20,   // integer 1–100, default 20
    "offset": 0    // non-negative integer, default 0
  },

  // Optional: restrict season statistics to a specific season/competition
  "scope": {
    "competitionId": "<uuid>",
    "seasonId": "<uuid>"
  }
}
```

---

## QueryNode (Recursive Tree)

A `QueryNode` is a **discriminated union** on the `kind` field:

### GroupNode

```jsonc
{
  "kind": "GROUP",
  "operator": "AND" | "OR",
  "conditions": [QueryNode, ...]   // at least one child required
}
```

- `AND` — all children must match.
- `OR` — any child must match.
- Children can be `CONDITION` leaves or nested `GROUP` nodes.
- OR groups must be **explicitly represented** as a `GroupNode(operator:'OR')`, not implied by ordering.

### FieldCondition

```jsonc
{
  "kind": "CONDITION",
  "field": "<metric key>",
  "operator": "<operator>",
  "value": <value>
}
```

---

## Operators

| Operator   | Description              | Value shape               |
|------------|--------------------------|---------------------------|
| `EQ`       | equals                   | scalar (number or string) |
| `NE`       | not equals               | scalar                    |
| `GT`       | greater than             | number                    |
| `GTE`      | greater than or equal    | number                    |
| `LT`       | less than                | number                    |
| `LTE`      | less than or equal       | number                    |
| `BETWEEN`  | inclusive range          | `[min, max]` (two numbers)|
| `IN`       | value in list            | array of values           |
| `NOT_IN`   | value not in list        | array of values           |

Each metric declares which operators are valid (`allowedOperators`).
- **NUMBER** metrics allow: `EQ, NE, GT, GTE, LT, LTE, BETWEEN`
- **ENUM** metrics allow: `EQ, NE, IN, NOT_IN`
- **STRING** metrics allow: `EQ, NE, IN, NOT_IN`

---

## Queryable Metrics

### Profile (source: player table)

| Key           | Label           | Type   |
|---------------|-----------------|--------|
| `age`         | Age             | NUMBER |
| `height_cm`   | Height (cm)     | NUMBER |
| `weight_kg`   | Weight (kg)     | NUMBER |
| `position`    | Position        | ENUM   |
| `nationality` | Nationality     | STRING |

Valid position values: `GK, LB, CB, RB, LWB, RWB, CM, CDM, CAM, LM, RM, LW, RW, CF, ST`

### Volume (source: season statistics)

| Key           | Label           | Type   |
|---------------|-----------------|--------|
| `minutes`     | Minutes Played  | NUMBER |
| `appearances` | Appearances     | NUMBER |
| `starts`      | Starts          | NUMBER |

### Attack

| Key               | Label           | Type   |
|-------------------|-----------------|--------|
| `goals`           | Goals           | NUMBER |
| `assists`         | Assists         | NUMBER |
| `shots`           | Shots           | NUMBER |
| `shots_on_target` | Shots on Target | NUMBER |

### Passing

| Key                | Label              | Type   |
|--------------------|--------------------|--------|
| `key_passes`       | Key Passes         | NUMBER |
| `passes_attempted` | Passes Attempted   | NUMBER |
| `passes_completed` | Passes Completed   | NUMBER |
| `pass_accuracy`    | Pass Accuracy (%)  | NUMBER (DERIVED) |

### Defense

| Key              | Label          | Type   |
|------------------|----------------|--------|
| `tackles`        | Tackles        | NUMBER |
| `interceptions`  | Interceptions  | NUMBER |
| `duels_won`      | Duels Won      | NUMBER |
| `yellow_cards`   | Yellow Cards   | NUMBER |
| `red_cards`      | Red Cards      | NUMBER |

### Per 90

| Key                    | Label                 | Type   |
|------------------------|-----------------------|--------|
| `goals_per90`          | Goals / 90            | NUMBER |
| `assists_per90`        | Assists / 90          | NUMBER |
| `key_passes_per90`     | Key Passes / 90       | NUMBER |
| `tackles_per90`        | Tackles / 90          | NUMBER |
| `interceptions_per90`  | Interceptions / 90    | NUMBER |

### Goalkeeper

| Key                    | Label                 | Type   |
|------------------------|-----------------------|--------|
| `saves`                | Saves                 | NUMBER |
| `goals_conceded`       | Goals Conceded        | NUMBER |
| `clean_sheets`         | Clean Sheets          | NUMBER |
| `saves_per90`          | Saves / 90            | NUMBER |
| `goals_conceded_per90` | Goals Conceded / 90   | NUMBER |
| `save_percentage`      | Save Percentage (%)   | NUMBER |

---

## Response

Same shape as `GET /players`:

```jsonc
{
  "items": [PlayerItem, ...],
  "pagination": {
    "limit": 20,
    "offset": 0,
    "total": 140
  }
}
```

---

## Example Queries

### Find young midfielders with 900+ minutes

```json
{
  "query": {
    "kind": "GROUP",
    "operator": "AND",
    "conditions": [
      {
        "kind": "GROUP",
        "operator": "OR",
        "conditions": [
          { "kind": "CONDITION", "field": "position", "operator": "EQ", "value": "CM" },
          { "kind": "CONDITION", "field": "position", "operator": "EQ", "value": "CDM" }
        ]
      },
      { "kind": "CONDITION", "field": "age", "operator": "LTE", "value": 23 },
      { "kind": "CONDITION", "field": "minutes", "operator": "GTE", "value": 900 }
    ]
  },
  "pagination": { "limit": 20, "offset": 0 }
}
```

### Find tall players (185–200cm) who score

```json
{
  "query": {
    "kind": "GROUP",
    "operator": "AND",
    "conditions": [
      { "kind": "CONDITION", "field": "height_cm", "operator": "BETWEEN", "value": [185, 200] },
      { "kind": "CONDITION", "field": "goals", "operator": "GTE", "value": 5 }
    ]
  }
}
```

### Find English or Spanish players under 21

```json
{
  "query": {
    "kind": "GROUP",
    "operator": "AND",
    "conditions": [
      { "kind": "CONDITION", "field": "nationality", "operator": "IN", "value": ["England", "Spain"] },
      { "kind": "CONDITION", "field": "age", "operator": "LT", "value": 21 }
    ]
  }
}
```

---

## Error Responses

All validation errors return **400 Bad Request**:

```json
{ "statusCode": 400, "message": "<descriptive error>" }
```

Common errors:
- Unknown metric field → `"Unknown query field: \"player.goals\"..."`
- Invalid operator for metric type → `"Operator \"GTE\" is not valid for metric \"position\"..."`
- Malformed value → `"BETWEEN value for \"age\" must be a [min, max] array of two finite numbers."`
- Empty conditions array → `"Group node \"conditions\" must not be empty."`

**No SQL or internal structure is ever exposed in error messages.**

---

## Security Architecture

| Layer | Protection |
|-------|-----------|
| **Domain Validator** | Rejects unknown fields, invalid operators, wrong value shapes before any SQL |
| **METRIC_SQL_MAP** | All SQL expressions are backend-controlled string literals — never user-derived |
| **TypeORM named parameters** | All values bound as `:param` — no string concatenation |
| **One `QUERY` interceptor** | GET /players is completely isolated — middleware only fires on `req.method === 'QUERY'` |

---

## Architecture Constraints (non-negotiable)

1. `GET /players` is unchanged. Basic search semantics are untouched.
2. No POST fallback. The real HTTP QUERY verb is used.
3. The `Metric Registry` is the single source of truth — no hard-coded SQL in handlers.
4. All user values are TypeORM-bound parameters.
5. OR is explicit (GroupNode with `operator:'OR'`), never implicit precedence.
