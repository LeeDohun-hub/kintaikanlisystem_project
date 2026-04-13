# kintai — 勤怠管理 / 근태 관리

- **한국어:** [README_kr.md](README_kr.md)
- **日本語:** [README_jp.md](README_jp.md)

## Tests / テスト / 테스트

`push` 및 `pull_request` 시 [GitHub Actions](.github/workflows/tests.yml)에서 백엔드 `gradlew test`·프론트 `npm test`를 실행합니다. 성공 시 Actions 탭에 녹색 체크, 백엔드는 JUnit XML이 아티팩트로 남습니다.
