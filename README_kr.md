# 근태 관리 시스템（kintai）

Java / Spring Boot 백엔드와 React（Vite）프론트로 구성된 근태 관리 웹 애플리케이션입니다.

---

## 현재 구현된 기능 (요약)

### 권한/인증

- **세션 기반 로그인**: 로그인 성공 시 세션에 사용자 정보 저장
- **역할(Role)**: `ADMIN` / `EMPLOYEE`
  - `ADMIN`: 관리자 메뉴/기능 접근
  - `EMPLOYEE`: 본인 근태/휴가/게시판/메신저 등

### 프론트 화면(라우트)

`frontend/src/App.jsx` 기준:

- **공통**
  - `/login`: 로그인
  - `/board`, `/board/:postId`: 게시판 목록/상세(댓글 포함)
  - `/messenger`: 사내 메신저
  - `/vacation`: 휴가 신청/내 신청 목록
- **직원(EMPLOYEE)**
  - `/work-input`: 근태 입력
  - `/work-history`: 근무 이력 조회
- **관리자(ADMIN)**
  - `/menu`: 메인 메뉴
  - `/employees`: 직원 마스터
  - `/login-check`: 로그인 시도 이력
  - `/upload`: Excel 업로드(근태/근무표 일괄 가져오기)
  - `/attendance-import`: 근태 가져오기(관리자 화면)
  - `/report`: 근태 리포트/월별 PDF 프리뷰
  - `/dashboard`: 대시보드
  - `/work-view`: 근무 조회(관리자)
  - `/statistics`: 통계
  - `/vacation-manage`: 휴가 승인/관리(관리자)

### 백엔드 API(주요 엔드포인트)

컨트롤러 기준(대표):

- **인증**: `POST /api/auth/login`, `POST /api/auth/logout`, `GET /api/auth/me`
- **근태(WorkTime)**:
  - `GET /api/worktime?month=YYYY-MM[&employeeId=...]` (관리자는 직원 지정 가능)
  - `POST /api/worktime`, `PUT /api/worktime/{id}`, `DELETE /api/worktime/{id}`
  - `POST /api/worktime/bulk` (월간 일괄 저장)
  - `POST /api/worktime/import-kintaihyo` (관리자 전용, 근무표 Excel)
  - `POST /api/worktime/send-monthly-report` (직원 실행 → 관리자에게 월간 레포트 이메일)
- **직원 마스터(관리자)**: `/api/employees/*`
  - 직원 CRUD, 초대 이메일 저장/발송, 일괄 삭제 등
- **사진(직원 프로필)**:
  - `POST /api/employees/{id}/photo` (관리자 업로드)
  - `GET /api/employees/{id}/photo` (로그인 사용자면 조회 가능)
- **게시판**: `GET/POST /api/board`, `GET/PUT/DELETE /api/board/{postId}`, 댓글 `POST/DELETE /api/board/{postId}/comments/*`
- **메신저**: `GET /api/messenger/conversations`, `GET /api/messenger/conversation/{partnerId}`, `POST /api/messenger/send`, `GET /api/messenger/unread-count`
- **휴가**: `/api/vacations/*`
  - 직원: `GET /api/vacations/my`, `POST /api/vacations`, `DELETE /api/vacations/{requestId}`
  - 관리자: `GET /api/vacations?status=...`, `PUT /api/vacations/{requestId}/approve`, `PUT /api/vacations/{requestId}/reject`

## 로컬에서 실행하는 방법

### 사전 준비

- **Java 17**（JDK）
- **MySQL** — 데이터베이스 `kintai_db`（연결 정보는 `backend/src/main/resources/application.properties` 참고）
- Windows PowerShell에서는 명령을 이을 때 `;` 를 사용하세요（`&&` 는 버전에 따라 동작하지 않을 수 있습니다）.

### 백엔드（Spring Boot, 기본 포트 8080）

`backend/` 폴더에서:

```powershell
.\gradlew.bat bootRun
```

（Mac / Linux: `./gradlew bootRun`）

- DB URL, 사용자명, 비밀번호는 **`application.properties`** 에 있습니다.
- 덮어쓰기만 하려면 **gitignore 대상인 `application-local.properties`** 를 두면 `spring.config.import` 로 읽힙니다. 예시는 `application-local.example.properties` 를 참고하세요.

**개발 프로파일（`dev`）** — 상세 오류, SQL 로그, Flyway 에 `db/migration-dev`（개발용 시드 등）를 포함할 때:

```powershell
$env:SPRING_PROFILES_ACTIVE="dev"
.\gradlew.bat bootRun
```

**운영용 프로파일（`prod`）** — SQL 로그 끔, 클라이언트에 오류 본문을 내리지 않는 설정은 `application-prod.properties` 를 참고하세요.

### 프론트엔드（Vite, 기본 포트 5173）

`frontend/` 폴더에서:

```powershell
npm install
npm run dev
```

브라우저에서 `http://localhost:5173` 접속.

### 백엔드 빌드（Gradle）

- 컴파일（Windows）: `backend\gradlew.bat compileJava`
- 컴파일（Mac / Linux）: `./gradlew compileJava`
- 실행: `gradlew.bat bootRun` 또는 `./gradlew bootRun`

### 테스트（단위·통합 흔적）

**로컬**

```powershell
Set-Location backend; .\gradlew.bat test
```

```powershell
Set-Location frontend; npm test
```

（Mac / Linux: `cd backend && ./gradlew test`, `cd frontend && npm test`）

**CI:** GitHub에 푸시하면 [`.github/workflows/tests.yml`](.github/workflows/tests.yml)이 백엔드 JUnit（`@SpringBootTest` 등）과 프론트 Vitest를 실행합니다. Actions 탭에서 실행 이력·로그를 확인하고, 백엔드 빌드의 **JUnit XML**은 워크플로 아티팩트（`junit-backend`）로 남습니다.

현재 테스트 범위（예）:

| 영역 | 파일 |
|------|------|
| 백엔드 | `backend/src/test/java/.../WorkTimeServiceTest.java`（동일勤務日 중복 등） |
| 프론트 | `frontend/src/utils/timeFormat.test.js` |

---

## 저장소 구성（요약）

| 경로 | 내용 |
|------|------|
| `backend/` | Spring Boot API |
| `frontend/` | React SPA |
| `sql/schema.sql` | 수동 적용용 DDL·시드 예시 |
| `docs/` | 설계·디버그 메모 등 |

---

## 1. 트레이닝용 시스템 개요

### 1.1 목적

신입 사원이 실무에 가까운 업무 시스템을 설계·구현·운용하면서, Java 기반 업무 시스템 개발을 기초부터 응용까지 익히는 것을 목표로 합니다. 대상 시스템은 현장에서 근무하는 직원의 근무표（근태）를 관리하는 시스템입니다.

### 1.2 시나리오（업무 개요）

**사용자 구분**

- **직원** — PC / 모바일 / Excel 등으로 근무 정보 입력
- **관리자** — 월별 근무 현황 집계, 가동률·매출·손익·캐시플로우 파악

**업무 흐름（개념）**

- 직원이 출퇴근, 휴식, 업무 내용 입력
- 데이터가 서버에 저장
- 관리자가 월별 / 직원별 / 프로젝트별로 집계 확인

### 1.3 시스템 구성（개념）

- **백엔드:** Java, Spring / Spring Boot, Tomcat
- **프론트엔드:** JavaScript, React
- **DB:** MySQL
- **API:** REST（JSON）, 인증은 세션（추후 JWT 등 검토 가능）

### 1.4 기능 개요（개념）

**직원**

- 근무 입력, 근무일, 시작/종료 시각, 휴식, 구분, 코멘트
- 본인 월별 근무 이력·총 근무 시간 확인

**관리자**

- 전체 직원 목록, 일·월·직원별 검색
- 집계·분석, 매출/손익, 캐시플로우（요건에 따라 확장）

### 1.5 화면 구성（개념）

- **직원:** 로그인, 근무 입력, 근무 이력
- **관리자:** 대시보드, 근무 조회, 통계, Excel 가져오기 등

---

## 2. 요건 정의서 기반 요약

- **목적:** 근태·가동·손익 관리 요구사항을 문서화하여 설계·구현의 기준으로 삼는다.
- **대상 독자:** 신입 개발자, 강사·리뷰어, 개발 리더.
- **비기능（예）:** 동시 사용자 규모, 응답 시간, 비밀번호 해시, 운영·로그 방침.
- **산출물（예）:** 요구사항 정의서, 설계서, 소스, 매뉴얼.

---

## 언어 안내

화면 문구·API 메시지 등은 주로 **일본어** 로 통일되어 있습니다. 일본어판 설명은 **`README_jp.md`** 를 참고하세요.

---

## 최근 변경사항（하이라이트）

### 외출(外出) 입력 규칙 변경

- **동일 근무일에 여러 번 저장하여 외출 구간을 누적 기록**할 수 있습니다. (근무시간 이내)
- 외출 구간은 DB의 `work_time_outing` 테이블에 저장됩니다. (Flyway: `V18__work_time_outing_segments.sql`)
- 기존의 **“외출 2시간 초과 시 퇴근扱い(종료시간=복귀시간)” 규칙은 제거**되었습니다.

### 메신저 미읽음 표시

- `GET /api/messenger/unread-count` 결과를 이용해, 메뉴/대시보드의 **メッセンジャー 항목에 미읽음 건수 배지**가 표시됩니다.

### 월간 지표 경고 메시지

- 월간 지표(잔업/휴일 등)가 기준을 초과하면, 화면에 **주의/경고 메시지**를 표시합니다. (법 해석은 적용 조건에 따라 달라질 수 있음)

---

## 부록 A — 요건 정의서 스타일 상세 목록（참고）

### A.1 개요

- **목적:** 근태 + 가동 + 손익 관리 시스템 개발을 위한 요구사항을 정의한다.
- **이후 설계/구현의 기준이 된다.**
- **대상:** 신입 개발자, 강사 및 리뷰어, 개발 리더.
- **개발 조건（예）:** 기간 1개월, 인원 3명, 목적은 교육용.

### A.2 시스템 개요

- 직원 근태 통합 관리, 관리자의 가동률/매출/손익 확인, Java/Spring/React 실습.
- **환경:** 직원은 모바일/PC/Excel, 관리자는 PC, 서버는 Spring Boot + Tomcat.

### A.3 업무 요건

- 모든 직원 근태 관리, 사무실 집계 업무.
- **흐름:** 직원 입력 → 시스템 저장 → 관리자 확인 → 지표 계산.

### A.4 사용자 요건

- 직원: 자기 데이터만. 관리자: 전체 데이터.

### A.5 기능 요건

- **인증:** 로그인/로그아웃, ID/비밀번호.
- **직원:** 근무일, 시작/종료, 휴식, 코멘트, 이력 조회.
- **관리자:** 전체 조회, 직원/월별 검색.
- **집계:** 월별 근무시간, 가동률.
- **매출/손익:** 단가 관리, 매출 계산, 비용 입력, 이익 계산.
- **캐시플로우:** 입금 예정일, 월별 입금액.

### A.6 비기능 요건

- **성능:** 동시 사용자 예 10명, 응답시간 예 3초 이내.
- **보안:** 비밀번호 해시 저장, URL 직접 접근 방지.
- **운영:** Tomcat 재시작으로 복구, 로그 기반 장애 확인.

### A.7 기술·데이터·제약·산출물·목표

- **기술:** Java/JavaScript, Spring/React, MySQL, Tomcat.
- **데이터:** 직원, 근태, 단가, 입금 예정（개념）.
- **제약:** 교육용 기능 최소화, 단기 완료, 외부 연동 없음（개념）.
- **산출물:** 요구사항 정의서, 설계서, 소스코드, 매뉴얼.
- **목표:** 근태 입력부터 집계까지 동작, Spring 구조 이해, 실무 개발 흐름 이해.
