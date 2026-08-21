# Player Position Integrity Task Report

## 1. Task Overview

ScoutBoard gặp lỗi dữ liệu position:

- Một player có thể có nhiều record `is_primary = true`.
- `players.primary_position` có thể không khớp với record primary trong `player_positions`.
- Seed flow cập nhật primary position mới nhưng không hạ tất cả primary position cũ.
- Chưa có database constraint để ngăn lỗi tái diễn.
- Chưa có player update flow chạy trong transaction.

Business rule bắt buộc:

> Một player có thể có nhiều position, nhưng chỉ được có tối đa một position với `is_primary = true`.

## 2. Source Of Truth

`player_positions` là source of truth cho danh sách position và primary position.

`players.primary_position` là denormalized/cache field phục vụ search và filter nhanh.

Hai nguồn phải đồng bộ:

```text
players.primary_position
=
player_positions.position_code
WHERE player_positions.is_primary = true
```

## 3. Root Cause

### 3.1 Seed không hạ toàn bộ primary cũ

Seed cũ chỉ làm như sau:

1. Tạo hoặc promote position mới thành `isPrimary = true`.
2. Hạ position phụ được cấu hình hiện tại thành `false`.
3. Không hạ các position primary cũ khác.

Ví dụ:

```text
Lần 1:
CDM = primary

Lần 2:
DM = primary
CDM không được reset

Kết quả:
CDM = primary
DM  = primary
```

### 3.2 Thiếu database constraint

Schema cũ chỉ có unique constraint trên cặp:

```text
(player_id, position_code)
```

Constraint này không ngăn được:

```text
CDM = true
DM  = true
```

### 3.3 Thiếu write flow cho player position

Trước khi sửa, backend chỉ có read endpoints cho player. Chưa có use case/repository/controller để cập nhật primary position một cách atomic.

### 3.4 Search chưa load đầy đủ position relation

Search và comparison mapping có sử dụng `player.positions`, nhưng query mặc định chưa luôn load relation này. Vì vậy frontend có thể nhận `positions: []` dù database có dữ liệu.

## 4. Files Changed

### Database

- `backend/src/database/migrations/1788000000000-EnforceSinglePrimaryPlayerPosition.ts`

### Backend position update flow

- `backend/src/modules/players/application/ports/player-position-write.repository.ts`
- `backend/src/modules/players/application/use-cases/update-player-primary-position.use-case.ts`
- `backend/src/modules/players/infrastructure/persistence/typeorm/repositories/typeorm-player-position-write.repository.ts`
- `backend/src/modules/players/presentation/http/dto/update-player-primary-position.dto.ts`
- `backend/src/modules/players/presentation/http/controllers/players.controller.ts`
- `backend/src/modules/players/players.module.ts`

### Seed

- `backend/src/database/seeds/app/football-zone2.seed.ts`

### Read mapping

- `backend/src/modules/players/infrastructure/persistence/typeorm/repositories/typeorm-player-read.repository.ts`
- `backend/src/modules/players/presentation/http/dto/player-response.dto.ts`
- `backend/src/modules/players/application/use-cases/search-players.use-case.ts`
- `backend/src/modules/players/application/use-cases/get-comparison-candidates.use-case.ts`

### Tests

- `backend/src/modules/players/application/use-cases/update-player-primary-position.use-case.spec.ts`
- `backend/src/modules/players/presentation/http/controllers/players.controller.spec.ts`
- `backend/src/modules/players/application/use-cases/get-comparison-candidates.use-case.spec.ts`

## 5. Migration Behavior

Migration file:

```text
backend/src/database/migrations/1788000000000-EnforceSinglePrimaryPlayerPosition.ts
```

Migration thực hiện theo thứ tự:

### Step 1: Create missing position relations

Nếu player có `players.primary_position` nhưng chưa có position relation tương ứng, migration tạo record:

```text
position_code = players.primary_position
is_primary = true
```

### Step 2: Normalize duplicate primary positions

Migration dùng `ROW_NUMBER()` để chọn đúng một primary position cho mỗi player.

Thứ tự ưu tiên:

1. Position khớp với `players.primary_position`.
2. Position cũ có `is_primary = true`.
3. `position_code` theo thứ tự tăng dần.
4. `id` theo thứ tự tăng dần để đảm bảo deterministic.

Các record còn lại được đặt:

```text
is_primary = false
```

### Step 3: Synchronize cache field

`players.primary_position` được cập nhật theo position có `is_primary = true`.

### Step 4: Create partial unique index

```sql
CREATE UNIQUE INDEX "IDX_player_positions_one_primary_per_player"
ON "player_positions" ("player_id")
WHERE "is_primary" = TRUE;
```

Index này bảo vệ database khỏi việc một player có nhiều primary position.

## 6. Transactional Update Flow

Endpoint mới:

```http
PATCH /api/players/:id/primary-position
```

Request body:

```json
{
  "positionCode": "DM"
}
```

Flow:

```text
BEGIN TRANSACTION

1. Lock player bằng pessimistic_write.
2. Set toàn bộ player_positions.is_primary = false.
3. Tìm target position.
4. Nếu target chưa tồn tại, tạo mới.
5. Nếu target đã tồn tại, update thành is_primary = true.
6. Update players.primary_position.
7. COMMIT.
```

Nếu bất kỳ bước nào thất bại, transaction rollback toàn bộ.

## 7. Seed Flow Sau Khi Sửa

Seed hiện tại:

- Cập nhật `players.primary_position`.
- Hạ toàn bộ position cũ về `isPrimary = false`.
- Promote primary position mới.
- Tạo primary position nếu chưa tồn tại.
- Tạo hoặc cập nhật secondary position.
- Xử lý cache và position trong cùng transaction cho từng player.

Việc chạy seed nhiều lần sẽ không để lại primary position cũ ở trạng thái `true`.

## 8. Read Flow Sau Khi Sửa

Search và comparison candidate đã load:

```text
player.positions
```

Backend response có thể trả:

```json
{
  "primaryPosition": "DM",
  "positions": [
    {
      "positionCode": "DM",
      "isPrimary": true
    },
    {
      "positionCode": "CDM",
      "isPrimary": false
    }
  ]
}
```

Không sử dụng frontend workaround để sửa dữ liệu sai. Frontend chỉ hiển thị dữ liệu đã được backend đồng bộ.

## 9. Tests Added Or Updated

Đã thêm hoặc cập nhật test cho:

- Use case gọi `DataSource.transaction`.
- Repository được gọi bằng transaction manager.
- Repository failure được propagate để transaction rollback.
- Controller được wiring với update use case.
- Comparison response có field `positions`.

## 10. Verification Results

### Passed

```text
Backend test suites: 39 passed
Backend tests: 133 passed
Focused transaction tests: 2 passed
Backend build: passed
Frontend build: passed
Editor diagnostics: no errors in changed core files
```

## 11. Pending Verification

### 11.1 Migration chưa chạy trên PostgreSQL thật

Migration đã compile nhưng chưa được xác minh trực tiếp bằng database thật trong môi trường hiện tại.

Cần chạy:

```bash
cd backend
npm run migration:run
```

### 11.2 Chưa biết số lượng duplicate thực tế trước cleanup

Cần chạy trước migration:

```sql
SELECT
    player_id,
    COUNT(*) AS primary_count
FROM player_positions
WHERE is_primary = TRUE
GROUP BY player_id
HAVING COUNT(*) > 1;
```

### 11.3 Verification query sau migration

```sql
SELECT
    player_id,
    COUNT(*) AS primary_count
FROM player_positions
WHERE is_primary = TRUE
GROUP BY player_id
HAVING COUNT(*) > 1;
```

Expected result:

```text
0 rows
```

### 11.4 Consistency query

```sql
SELECT
    p.id,
    p.primary_position,
    pp.position_code
FROM players p
LEFT JOIN player_positions pp
  ON pp.player_id = p.id
 AND pp.is_primary = TRUE
WHERE p.primary_position IS DISTINCT FROM pp.position_code;
```

Expected result:

```text
0 rows
```

### 11.5 Chưa có integration test PostgreSQL

Chưa có test thực tế cho:

- Concurrent update.
- Unique partial index.
- Migration cleanup.
- Rollback sau database failure.
- Target position chưa tồn tại trên database thật.

## 12. Remaining Risks

### Authorization

Endpoint `PATCH /api/players/:id/primary-position` hiện cần được xác định rõ quyền truy cập. Nếu đây là endpoint chỉnh sửa dữ liệu nghiệp vụ, nên giới hạn cho user đã xác thực hoặc role phù hợp.

### Database-level cross-table consistency

Partial unique index đảm bảo mỗi player có tối đa một primary position, nhưng không tự đảm bảo giá trị `players.primary_position` luôn giống `player_positions.position_code`.

Consistency hiện được bảo vệ bởi:

- Migration.
- Transactional update flow.
- Seed flow.

Nếu cần database tự bảo vệ cross-table consistency tuyệt đối, cần dùng database trigger hoặc loại bỏ cache field.

### Migration rollback

`down()` chỉ xóa partial unique index. Nó không khôi phục các record position được tạo trong cleanup hoặc các giá trị trước khi normalize.

## 13. Final Status

```text
Single-primary business rule: IMPLEMENTED
Seed synchronization: IMPLEMENTED
Transactional update flow: IMPLEMENTED
Partial unique database index: IMPLEMENTED IN MIGRATION
Search position loading: IMPLEMENTED
Unit tests: PASS
Backend build: PASS
Frontend build: PASS
Migration execution on real database: PENDING
Duplicate count before cleanup: UNKNOWN
Duplicate count after cleanup on real database: PENDING
Concurrent PostgreSQL test: PENDING
Rollback PostgreSQL test: PENDING
Authorization review: PENDING
```

## 14. Recommended Next Steps

1. Backup database.
2. Run the duplicate-count query.
3. Run `npm run migration:run`.
4. Run the verification queries.
5. Test `PATCH /api/players/:id/primary-position` with an existing target position.
6. Test with a new target position.
7. Add authentication/authorization to the update endpoint.
8. Add PostgreSQL integration tests for constraint, concurrency, and rollback.
