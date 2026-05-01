# kintai — 勤怠管理 / 근태 관리

- **한국어:** [README_kr.md](README_kr.md)
- **日本語:** [README_jp.md](README_jp.md)
- **시스템 설계:** [system-design-overview.md](system-design-overview.md)

## What’s implemented (high level)

- **Auth**: session-based login (`/api/auth/*`), optional **TOTP (2FA)** (`/api/auth/totp/*`), roles `ADMIN` / `EMPLOYEE`
- **Work time**: create/update/list monthly work logs (`/api/worktime`), monthly **metrics** (`GET /api/worktime/metrics`)
- **Admin tools**: employee master, login attempts, **attendance import/summary** (`/api/attendance/*`), **monthly statistics** (`/api/statistics/monthly`), **attendance metrics** (`/api/admin/attendance-metrics`), reports, dashboard
- **Board**: posts + comments + pin (`/api/board`, `/api/board/posts/{postId}`)
- **Messenger**: 1:1 conversations (`/api/messenger`), delete conversation endpoints
  - Unread badge: `GET /api/messenger/unread-count` (menu / UI)
- **Vacation**: submit/cancel (employee), approve/reject (admin) (`/api/vacations`), **leave balance** (`GET /api/vacations/balance`, admin: `.../balance/admin`), attachments
- **Employee photo**: admin upload for `{id}`, self `POST/DELETE /api/employees/me/photo`, authenticated `GET .../photo`
- **Profile**: `GET` / `PATCH /api/employees/me/profile` (logged-in user)
- **Users**: `GET /api/users` (messenger recipient list, etc.)

## Frontend routes (quick reference)

See [README_kr.md](README_kr.md) or [README_jp.md](README_jp.md) for the full list. Notes:

- After login, **`/menu`** is the default for both roles.
- Board detail canonical path: **`/board/post/:postId`**; legacy **`/board/:postId`** redirects when the segment is numeric.
- **`ADMIN`** users hitting **`/work-input`** are redirected to **`/menu`** (work input is for employees only).

## Recent changes

- **WorkTime outings (multiple segments)**: outings can be recorded multiple times within the same work day.
  - Outing segments are stored in `work_time_outing` (Flyway: `V18__work_time_outing_segments.sql`).
  - The old “outing > 2 hours => treat as clock-out” restriction is removed.
- **Messenger unread count**: badge in the menu using `GET /api/messenger/unread-count`.
- **Monthly metrics warnings**: the monthly metrics panel can show warning messages when overtime/holiday work exceeds thresholds.

## Tests / CI

On **push** and **pull_request**, [GitHub Actions](.github/workflows/tests.yml) runs backend `gradlew test` and frontend `npm test`. JUnit XML for the backend is uploaded as a workflow artifact (`junit-backend`).

Example backend tests: `WorkTimeServiceTest`, `LeaveBalanceServiceTest`, `AttendanceImportServiceCsvTest`, `TotpServiceVerifyTest`, `TotpPendingSetupStoreTest`, `AttendanceMetricsCalculatorTest` under `backend/src/test/java/com/kintai/`. Frontend: `frontend/src/utils/timeFormat.test.js`.

**Local**

```powershell
Set-Location backend; .\gradlew.bat test
Set-Location frontend; npm test
```

(Mac / Linux: `cd backend && ./gradlew test`, `cd frontend && npm test`.)
