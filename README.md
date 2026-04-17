# kintai — 勤怠管理 / 근태 관리

- **한국어:** [README_kr.md](README_kr.md)
- **日本語:** [README_jp.md](README_jp.md)

## What’s implemented (high level)

- **Auth**: session-based login (`/api/auth/*`), role `ADMIN` / `EMPLOYEE`
- **Work time**: create/update/list monthly work logs (`/api/worktime`)
- **Admin tools**: employee master, login attempts, import, reports/statistics
- **Board**: posts + comments (`/api/board`)
- **Messenger**: 1:1 conversations (`/api/messenger`)
- **Vacation**: submit/cancel (employee), approve/reject (admin) (`/api/vacations`)
- **Employee photo**: admin upload + authenticated fetch (`/api/employees/{id}/photo`)

## Tests / テスト / 테스트

`push` 및 `pull_request` 시 [GitHub Actions](.github/workflows/tests.yml)에서 백엔드 `gradlew test`·프론트 `npm test`를 실행합니다. 성공 시 Actions 탭에 녹색 체크, 백엔드는 JUnit XML이 아티팩트로 남습니다.
