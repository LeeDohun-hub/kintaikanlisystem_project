# kintai — 勤怠管理 / 근태 관리

- **한국어:** [README_kr.md](README_kr.md)
- **日本語:** [README_jp.md](README_jp.md)
- **시스템 설계도** [system-design-overview.md](system-design-overview.md)
- **기본설계서:** [基本設計書.md](docs/基本設計書.md)
- **상세설계서** [詳細設計書.md](docs/詳細設計書.md)
## What’s implemented (high level)

- **Auth**: session-based login (`/api/auth/*`), role `ADMIN` / `EMPLOYEE`
- **Work time**: create/update/list monthly work logs (`/api/worktime`)
- **Admin tools**: employee master, login attempts, import, reports/statistics
- **Board**: posts + comments (`/api/board`)
- **Messenger**: 1:1 conversations (`/api/messenger`)
  - Unread badge: `GET /api/messenger/unread-count` (shown in menu)
- **Vacation**: submit/cancel (employee), approve/reject (admin) (`/api/vacations`)
- **Employee photo**: admin upload + authenticated fetch (`/api/employees/{id}/photo`)

## Recent changes

- **WorkTime outings (multiple segments)**: outings can be recorded multiple times within the same work day.
  - Outing segments are stored in `work_time_outing` (Flyway: `V18__work_time_outing_segments.sql`).
  - The old “outing > 2 hours => treat as clock-out” restriction is removed.
- **Monthly metrics warnings**: the monthly metrics panel can show warning messages when overtime/holiday work exceeds thresholds.

## Tests / テスト / 테스트

`push` 및 `pull_request` 시 [GitHub Actions](.github/workflows/tests.yml)에서 백엔드 `gradlew test`·프론트 `npm test`를 실행합니다. 성공 시 Actions 탭에 녹색 체크, 백엔드는 JUnit XML이 아티팩트로 남습니다.
