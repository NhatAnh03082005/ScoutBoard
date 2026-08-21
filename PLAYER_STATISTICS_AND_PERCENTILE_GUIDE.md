# HƯỚNG DẪN CHI TIẾT: QUY TRÌNH TRUY VẤN DỮ LIỆU, PHÂN BIỆT GOALKEEPER & CÔNG THỨC TÍNH METRICS TRONG SCOUTBOARD

Tài liệu này tổng hợp toàn diện các thông tin kỹ thuật về:
1. **Chi tiết từng API Endpoint, Hàm Frontend, Controller, Use Case, Repository và Câu lệnh SQL thực tế**.
2. **Cơ chế phân biệt Thủ môn (GK) và Cầu thủ sân (Outfield) từ Database đến Giao diện**.
3. **Toàn bộ công thức toán học tính Per-90, Tỷ lệ cứu thua & Tỷ lệ giữ sạch lưới**.

---

## MỤC LỤC
- [1. BẢNG TRA CỨU NHANH CÁC API VÀ HÀM XỬ LÝ](#1-bảng-tra-cứu-nhanh-các-api-và-hàm-xử-lý)
- [2. CHI TIẾT TỪNG LUỒNG TRUY VẤN DỮ LIỆU & SQL QUERY](#2-chi-tiết-từng-luồng-truy-vấn-dữ-liệu--sql-query)
  - [2.1. API Lấy thông tin chi tiết cầu thủ (Profile & Primary Position)](#21-api-lấy-thông-tin-chi-tiết-cầu-thủ-profile--primary-position)
  - [2.2. API Lấy thống kê theo mùa giải](#22-api-lấy-thống-kê-theo-mùa-giải)
  - [2.3. API Lấy thống kê từng trận đấu (Recent Match Log)](#23-api-lấy-thống-kê-từng-trận-đấu-recent-match-log)
- [3. CƠ CHẾ PHÂN BIỆT GOALKEEPER VÀ CẦU THỦ SÂN](#3-cơ-chế-phân-biệt-goalkeeper-và-cầu-thủ-sân)
- [4. TOÀN BỘ CÔNG THỨC TOÁN HỌC TÍNH CÁC CHỈ SỐ METRICS](#4-toàn-bộ-công-thức-toán-học-tính-các-chỉ-số-metrics)

---

# 1. BẢNG TRA CỨU NHANH CÁC API VÀ HÀM XỬ LÝ

| API Endpoint | HTTP Method | Hàm Frontend (`frontend/src/api/player.api.ts`) | Controller Method (`players.controller.ts`) | Use Case Class (`backend/src/modules/players/application/use-cases/`) | Repository Method (`typeorm-player-read.repository.ts`) |
|---|---|---|---|---|---|
| `/api/players` | `GET` | `searchPlayersApi(params)` | `search(query)` | `SearchPlayersUseCase.execute()` | `search(query)` |
| `/api/players/:id` | `GET` | `getPlayerByIdApi(id)` | `getById(id)` | `GetPlayerByIdUseCase.execute()` | `findById(id)` |
| `/api/players/:id/season-statistics` | `GET` | `getPlayerSeasonStatisticsApi(id)` | `getSeasonStatistics(id)` | `GetPlayerSeasonStatisticsUseCase.execute()` | `findSeasonStatisticsByPlayerId(id)` |
| `/api/players/:id/match-statistics` | `GET` | `getPlayerMatchStatisticsApi(id, params)` | `getMatchStatistics(id, query)` | `GetPlayerMatchStatisticsUseCase.execute()` | `findMatchStatisticsByPlayerId(id, query)` |

---

# 2. CHI TIẾT TỪNG LUỒNG TRUY VẤN DỮ LIỆU & SQL QUERY

---

### 2.1. API Lấy thông tin chi tiết cầu thủ (Profile & Primary Position)

#### A. Thông tin luồng gọi:
- **Endpoint**: `GET /api/players/:id`
- **Hàm Frontend**: `getPlayerByIdApi(playerId)` trong [`frontend/src/api/player.api.ts`](file:///d:/FullStack/Football/ScoutBoard/frontend/src/api/player.api.ts)
- **Controller**: `PlayersController.findOne(@Param('id') id: string)` trong [`players.controller.ts`](file:///d:/FullStack/Football/ScoutBoard/backend/src/modules/players/presentation/http/controllers/players.controller.ts)
- **Use Case**: `GetPlayerByIdUseCase.execute(id)` trong [`get-player-by-id.use-case.ts`](file:///d:/FullStack/Football/ScoutBoard/backend/src/modules/players/application/use-cases/get-player-by-id.use-case.ts)
- **Repository Method**: `TypeOrmPlayerReadRepository.findById(id)` trong [`typeorm-player-read.repository.ts`](file:///d:/FullStack/Football/ScoutBoard/backend/src/modules/players/infrastructure/persistence/typeorm/repositories/typeorm-player-read.repository.ts)

#### B. Câu lệnh SQL thực tế chạy dưới PostgreSQL:
```sql
{{ ... }}
-- Tham số: $1 = '327ae128-8c1c-4711-8e27-c229194998a4'
```

---

### 2.2. API Lấy thống kê theo mùa giải

#### A. Thông tin luồng gọi:
- **Endpoint**: `GET /api/players/:id/season-statistics`
- **Hàm Frontend**: `getPlayerSeasonStatisticsApi(playerId)` trong [`frontend/src/api/player.api.ts`](file:///d:/FullStack/Football/ScoutBoard/frontend/src/api/player.api.ts)
- **Controller**: `PlayersController.getSeasonStatistics(@Param('id') id: string)` trong [`players.controller.ts`](file:///d:/FullStack/Football/ScoutBoard/backend/src/modules/players/presentation/http/controllers/players.controller.ts)
- **Use Case**: `GetPlayerSeasonStatisticsUseCase.execute(id)` trong [`get-player-season-statistics.use-case.ts`](file:///d:/FullStack/Football/ScoutBoard/backend/src/modules/players/application/use-cases/get-player-season-statistics.use-case.ts)
- **Repository Method được gọi**:
  - `findSeasonStatisticsByPlayerId(id)`: Lấy các mùa giải của cầu thủ.

#### B. Câu lệnh SQL: Lấy các mùa của cầu thủ đang xét
```sql
SELECT 
    pss.id AS "pss_id",
    pss.player_id AS "pss_player_id",
    pss.season_id AS "pss_season_id",
{{ ... }}
    pss.passes_attempted AS "pss_passes_attempted",
    pss.passes_completed AS "pss_passes_completed",
    pss.key_passes AS "pss_key_passes",
    pss.tackles AS "pss_tackles",
    pss.interceptions AS "pss_interceptions",
    pss.yellow_cards AS "pss_yellow_cards",
    pss.red_cards AS "pss_red_cards",
    pss.duels_won AS "pss_duels_won",
    pss.saves AS "pss_saves",
    pss.goals_conceded AS "pss_goals_conceded",
    pss.clean_sheets AS "pss_clean_sheets",
    pss.penalties_saved AS "pss_penalties_saved",
    pss.penalties_faced AS "pss_penalties_faced",
    pss.save_percentage AS "pss_save_percentage",
    s.id AS "season_id",
    s.season_code AS "season_season_code",
    s.is_current AS "season_is_current",
    c.id AS "competition_id",
    c.name AS "competition_name",
    c.country AS "competition_country",
    t.id AS "team_id",
    t.name AS "team_name",
    t.short_name AS "team_short_name",
    t.logo_url AS "team_logo_url"
FROM "player_season_statistics" pss
LEFT JOIN "seasons" s ON s.id = pss.season_id
LEFT JOIN "competitions" c ON c.id = pss.competition_id
LEFT JOIN "teams" t ON t.id = pss.team_id
WHERE pss.player_id = $1
ORDER BY s.is_current DESC, s.season_code DESC;
```

---

### 2.3. API Lấy thống kê từng trận đấu (Recent Match Log)

- **Endpoint**: `GET /api/players/:id/match-statistics`
- **Controller**: `PlayersController.getMatchStatistics(@Param('id') id: string, @Query() query)`
- **Use Case**: `GetPlayerMatchStatisticsUseCase.execute(id, query)`

---

# 3. CƠ CHẾ PHÂN BIỆT GOALKEEPER VÀ CẦU THỦ SÂN

Toàn bộ hệ thống kiểm tra thuộc tính `primaryPosition === 'GK'`:

```text
                            primaryPosition === 'GK'
                                       │
                      ┌────────────────┴────────────────┐
                      ▼                                 ▼
               [THỦ MÔN - GK]                   [CẦU THỦ SÂN - OUTFIELD]
                      │                                 │
     • Saves, Goals Conceded, Clean Sheets,     • Goals, Assists, Shots, Passes,
       Save %, Penalties Saved, Distribution      Key Passes, Tackles, Duels Won
```

---

# 4. TOÀN BỘ CÔNG THỨC TOÁN HỌC TÍNH CÁC CHỈ SỐ METRICS

## 4.1. Công thức chuẩn hóa theo 90 phút (Per 90 Metrics)
Do số phút ra sân của mỗi cầu thủ khác nhau, toàn bộ hành động được quy đổi về tiêu chuẩn một trận đấu 90 phút:

$$\text{Per 90 Metric} = \frac{\text{Raw Count} \times 90}{\text{Minutes Played}}$$

- $\text{Saves / 90} = \frac{\text{saves} \times 90}{\text{minutesPlayed}}$
- $\text{Goals Conceded / 90} = \frac{\text{goalsConceded} \times 90}{\text{minutesPlayed}}$
- $\text{Goals / 90} = \frac{\text{goals} \times 90}{\text{minutesPlayed}}$
- $\text{Assists / 90} = \frac{\text{assists} \times 90}{\text{minutesPlayed}}$
- $\text{Passes / 90} = \frac{\text{passesAttempted} \times 90}{\text{minutesPlayed}}$
- $\text{Key Passes / 90} = \frac{\text{keyPasses} \times 90}{\text{minutesPlayed}}$
- $\text{Tackles / 90} = \frac{\text{tackles} \times 90}{\text{minutesPlayed}}$
- $\text{Interceptions / 90} = \frac{\text{interceptions} \times 90}{\text{minutesPlayed}}$
- $\text{Duels Won / 90} = \frac{\text{duelsWon} \times 90}{\text{minutesPlayed}}$

*(Nếu $\text{minutesPlayed} \le 0$, giá trị Per 90 trả về `null`).*

---

## 4.2. Công thức tính Tỷ lệ Chuyền bóng chính xác (Pass Accuracy)
$$\text{Pass Accuracy \%} = \left(\frac{\text{passesCompleted}}{\text{passesAttempted}}\right) \times 100$$

---

## 4.3. Công thức tính Tỉ lệ Giữ sạch lưới (Clean Sheet Percentage)
$$\text{Clean Sheet \%} = \left(\frac{\text{cleanSheets}}{\text{matchesPlayed}}\right) \times 100$$

