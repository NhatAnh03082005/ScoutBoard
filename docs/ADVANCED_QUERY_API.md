# Advanced Player Query API

> **Tasks 1, 2 & 3.1** of the Advanced Search roadmap.
> HTTP method: `QUERY` — safe, idempotent, body-bearing read operation.
> `GET /players` is completely unchanged.

---

## Endpoint

```http
QUERY /api/players
Authorization: Bearer <access_token>
Content-Type: application/json
```

---

## Authentication & Authorization

- **Secured Endpoint (SEC-001):** `QUERY /api/players` requires a valid JSON Web Token via the `Authorization: Bearer <access_token>` header.
- **Authentication & Authorization Behaviors:**
  - **Anonymous / Missing Token:** Returns `401 Unauthorized` (`{ "statusCode": 401, "message": "Access Token không hợp lệ hoặc đã hết hạn" }`).
  - **Malformed / Invalid / Expired Token:** Returns `401 Unauthorized`.
  - **Authenticated USER:** Allowed (`200 OK`).
  - **Authenticated ADMIN:** Allowed (`200 OK`).
- **Contrast with `GET /api/players`:**
  - `GET /api/players` remains a completely public/unauthenticated endpoint for basic player searching and filtering.
  - `QUERY /api/players` is dedicated to advanced Boolean query tree execution, match aggregation, and cohort ranking, requiring JWT authentication.

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

  // Optional: restrict season statistics AND match statistics to a specific
  // season/competition context. When present, BOTH the season-stat join
  // (Task 1 metrics) AND match-stat EXISTS subqueries (Task 2) filter to
  // this scope. You cannot mix season A stats with season B match stats.
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
- Children can be `CONDITION`, `MATCH_AGGREGATION`, `COHORT_COMPARISON`, or nested `GROUP` nodes.
- OR groups must be **explicitly represented** as a `GroupNode(operator:'OR')`.

### FieldCondition (Task 1)

```jsonc
{
  "kind": "CONDITION",
  "field": "<metric key>",    // must be a registered PLAYER or SEASON_STAT metric
  "operator": "<operator>",
  "value": <value>
}
```

MATCH_STAT metrics **cannot** appear in a plain `FieldCondition`.
They are only valid inside a `MatchAggregationCondition`.

### MatchAggregationCondition (Task 2)

```jsonc
{
  "kind": "MATCH_AGGREGATION",
  "matchCriteria": {
    "kind": "CONDITION",
    "field": "<match metric key>",   // must be a MATCH_STAT metric
    "operator": "<operator>",
    "value": <value>
  },
  "aggregation": {
    "type": "COUNT" | "AVG" | "QUALIFYING_RATE",
    "operator": "EQ" | "NE" | "GT" | "GTE" | "LT" | "LTE",
    "value": <number>,
    "field": "<match metric key>"   // required ONLY for AVG
  }
}
```

---

## Aggregation Types (Task 2)

### COUNT

```
COUNT(matches where matchCriteria) >= threshold
```

Counts the number of `player_match_statistics` rows satisfying `matchCriteria`
for a given player. NULL metric values (e.g. `rating IS NULL`) are not counted.

```jsonc
{
  "kind": "MATCH_AGGREGATION",
  "matchCriteria": {
    "kind": "CONDITION",
    "field": "match_rating",
    "operator": "GTE",
    "value": 7,
  },
  "aggregation": { "type": "COUNT", "operator": "GTE", "value": 5 },
}
```

Meaning: player has ≥ 5 matches with rating ≥ 7.

### AVG

```
AVG(aggregation.field over rows where matchCriteria AND minutes_played > 0) >= threshold
```

Computes the average of `aggregation.field` over rows where:

1. `matchCriteria` holds AND
2. `minutes_played > 0` (excludes non-playing rows — sub appearances where player was not used)

NULL values in `aggregation.field` are excluded by SQL standard AVG behavior.

```jsonc
{
  "kind": "MATCH_AGGREGATION",
  "matchCriteria": {
    "kind": "CONDITION",
    "field": "match_minutes_played",
    "operator": "GT",
    "value": 0,
  },
  "aggregation": {
    "type": "AVG",
    "operator": "GTE",
    "value": 7.2,
    "field": "match_rating",
  },
}
```

Meaning: player's average rating over played matches is ≥ 7.2.

> **Note on NULL semantics**: `rating` in `player_match_statistics` is nullable.
> AVG silently ignores NULL ratings (SQL standard). If a player has no non-NULL
> ratings, AVG returns NULL and the HAVING clause fails (player not included). This
> is the correct behavior — do not promote non-playing rows to zero ratings.

### QUALIFYING_RATE

```
COUNT(rows where minutes_played > 0 AND matchCriteria) /
COUNT(rows where minutes_played > 0) >= threshold
```

Threshold is a decimal between 0 and 1 (e.g. `0.7` = 70%).

```jsonc
{
  "kind": "MATCH_AGGREGATION",
  "matchCriteria": {
    "kind": "CONDITION",
    "field": "match_rating",
    "operator": "GTE",
    "value": 7,
  },
  "aggregation": { "type": "QUALIFYING_RATE", "operator": "GTE", "value": 0.7 },
}
```

Meaning: ≥ 70% of player's played matches have a rating ≥ 7. Zero-minute and NULL-minute rows are excluded from both numerator and denominator.
If player has 0 played matches, NULLIF prevents division-by-zero and the player is excluded.

---

## Cohort Comparison (Tasks 3.1 and 3.2)

`COHORT_COMPARISON` compares a candidate player's registered numeric season
metric with a baseline calculated from a separate reference population. The
candidate query tree and the cohort population are intentionally independent.

```jsonc
{
  "kind": "COHORT_COMPARISON",
  "metric": "goals_per90",
  "comparison": {
    "type": "AVERAGE" | "MEDIAN" | "PERCENTILE" | "RANK",
    "operator": "EQ" | "NE" | "GT" | "GTE" | "LT" | "LTE",
    // Required for PERCENTILE (0..100) and RANK (integer >= 1)
    "value": 90
  },
  "cohort": {
    "competitionId": "<uuid>",
    "seasonId": "<uuid>",
    "position": ["CM", "CDM"]
  }
}
```

The cohort requires a competition, season, and one or more exact canonical
positions: `GK`, `LB`, `CB`, `RB`, `LWB`, `RWB`, `CM`, `CDM`, `CAM`, `LM`,
`RM`, `LW`, `RW`, `CF`, or `ST`. Broad values such as `DEF`, `MID`, and `FWD`
are not accepted here.

Only registered numeric `SEASON_STAT` metrics are valid. `AVERAGE` is the SQL
`AVG` of one metric value per cohort player. `MEDIAN` is PostgreSQL's
`PERCENTILE_CONT(0.5)` over those player-level values, so an even-sized cohort
uses interpolated median semantics.

`PERCENTILE` uses PostgreSQL `PERCENTILE_CONT(value / 100)` over the ascending
cohort distribution. For example, `GTE` with `value: 90` means the candidate
metric is at least the cohort's 90th percentile. Top 10% is therefore
`PERCENTILE` + `GTE` + `90`; bottom 10% is `PERCENTILE` + `LTE` + `10`.

`RANK` uses PostgreSQL `RANK()` over the cohort distribution with competition
ranking, so ties produce ranks such as `1, 1, 3`. Rank 1 is the best value.
Metrics default to descending rank order (higher is better); metrics explicitly
marked lower-is-better in the registry use ascending order. Rank values start
at 1 and can be compared with scalar operators.

NULL metrics, missing season-stat rows, and NULL derived values do not
participate. Zero-minute players are not automatically converted to zero; a
stored NULL metric remains excluded. An empty cohort or a cohort with no valid
metric values produces a NULL baseline, so no candidate satisfies the
comparison.

The baseline is calculated in PostgreSQL. Cohort rows are reduced to one value
per player before the baseline is computed, preventing players with multiple
stat rows from receiving extra weight. The candidate metric is then compared
against that independent baseline, and the rest of the QueryNode tree is
applied normally. Cohort comparisons can appear in AND, OR, nested groups, and
alongside Task 2 match aggregations.

---

## Operators

| Operator  | Description           | Value shape                |
| --------- | --------------------- | -------------------------- |
| `EQ`      | equals                | scalar (number or string)  |
| `NE`      | not equals            | scalar                     |
| `GT`      | greater than          | number                     |
| `GTE`     | greater than or equal | number                     |
| `LT`      | less than             | number                     |
| `LTE`     | less than or equal    | number                     |
| `BETWEEN` | inclusive range       | `[min, max]` (two numbers) |
| `IN`      | value in list         | array of values            |
| `NOT_IN`  | value not in list     | array of values            |

Aggregation operators: `EQ, NE, GT, GTE, LT, LTE` only (no arrays or ranges).

---

## Queryable Metrics

### Profile (source: player table) — Task 1

| Key           | Label       | Type   |
| ------------- | ----------- | ------ |
| `age`         | Age         | NUMBER |
| `height_cm`   | Height (cm) | NUMBER |
| `weight_kg`   | Weight (kg) | NUMBER |
| `position`    | Position    | ENUM   |
| `nationality` | Nationality | STRING |

Valid position values: `GK, LB, CB, RB, LWB, RWB, CM, CDM, CAM, LM, RM, LW, RW, CF, ST`

### Volume (source: season statistics) — Task 1

| Key           | Label          | Type   |
| ------------- | -------------- | ------ |
| `minutes`     | Minutes Played | NUMBER |
| `appearances` | Appearances    | NUMBER |
| `starts`      | Starts         | NUMBER |

### Attack — Task 1

| Key               | Label           | Type   |
| ----------------- | --------------- | ------ |
| `goals`           | Goals           | NUMBER |
| `assists`         | Assists         | NUMBER |
| `shots`           | Shots           | NUMBER |
| `shots_on_target` | Shots on Target | NUMBER |

### Passing — Task 1

| Key                | Label             | Type             |
| ------------------ | ----------------- | ---------------- |
| `key_passes`       | Key Passes        | NUMBER           |
| `passes_attempted` | Passes Attempted  | NUMBER           |
| `passes_completed` | Passes Completed  | NUMBER           |
| `pass_accuracy`    | Pass Accuracy (%) | NUMBER (DERIVED) |

### Defense — Task 1

| Key             | Label         | Type   |
| --------------- | ------------- | ------ |
| `tackles`       | Tackles       | NUMBER |
| `interceptions` | Interceptions | NUMBER |
| `duels_won`     | Duels Won     | NUMBER |
| `yellow_cards`  | Yellow Cards  | NUMBER |
| `red_cards`     | Red Cards     | NUMBER |

### Per 90 — Task 1

| Key                   | Label              | Type   |
| --------------------- | ------------------ | ------ |
| `goals_per90`         | Goals / 90         | NUMBER |
| `assists_per90`       | Assists / 90       | NUMBER |
| `key_passes_per90`    | Key Passes / 90    | NUMBER |
| `tackles_per90`       | Tackles / 90       | NUMBER |
| `interceptions_per90` | Interceptions / 90 | NUMBER |

### Goalkeeper — Task 1

| Key                    | Label               | Type   |
| ---------------------- | ------------------- | ------ |
| `saves`                | Saves               | NUMBER |
| `goals_conceded`       | Goals Conceded      | NUMBER |
| `clean_sheets`         | Clean Sheets        | NUMBER |
| `saves_per90`          | Saves / 90          | NUMBER |
| `goals_conceded_per90` | Goals Conceded / 90 | NUMBER |
| `save_percentage`      | Save Percentage (%) | NUMBER |

---

## Match-Level Metrics (MATCH_STAT source) — Task 2

These metrics can **only** appear inside a `MatchAggregationCondition.matchCriteria`
or as the `aggregation.field` for AVG. They cannot appear in a plain `CONDITION` node.

| Key                      | Label                  | Type    | Notes      |
| ------------------------ | ---------------------- | ------- | ---------- |
| `match_rating`           | Match Rating           | NUMBER  | nullable   |
| `match_minutes_played`   | Match Minutes Played   | NUMBER  |            |
| `match_is_starter`       | Is Starter             | BOOLEAN | true/false |
| `match_goals`            | Match Goals            | NUMBER  |            |
| `match_assists`          | Match Assists          | NUMBER  |            |
| `match_shots`            | Match Shots            | NUMBER  |            |
| `match_key_passes`       | Match Key Passes       | NUMBER  |            |
| `match_passes_attempted` | Match Passes Attempted | NUMBER  |            |
| `match_passes_completed` | Match Passes Completed | NUMBER  |            |
| `match_tackles`          | Match Tackles          | NUMBER  |            |
| `match_interceptions`    | Match Interceptions    | NUMBER  |            |
| `match_yellow_cards`     | Match Yellow Cards     | NUMBER  |            |
| `match_red_cards`        | Match Red Cards        | NUMBER  |            |
| `match_saves`            | Match Saves            | NUMBER  | GK only    |
| `match_goals_conceded`   | Match Goals Conceded   | NUMBER  | GK only    |
| `match_clean_sheets`     | Match Clean Sheets     | NUMBER  | GK only    |
| `match_penalties_saved`  | Match Penalties Saved  | NUMBER  | GK only    |

---

## Season/Competition Scope Behavior (Task 2)

When `scope.seasonId` or `scope.competitionId` is provided:

1. **Season stat metrics (Task 1)**: The `pss` join is filtered with
   `pss.season_id = :scopeSeasonId AND pss.competition_id = :scopeCompId`.

2. **Match aggregation metrics (Task 2)**: The EXISTS subquery joins
   `player_match_statistics pms INNER JOIN matches m ON m.id = pms.match_id`
   and filters `m.season_id = :scopeSeasonId AND m.competition_id = :scopeCompId`.

**Guarantee**: Season stats and match stats always reference the same scope.
A player cannot satisfy Task 1 season-stat conditions from season A and
Task 2 match-stat conditions from season B in the same query.

---

## SQL Architecture (Task 2)

Each `MatchAggregationCondition` generates a correlated EXISTS subquery:

```sql
EXISTS (
  SELECT 1
  FROM player_match_statistics pms
  INNER JOIN matches m ON m.id = pms.match_id
  WHERE pms.player_id = player.id
    [AND m.season_id = :scopeSeasonId]
    [AND m.competition_id = :scopeCompetitionId]
  GROUP BY pms.player_id
  HAVING
    COUNT(*) FILTER (WHERE pms.rating >= :p0)    -- COUNT
    -- or AVG(CASE WHEN ... THEN pms.rating END) -- AVG
    -- or CAST(COUNT FILTER...) / NULLIF(...)    -- QUALIFYING_RATE
    >= :p1
)
```

**Grouping**: Aggregation is per `pms.player_id`. Final result rows are deduplicated
at the player level — no multiply-joined rows reach the pagination layer.

**NULL safety**: `COUNT(*) FILTER` skips NULL matchCriteria results implicitly.
AVG ignores NULL `aggregation.field` values by SQL standard.
QUALIFYING_RATE counts only played rows (`minutes_played > 0`) in both numerator and denominator, and uses `NULLIF(..., 0)` to avoid division-by-zero.

---

## Boolean Composition with Aggregation Nodes (Task 2)

Match aggregation nodes can appear anywhere a `QueryNode` can appear:

```
A AND MatchAggregation
A OR MatchAggregation
(A OR B) AND MatchAggregation
MatchAggregation AND (A OR B)
(MatchAggregationA OR MatchAggregationB) AND ConditionC
```

The recursive tree structure is preserved — nothing is flattened.

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

`total` is the count of **players** matching the query — not matches.
Each player appears at most once in the results.

---

## Example Queries

### Find young midfielders with 900+ minutes (Task 1)

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
          {
            "kind": "CONDITION",
            "field": "position",
            "operator": "EQ",
            "value": "CM"
          },
          {
            "kind": "CONDITION",
            "field": "position",
            "operator": "EQ",
            "value": "CDM"
          }
        ]
      },
      { "kind": "CONDITION", "field": "age", "operator": "LTE", "value": 23 },
      {
        "kind": "CONDITION",
        "field": "minutes",
        "operator": "GTE",
        "value": 900
      }
    ]
  },
  "pagination": { "limit": 20, "offset": 0 }
}
```

### COUNT — players with ≥ 5 matches rated ≥ 7 (Task 2, Test 1)

```json
{
  "query": {
    "kind": "GROUP",
    "operator": "AND",
    "conditions": [
      {
        "kind": "MATCH_AGGREGATION",
        "matchCriteria": {
          "kind": "CONDITION",
          "field": "match_rating",
          "operator": "GTE",
          "value": 7
        },
        "aggregation": { "type": "COUNT", "operator": "GTE", "value": 5 }
      }
    ]
  }
}
```

### COUNT — players with ≥ 3 matches of ≥ 3 key passes (Task 2, Test 2)

```json
{
  "query": {
    "kind": "GROUP",
    "operator": "AND",
    "conditions": [
      {
        "kind": "MATCH_AGGREGATION",
        "matchCriteria": {
          "kind": "CONDITION",
          "field": "match_key_passes",
          "operator": "GTE",
          "value": 3
        },
        "aggregation": { "type": "COUNT", "operator": "GTE", "value": 3 }
      }
    ]
  }
}
```

### AVG — average rating ≥ 7.2 (Task 2, Test 3)

```json
{
  "query": {
    "kind": "GROUP",
    "operator": "AND",
    "conditions": [
      {
        "kind": "MATCH_AGGREGATION",
        "matchCriteria": {
          "kind": "CONDITION",
          "field": "match_minutes_played",
          "operator": "GT",
          "value": 0
        },
        "aggregation": {
          "type": "AVG",
          "operator": "GTE",
          "value": 7.2,
          "field": "match_rating"
        }
      }
    ]
  }
}
```

### Age ≤ 23 AND COUNT(rating ≥ 7) ≥ 5 (Task 2, Test 4)

```json
{
  "query": {
    "kind": "GROUP",
    "operator": "AND",
    "conditions": [
      { "kind": "CONDITION", "field": "age", "operator": "LTE", "value": 23 },
      {
        "kind": "MATCH_AGGREGATION",
        "matchCriteria": {
          "kind": "CONDITION",
          "field": "match_rating",
          "operator": "GTE",
          "value": 7
        },
        "aggregation": { "type": "COUNT", "operator": "GTE", "value": 5 }
      }
    ]
  }
}
```

### (CM OR CDM) AND minutes ≥ 900 AND COUNT(rating ≥ 7) ≥ 5 (Task 2, Test 5)

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
          {
            "kind": "CONDITION",
            "field": "position",
            "operator": "EQ",
            "value": "CM"
          },
          {
            "kind": "CONDITION",
            "field": "position",
            "operator": "EQ",
            "value": "CDM"
          }
        ]
      },
      {
        "kind": "CONDITION",
        "field": "minutes",
        "operator": "GTE",
        "value": 900
      },
      {
        "kind": "MATCH_AGGREGATION",
        "matchCriteria": {
          "kind": "CONDITION",
          "field": "match_rating",
          "operator": "GTE",
          "value": 7
        },
        "aggregation": { "type": "COUNT", "operator": "GTE", "value": 5 }
      }
    ]
  }
}
```

### Season-scoped aggregation (Task 2, Test 8)

```json
{
  "query": {
    "kind": "GROUP",
    "operator": "AND",
    "conditions": [
      {
        "kind": "MATCH_AGGREGATION",
        "matchCriteria": {
          "kind": "CONDITION",
          "field": "match_rating",
          "operator": "GTE",
          "value": 7
        },
        "aggregation": { "type": "COUNT", "operator": "GTE", "value": 3 }
      }
    ]
  },
  "scope": { "seasonId": "<uuid>" }
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
- MATCH_STAT field in CONDITION → `"Match metric \"match_rating\" is only valid inside a MATCH_AGGREGATION node."`
- Season stat in MATCH_AGGREGATION → `"Match criteria field \"goals\" must be a registered match metric."`
- Invalid aggregation type → `"MATCH_AGGREGATION type must be COUNT, AVG, or QUALIFYING_RATE."`
- QUALIFYING_RATE > 1 → `"QUALIFYING_RATE value must be between 0 and 1."`
- AVG without field → `"AVG aggregation requires a registered match metric \"field\"."`
- Invalid operator for metric type → `"Operator \"GTE\" is not valid for metric \"position\"..."`
- Malformed value → `"BETWEEN value for \"age\" must be a [min, max] array of two finite numbers."`
- Empty conditions array → `"Group node \"conditions\" must not be empty."`

**No SQL or internal structure is ever exposed in error messages.**

---

## Security Architecture

| Layer                                     | Protection                                                                                  |
| ----------------------------------------- | ------------------------------------------------------------------------------------------- |
| **Domain Validator**                      | Rejects unknown fields, invalid operators, wrong value shapes before any SQL                |
| **MATCH_STAT Isolation**                  | MATCH_STAT fields blocked from CONDITION nodes; season stats blocked from MATCH_AGGREGATION |
| **METRIC_SQL_MAP / MATCH_METRIC_SQL_MAP** | All SQL expressions are backend-controlled string literals — never user-derived             |
| **TypeORM named parameters**              | All values bound as `:param` — no string concatenation                                      |
| **Scope isolation**                       | Scope from BuildContext flows into EXISTS subqueries — user cannot specify arbitrary SQL    |
| **One `QUERY` interceptor**               | GET /players completely isolated — middleware fires only on `req.method === 'QUERY'`        |

---

## Architecture Constraints (non-negotiable)

1. `GET /players` is unchanged. Basic search semantics are untouched.
2. No POST fallback. The real HTTP QUERY verb is used.
3. The Metric Registry is the single source of truth — no hard-coded SQL in handlers.
4. All user values are TypeORM-bound parameters.
5. OR is explicit (GroupNode with `operator:'OR'`), never implicit precedence.
6. Aggregation happens in PostgreSQL — no match rows are loaded into Node.js.
7. Results are deduplicated at player level — pagination operates on aggregated players.

---

## Task 3.3 — Deferred

The following features are **NOT implemented** and remain deferred:

- Top-N / bottom-N
- Weighted scouting scores
- Saved queries / search alerts
- AI-assisted scouting recommendations

Do not interpret any existing API behavior as percentile or cohort support.
