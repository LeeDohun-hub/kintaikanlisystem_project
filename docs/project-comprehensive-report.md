# kintai（근태 관리 시스템）프로젝트 종합 보고서

**작성 목적**: 저장소 전체(백엔드·프론트·DB 마이그레이션·문서·CI·테스트·부가 디렉터리)를 한 문서에서 조망할 수 있도록 정리합니다.  
**기준 시점**: 리포지토리 스냅샷 기준(코드 변경 시 본 문서 갱신 권장).  
**주의**: DB 접속 정보·메일 계정 등 **비밀값은 본 보고서에 적지 않습니다**. 운영 시 `application-local.properties` 등 로컬 전용 설정으로 분리하는 것을 권장합니다(`.gitignore`에 `backend/src/main/resources/application.properties` 무시 규칙이 있음).

---

## 1. 요약

| 항목 | 내용 |
|------|------|
| 시스템명 | kintai（勤怠）— 근태·사내 협업 웹 애플리케이션 |
| 성격 | 교육·실무형 프로토타입(트레이닝 시스템) |
| 아키텍처 | **SPA(React + Vite)** ↔ **REST API(Spring Boot 3)** ↔ **MySQL** |
| 인증 | HTTP **세션**, 역할 `ADMIN` / `EMPLOYEE` |
| UI/API 문구 | 주로 **일본어** |
| 저장소 루트 구성 | `backend/`, `frontend/`, `docs/`, `sql/`, `.github/`, `tmp_bcrypt/`(부가) |

---

## 2. 디렉터리·산출물 전체 맵

| 경로 | 설명 |
|------|------|
| `backend/` | Spring Boot 애플리케이션(Java 17, Gradle) |
| `frontend/` | React 18 SPA(Vite 5, npm) |
| `docs/` | 시스템 설계 개요, 회의·설계 메모, 트레이닝용 Word/PPT, 스크린샷, 샘플 CSV/XLSX 등 |
| `sql/` | 수동 DDL 참고(`schema.sql`), 시드 스크립트, ER 도구용 JSON, `alter-*.sql` |
| `.github/workflows/tests.yml` | Push/PR 시 백엔드 JUnit + 프론트 Vitest |
| `README.md` | 진입점(다국어 README 링크) |
| `README_kr.md` / `README_jp.md` | 기능·실행 방법(한국어/일본어) |
| `tmp_bcrypt/` | bcryptjs 관련 **로컬 실험용** Node 산출물로 보임(본 시스템 핵심 경로 아님) |

---

## 3. 기술 스택

### 3.1 백엔드

| 영역 | 기술 |
|------|------|
| 런타임 | Java 17 |
| 프레임워크 | Spring Boot **3.2.3** |
| 웹 | Spring Web MVC, `jakarta.*` |
| 영속성 | Spring Data JPA, Hibernate, **Flyway** |
| DB 드라이버 | MySQL Connector/J |
| 검증 | `spring-boot-starter-validation` |
| 보조 암호화 | `spring-security-crypto`(비밀번호 해시 등) |
| 메일 | `spring-boot-starter-mail` |
| CSV | Apache Commons CSV 1.10.0 |
| Excel | Apache POI 5.2.5 (`poi-ooxml`) — 근태 가져오기 등 |
| PDF | OpenPDF 1.3.39 — 월간 리포트 PDF |
| 빌드 | Gradle(Wrapper 포함) |
| 테스트 | JUnit 5, Spring Boot Test, **H2**(테스트 프로파일) |

### 3.2 프론트엔드

| 영역 | 기술 |
|------|------|
| UI 라이브러리 | React **18.2** |
| 빌드·개발 서버 | **Vite 5**, `@vitejs/plugin-react` |
| 라우팅 | `react-router-dom` **6.20** |
| HTTP | `axios` 1.6(`withCredentials: true` — 세션 쿠키) |
| 차트 | `chart.js` + `react-chartjs-2` |
| Excel(클라이언트) | `xlsx` 0.18.5 |
| 코드 품질 | Prettier 3 |
| 테스트 | Vitest 1.6, Testing Library, jsdom |

### 3.3 인프라·연동

- **로컬**: 백엔드 `8080`, 프론트 `5173`, Vite 프록시로 `/api` → `http://localhost:8080`
- **CORS**: `WebConfig`에서 `/api/**`에 대해 `http://localhost:3000`, `http://localhost:5173` 패턴, `allowCredentials(true)`

---

## 4. 백엔드 상세

### 4.1 애플리케이션 진입점

- `com.kintai.KintaiApplication` — Spring Boot 메인 클래스

### 4.2 패키지 구조(역할)

| 패키지/영역 | 역할 |
|-------------|------|
| `controller` | REST 엔드포인트 |
| `service` | 비즈니스 로직 |
| `repository` | Spring Data JPA 리포지토리 |
| `entity` | JPA 엔티티 |
| `dto` | 요청/응답 DTO, `dto/mapper` |
| `config` | WebMvc, 인터셉터, 비밀번호 인코더, 프로퍼티 바인딩 |
| `auth` | `@AdminOnly`, 로그인 거절 예외·코드 |
| `session` | 세션에서 로그인 사용자 조회 등 |
| `exception` | `@RestControllerAdvice` 전역 예외 처리 |
| `web` | 공통 HTTP 응답 헬퍼 |
| `util` | 근무 시간 포맷 등 |
| `pdf` | PDF 폰트 지원 등 |

### 4.3 REST 컨트롤러·엔드포인트 일람

컨트롤러 클래스는 **13개**(`@RestController` 12 + `@RestControllerAdvice` 1).

**베이스 경로가 `/api/auth` — `AuthController`**

| 메서드 | 경로 | 설명(개념) |
|--------|------|------------|
| POST | `/api/auth/login` | 로그인 |
| POST | `/api/auth/logout` | 로그아웃 |
| GET | `/api/auth/me` | 현재 세션 사용자(인터셉터 제외 경로) |

**`/api/worktime` 및 `/api/work-time`(별칭) — `WorkTimeController`**

| 메서드 | 경로 | 설명(개념) |
|--------|------|------------|
| GET | `/api/worktime` | 월별 등 조회(쿼리 파라미터) |
| POST | `/api/worktime` | 단건 생성 |
| POST | `/api/worktime/bulk` | 월간 일괄 저장 |
| PUT | `/api/worktime/{id}` | 수정 |
| DELETE | `/api/worktime/{id}` | 삭제 |
| POST | `/api/worktime/import-kintaihyo` | 근무표 Excel 가져오기(관리) |
| POST | `/api/worktime/send-monthly-report` | 월간 레포트 메일 등 |

**`/api/employees` — `EmployeeController` + `PhotoController`(동일 베이스로 사진 API)**

| 메서드 | 경로 | 설명(개념) |
|--------|------|------------|
| GET | `/api/employees` | 직원 목록(마스터) |
| POST | `/api/employees` | 직원 등록 |
| PUT | `/api/employees/{employeeId}` | 수정 |
| PATCH | `/api/employees/{employeeId}/invite-email` | 초대 메일 주소 갱신 |
| POST | `/api/employees/{employeeId}/invite-email/send` | 초대 메일 발송 |
| POST | `/api/employees/batch-delete` | 일괄 삭제 |
| POST | `/api/employees/{id}/photo` | 사진 업로드(multipart) |
| GET | `/api/employees/{id}/photo` | 사진 조회 |

**`/api/users` — `UserController`**

| 메서드 | 경로 | 설명(개념) |
|--------|------|------------|
| GET | `/api/users` | 활성 직원 요약 목록(메신저 상대 선택 등, 관리자 전용 아님) |

**`/api/board` — `BoardController`**

| 메서드 | 경로 | 설명(개념) |
|--------|------|------------|
| GET | `/api/board` | 글 목록 |
| POST | `/api/board` | 글 작성 |
| GET | `/api/board/{postId}` | 글 상세 |
| PUT | `/api/board/{postId}` | 글 수정 |
| DELETE | `/api/board/{postId}` | 글 삭제 |
| POST | `/api/board/{postId}/comments` | 댓글 작성 |
| DELETE | `/api/board/{postId}/comments/{commentId}` | 댓글 삭제 |

**`/api/messenger` — `MessengerController`**

| 메서드 | 경로 | 설명(개념) |
|--------|------|------------|
| GET | `/api/messenger/conversations` | 대화 목록 |
| GET | `/api/messenger/conversation/{partnerId}` | 상대와의 메시지 |
| POST | `/api/messenger/send` | 전송 |
| DELETE | `/api/messenger/conversation/{partnerId}` | (구현 의미는 코드 참조) |
| POST | `/api/messenger/conversation/{partnerId}/delete` | 대화 나가기/숨김 등 |
| GET | `/api/messenger/unread-count` | 미읽음 수 |

**`/api/vacations` — `VacationController`**

| 메서드 | 경로 | 설명(개념) |
|--------|------|------------|
| GET | `/api/vacations/my` | 본인 신청 목록 |
| POST | `/api/vacations` | 신청 |
| DELETE | `/api/vacations/{requestId}` | 취소 |
| GET | `/api/vacations` | 관리자 목록(상태 필터 등) |
| PUT | `/api/vacations/{requestId}/approve` | 승인 |
| PUT | `/api/vacations/{requestId}/reject` | 거절 |

**`/api/attendance` — `AttendanceController`**

| 메서드 | 경로 | 설명(개념) |
|--------|------|------------|
| POST | `/api/attendance/import` | 근태 데이터 가져오기 |
| GET | `/api/attendance/summary` | 요약 |

**`/api/statistics` — `StatisticsController`**

| 메서드 | 경로 | 설명(개념) |
|--------|------|------------|
| GET | `/api/statistics/monthly` | 월별 통계 |

**`/api/reports` — `ReportController`**

| 메서드 | 경로 | 설명(개념) |
|--------|------|------------|
| GET | `/api/reports/{filename}.pdf` | 월간 PDF 등(쿼리: `month`, `employeeId` 등) |

**`/api/admin/login-attempts` — `LoginAttemptController`**

| 메서드 | 경로 | 설명(개념) |
|--------|------|------------|
| GET | `/api/admin/login-attempts` | 로그인 시도 이력 조회 |
| DELETE | `/api/admin/login-attempts` | 삭제(정책은 코드 참조) |
| DELETE | `/api/admin/login-attempts/batch` | 일괄 삭제 |

**전역 — `ApiExceptionHandler`**

- `@RestControllerAdvice` — API 예외 공통 응답

> 세부 권한(직원만/관리자만)은 각 핸들러의 `@AdminOnly`, 서비스 레벨 검증, 세션의 사용자 ID와 리소스 소유 관계 등으로 이중화되어 있습니다. 정본은 소스입니다.

### 4.4 서비스 클래스(11개)

| 클래스 | 책임(개요) |
|--------|------------|
| `AuthService` | 인증·세션 |
| `WorkTimeService` | 근무 시간 CRUD·월별·중복 검사 등 |
| `EmployeeMasterService` | 직원 마스터 |
| `EmployeeInviteEmailService` | 초대 메일 |
| `AttendanceImportService` | 근태 CSV/Excel 가져오기 |
| `AttendanceReportEmailService` | 월간 레포트 메일 |
| `BoardService` | 게시판 |
| `MessengerService` | 1:1 메신저·나가기 |
| `VacationService` | 휴가 신청·승인 흐름 |
| `LoginAttemptService` | 로그인 시도 기록 |
| `StatisticsService` | 통계 집계 |

### 4.5 리포지토리(10개)

`EmployeeRepository`, `EmployeeAccountRepository`, `WorkTimeRepository`, `BoardPostRepository`, `BoardCommentRepository`, `MessageRepository`, `ConversationLeaveRepository`, `VacationRequestRepository`, `LoginAttemptRepository`, `BatchImportHistoryRepository`

### 4.6 엔티티(14개)

`Employee`, `EmployeeAccount`, `WorkTime`, `BoardPost`, `BoardComment`, `Message`, `ConversationLeave`, `ConversationLeaveId`, `VacationRequest`, `VacationStatus`, `VacationType`, `LoginAttempt`, `BatchImportHistory`, `Role`

### 4.7 DTO·기타 소스

- **DTO Java 파일**: `dto` 패키지에 **28개**(요청/응답·매퍼 포함).
- **유틸/ PDF**: `WorkTimeFormatUtil`, `PdfFontSupport` 등.

### 4.8 보안·웹 설정

| 구성 요소 | 역할 |
|-----------|------|
| `AuthInterceptor` | `/api/**` 중 예외 경로 외 **미인증 → 401** |
| `AdminOnlyInterceptor` | `@AdminOnly` 핸들러 **ADMIN 아님 → 403** |
| `PasswordConfig` | 비밀번호 인코더 빈 |
| `AppInviteProperties` | 초대 메일용 공개 URL 등 바인딩 |
| `WebConfig` | CORS, 인터셉터 등록 |

인터셉터 **제외 경로**: `AuthInterceptor` 기준 `/api/auth/login`, `/api/auth/logout`, `/api/auth/me`.  
`GET /me`는 인터셉터를 타지 않지만, 컨트롤러에서 세션에 `loginUser`가 없으면 **401**을 반환합니다(프론트 `AuthContext` 초기 로딩에 사용).

### 4.9 설정 프로파일

| 파일 | 용도 |
|------|------|
| `application.properties` | 기본(저장소에는 gitignore 의도, 로컬 생성) |
| `application-dev.sql` 관련 | `application-dev.properties`에서 Flyway 위치에 `classpath:db/migration-dev` 추가, SQL 로그·에러 상세 노출 |
| `application-prod.properties` | SQL 로그 off, 에러 본문 최소화 |
| `application-test.properties` | 테스트용 |
| `spring.config.import` | optional `application-local.properties` |

### 4.10 DB 마이그레이션(Flyway)

**공통 `db/migration/`**

| 파일 | 내용(파일명 기준) |
|------|-------------------|
| `V1__baseline.sql` | 초기 스키마 |
| `V3__employee_account_login_id.sql` | 계정 로그인 ID |
| `V4__seed_admin001_password.sql` | 개발 시드(관리자 등) |
| `V5__login_attempt.sql` | 로그인 시도 테이블 |
| `V6__employee_invite_email.sql` | 초대 메일 필드 |
| `V7__employee_photo.sql` | 직원 사진 |
| `V8__board.sql` | 게시판 |
| `V9__message.sql` | 메신저 메시지 |
| `V10__vacation.sql` | 휴가 |
| `V11__messenger_conversation_leave.sql` | 대화 나가기 |

**개발 전용 `db/migration-dev/`**

- `V2__dev_seed.sql` — `dev` 프로파일에서만 추가 적용

기타: `db/init-schema.sql` — 참고용 초기 스키마 스크립트

### 4.11 백엔드 테스트

| 파일 | 내용 |
|------|------|
| `WorkTimeServiceTest.java` | 근무 시간 서비스(동일 근무일 중복 등) |
| `AttendanceImportServiceCsvTest.java` | 근태 CSV 가져오기 |
| `application-test.properties` | H2 등 테스트 설정 |

---

## 5. 프론트엔드 상세

### 5.1 진입·라우팅

- `main.jsx` — React DOM 마운트
- `App.jsx` — `BrowserRouter`, `AuthProvider`, `Routes`
  - `PrivateRoute` — 미로그인 시 `/login`, `adminOnly` 시 역할 검사
  - `MenuRoute`, `WorkInputRoute` — 관리자/직원 분기(대표 요청 반영)
- 중첩 라우트: 공통 `Layout` 하위에 업무 화면

### 5.2 라우트(경로) 전체

| 경로 | 페이지 컴포넌트 | 접근 |
|------|------------------|------|
| `/login` | `Login.jsx` | 비로그인 |
| `/` | 역할별 기본 경로로 리다이렉트 | — |
| `/menu` | `MainMenu.jsx` | ADMIN |
| `/work-input` | `WorkInput.jsx` | EMPLOYEE(ADMIN은 `/menu`로 유도) |
| `/work-history` | `WorkHistory.jsx` | 로그인 |
| `/upload` | `Upload.jsx` | ADMIN |
| `/report` | `ReportOutput.jsx` | ADMIN |
| `/dashboard` | `Dashboard.jsx` | ADMIN |
| `/work-view` | `WorkView.jsx` | ADMIN |
| `/statistics` | `Statistics.jsx` | ADMIN |
| `/employees` | `EmployeeMaster.jsx` | ADMIN |
| `/login-check` | `LoginCheck.jsx` | ADMIN |
| `/attendance-import` | `AttendanceImport.jsx` | ADMIN |
| `/board` | `Board.jsx` | 로그인 |
| `/board/:postId` | `BoardDetail.jsx` | 로그인 |
| `/messenger` | `Messenger.jsx` | 로그인 |
| `/vacation` | `VacationRequest.jsx` | 로그인 |
| `/vacation-manage` | `VacationAdmin.jsx` | ADMIN |

공통 레이아웃: `Layout.jsx` + `Layout.css`

### 5.3 컴포넌트(`components/`)

| 파일 | 역할(개요) |
|------|------------|
| `AttendanceImportCard.jsx` | 근태 가져오기 카드 |
| `BackToMenuLink.jsx` | 메뉴 복귀 링크 |
| `EmployeePicker.jsx` | 직원 선택 |
| `EmployeeWorkMinutesTable.jsx` | 근무 분 테이블 |
| `KintaihyoImportCard.jsx` | 근무표 Excel 가져오기 |
| `LoadingSpinner.jsx` | 로딩 |
| `MonthPickerCard.jsx` | 년월 선택 |

### 5.4 페이지(`pages/`)

- 루트: `Login`, `MainMenu`, `Board`, `BoardDetail`, `Messenger`, `Upload`, `ReportOutput`
- `pages/employee/`: `WorkInput`, `WorkHistory`, `VacationRequest`
- `pages/admin/`: `Dashboard`, `WorkView`, `Statistics`, `EmployeeMaster`, `LoginCheck`, `AttendanceImport`, `VacationAdmin`

### 5.5 상태·API·훅·유틸

| 경로 | 설명 |
|------|------|
| `context/AuthContext.jsx` | 세션 기반 사용자, `login`/`logout`, 마운트 시 `/auth/me` |
| `api/api.js` | Axios 인스턴스, `withCredentials`, 401 시 리다이렉트(일부 URL 제외) |
| `api/worktime.js` | 근태 API 래퍼 |
| `api/attendance.js` | 근태 가져오기 API |
| `api/error.js` | 에러 처리 보조 |
| `hooks/useEmployees.js` | 직원 목록 로딩 |
| `hooks/useWorkTimeByMonth.js` | 월별 근무 데이터 |
| `hooks/useYearMonthState.js` | 년월 상태 |
| `utils/timeFormat.js` | 시간 포맷(+ `timeFormat.test.js`) |
| `utils/formatWorkMinutes.js` | 근무 분 표시 |
| `setupTests.js` | Vitest 설정 |

### 5.6 스타일

- `index.css`, `Login.css`, `Layout.css`

### 5.7 기타 프론트 파일

- `index.html` — Vite HTML 엔트리
- `vite.config.js` — 포트 5173, `/api` 프록시
- `package.json` / `package-lock.json` — 의존성·스크립트
- `.prettierignore` — 포맷 제외

---

## 6. SQL·데이터(저장소 루트 `sql/`)

| 파일 | 용도 |
|------|------|
| `schema.sql` | 수동 적용용 DDL·시드 예시 |
| `schema.vuerd.json` | ER 도구(Vuerd) 데이터 |
| `seed_dev_default_accounts_manual.sql` | 개발 계정 수동 시드 |
| `alter-work_time-add-remarks.sql` | `work_time` 비고 컬럼 추가 등 이력성 ALTER |

---

## 7. 문서(`docs/`)

### 7.1 마크다운(코드와 함께 버전관리하기 쉬운 문서)

| 파일 | 내용 |
|------|------|
| `system-design-overview.md` | 아키텍처·인증·역할·API 그룹·ER 개요(Mermaid) |
| `DebugReport.md` | 디버그 메모 |
| `데이터_설계.md` | 데이터 설계 메모 |
| `인터페이스_설계.md` | 인터페이스 설계 메모 |
| `모듈_설계.md` | 모듈 설계 메모 |
| `会議資料_DBとアプリ設計.md` | 회의 자료 |

### 7.2 바이너리·오피스 산출물(목록)

- **이미지**: `smtlogo.png`, `kintaikanli-main.png`, `kintaikanli-account.png`, `erdpng 파일.png`, `Blank diagram.png`, 다수 `スクリーンショット*.png`
- **Word/PPT**: `00.メニュー.docx`, `데이터베이스 설계 및 화면 설계.docx`, `Web-kintai (1).pptx`
- **`docs/トレーニングシステム/`**: 요건·기본/상세 설계·테이블定義·テスト仕様·運用·WBS·EXCEL·総合版 등 **다수 .docx** 및 `~$` 임시 파일(Office 잠금 파일)
- **샘플 데이터**: `202604_勤務表(李到勳) .csv`, `202604_勤務表(李到勳) .xlsx`, 스케줄표 xlsx 등

---

## 8. CI/CD

- **GitHub Actions** `Tests` 워크플로
  - **backend-test**: Ubuntu, Temurin 17, `./gradlew test`, 실패 여부와 무관하게 JUnit XML 아티팩트 `junit-backend`
  - **frontend-test**: Node 20, `npm ci`, `npm test`
- 트리거: `push`, `pull_request`, `workflow_dispatch`
- 동시 실행: 동일 workflow/ref 그룹에서 `cancel-in-progress: true`

---

## 9. 의존성·빌드 스크립트 요약

### 9.1 백엔드(Gradle)

- `compileJava`, `test`, `bootRun` 등 표준 Spring Boot 태스크

### 9.2 프론트(npm)

| 스크립트 | 명령 |
|----------|------|
| `dev` | `vite` |
| `build` | `vite build` |
| `preview` | `vite preview` |
| `test` / `test:watch` | Vitest |
| `format` / `format:check` | Prettier |

---

## 10. 비기능·운영 관점 체크리스트

| 항목 | 상태/메모 |
|------|-----------|
| 세션 타임아웃 | `server.servlet.session.timeout` 설정(예: 3600s) |
| 업로드 한도 | 멀티파트 최대 크기 설정(예: 10MB) |
| 사진 저장 경로 | `app.photo.upload-dir` 상대 경로 |
| 프로덕션 오류 노출 | `application-prod`에서 메시지/스택 제한 |
| CORS | 개발 호스트 한정; 배포 시 실제 오리진으로 변경 필요 |
| OpenAPI | 자동 문서 미기재(향후 Swagger 도입 여지) |

---

## 11. `tmp_bcrypt/` 디렉터리

- `bcryptjs`가 포함된 **로컬 검증용** Node 작업 폴더로 보이며, kintai 앱의 필수 구성 요소는 아닙니다.
- 배포 대상에서 제외하고, 저장소 정리 시 삭제 또는 `.gitignore` 검토 대상으로 두는 것이 좋습니다.

---

## 12. 부록: 백엔드 Java 소스 파일 수

- `backend/src/main/java` 이하: **89**개의 `.java` 파일(컨트롤러·서비스 등 합계)

---

## 13. 참고 문서(저장소 내)

- `README_kr.md` — 한국어 기능·실행·테스트·요건 부록
- `README_jp.md` — 일본어版
- `docs/system-design-overview.md` — 설계 개요(Mermaid)

---

*본 보고서는 에이전트가 저장소 파일 목록과 주요 설정을 읽어 자동으로 정리한 것입니다. 엔드포인트의 정확한 권한·요청 본문 필드는 각 Controller/DTO 및 서비스 구현을 정본으로 하시기 바랍니다.*

