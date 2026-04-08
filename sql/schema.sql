-- ============================================================================
-- 근태관리(トレーニング) 시스템 — MySQL DDL + 초기 데이터(시드)
-- ----------------------------------------------------------------------------
-- 근거: 테이블 정의서(employee, work_time, batch_import_history)
-- 확장: Web 로그인용 employee_account (정의서 외, 앱 운영용)
--
-- 적용 방법(예):
--   mysql -u root -p < sql/schema.sql
--
-- 시드 계정 평문 비밀번호(로그인 테스트용):
--   ADMIN001 → admin123
--   EMP001, EMP002 → pass123
-- (DB에는 BCrypt 해시만 저장됨)
-- ============================================================================

-- 클라이언트·연결 문자셋을 utf8mb4로 고정 (이모지·다국어 안전)
SET NAMES utf8mb4;

-- DROP/CREATE 순서에서 FK 위반을 피하기 위해 일시적으로 외래키 검사 끔
-- (끝에서 다시 1로 복구)
SET FOREIGN_KEY_CHECKS = 0;

-- 애플리케이션 전용 DB가 없으면 생성
CREATE DATABASE IF NOT EXISTS kintai_db
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

-- 이후 모든 DDL/DML은 이 DB 안에서 실행
USE kintai_db;

-- ----------------------------------------------------------------------------
-- 기존 테이블 제거 (의존 관계: 자식 → 부모 순)
-- batch_import_history: 다른 테이블을 참조하지 않음 → 먼저 삭제 가능
-- work_time: employee 참조
-- employee_account: employee 참조
-- employee: 마스터(부모)
-- ----------------------------------------------------------------------------
DROP TABLE IF EXISTS batch_import_history;
DROP TABLE IF EXISTS work_time;
DROP TABLE IF EXISTS employee_account;
DROP TABLE IF EXISTS employee;

-- ============================================================================
-- 1.1 employee — 직원 마스터 (정의서 1.1 그대로)
-- ============================================================================
-- 한 행 = 한 명의 직원. 업무상 직원 코드(employee_code)로 식별.
-- ============================================================================
CREATE TABLE employee (
  -- PK: 내부 식별자 (자동 증가, JPA @GeneratedValue IDENTITY 와 대응)
  employee_id   BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,

  -- 직원 코드: 로그인 ID로 쓰는 업무용 코드 (중복 불가, 최대 20자)
  employee_code VARCHAR(20)     NOT NULL,

  -- 직원 이름 (표시명)
  employee_name VARCHAR(50)     NOT NULL,

  -- 소속 부서/팀 (없으면 NULL)
  department    VARCHAR(50)     NULL,

  -- 시급 원가: 손익 계산 등에 쓰는 단가(정의서상 필수)
  hourly_cost   DECIMAL(8, 2)   NOT NULL,

  -- 유효 플래그: 1=재직·사용 가능, 0=무효(로그인 거부 등에 활용 가능)
  active_flag   TINYINT         NOT NULL DEFAULT 1 COMMENT '1:有効 0:無効',

  -- 등록 일시 (행 최초 삽입 시각, 밀리초 단위)
  created_at    DATETIME(3)     NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

  -- 수정 일시 (행이 갱신될 때마다 자동 갱신)
  updated_at    DATETIME(3)     NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),

  -- 직원 코드 유일 제약 (동일 코드로 두 명 불가)
  UNIQUE KEY uk_employee_code (employee_code),

  -- 활성 직원만 조회하는 쿼리용 보조 인덱스
  KEY idx_employee_active (active_flag)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- 1.x employee_account — 로그인·권한 (정의서에 없음, Web 앱 확장)
-- ============================================================================
-- 정의서의 employee에는 비밀번호·역할이 없으므로, 1:1로 분리 저장.
-- employee_id 가 PK 이면서 동시에 employee 를 가리키는 외래키.
-- ============================================================================
CREATE TABLE employee_account (
  -- 직원 PK와 1:1 (계정은 직원당 하나)
  employee_id   BIGINT UNSIGNED NOT NULL PRIMARY KEY,

  -- BCrypt 등으로 해시된 비밀번호 (평문 저장 금지)
  password_hash VARCHAR(255)    NOT NULL COMMENT 'BCrypt',

  -- ADMIN: 관리자 메뉴, EMPLOYEE: 본인 근무만
  role          VARCHAR(20)     NOT NULL COMMENT 'ADMIN | EMPLOYEE',

  -- 직원 삭제 시 계정도 함께 삭제(고아 계정 방지)
  CONSTRAINT fk_employee_account_employee FOREIGN KEY (employee_id) REFERENCES employee (employee_id)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- 1.2 work_time — 근태 실적 (정의서 1.2 그대로)
-- ============================================================================
-- 한 행 = 한 직원의 하루(또는 한 건) 근무 기록.
-- employee_id 로 직원 마스터와 연결.
-- ============================================================================
CREATE TABLE work_time (
  -- PK: 근태 건별 식별자
  work_id       BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,

  -- 근무한 직원 (employee.employee_id 참조)
  employee_id   BIGINT UNSIGNED NOT NULL,

  -- 근무일 (날짜만, 타임존은 애플리케이션에서 Asia/Seoul 등으로 통일 권장)
  work_date     DATE            NOT NULL,

  -- 출근 시각 (TIME, NOT NULL — 정의서상 필수)
  start_time    TIME            NOT NULL,

  -- 퇴근 시각 (TIME, NOT NULL)
  end_time      TIME            NOT NULL,

  -- 휴게 시간(분). 실근무 분 계산 시 차감
  break_minutes INT UNSIGNED    NOT NULL,

  -- 실근무 시간(분). (종료−시작)−휴게 를 애플리케이션에서 계산해 저장하는 값
  work_minutes  INT UNSIGNED    NOT NULL COMMENT '実働（分）',

  -- 이 행이 DB에 기록된 시각
  created_at    DATETIME(3)     NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

  -- 직원별·일자별 목록 조회 최적화 (예: 한 달 조회)
  KEY idx_work_time_emp_date (employee_id, work_date),

  -- 월 단위 전 직원 조회 등에 사용
  KEY idx_work_time_month (work_date),

  -- 직원 삭제 시 해당 직원의 근태 이력도 삭제
  CONSTRAINT fk_work_time_employee FOREIGN KEY (employee_id) REFERENCES employee (employee_id)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- 1.3 batch_import_history — 배치/파일取込 이력 (정의서 1.3 그대로)
-- ============================================================================
-- Excel 등 일괄 업로드 결과를 남기는 용도 (현재 앱에서 미사용이어도 스키마 유지)
-- ============================================================================
CREATE TABLE batch_import_history (
  import_id     BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  file_name     VARCHAR(100)    NOT NULL,
  status        VARCHAR(20)     NOT NULL COMMENT 'SUCCESS | ERROR',
  error_message VARCHAR(255)    NULL,
  imported_at   DATETIME(3)     NOT NULL DEFAULT CURRENT_TIMESTAMP(3)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 외래키 검사 다시 켬 (이후 INSERT 시 참조 무결성 검사)
SET FOREIGN_KEY_CHECKS = 1;

-- ============================================================================
-- 시드 데이터 — 개발·데모용 초기 직원 및 계정
-- ============================================================================
-- 1) employee 3명 삽입 (department NULL 허용, hourly_cost·active_flag 명시)
-- 2) employee_account 는 employee_code 로 직원을 찾아 employee_id 를 매칭해 삽입
--    (AUTO_INCREMENT 로 id 가 정해진 뒤이므로 SELECT 방식이 안전)
-- ============================================================================

INSERT INTO employee (employee_code, employee_name, department, hourly_cost, active_flag, created_at, updated_at) VALUES
  ('ADMIN001', '시스템관리자', NULL, 5000.00, 1, NOW(3), NOW(3)),
  ('EMP001',   '테스트직원1',  NULL, 3000.00, 1, NOW(3), NOW(3)),
  ('EMP002',   '테스트직원2',  NULL, 3000.00, 1, NOW(3), NOW(3));

-- 관리자 계정: 평문 비밀번호 admin123 에 해당하는 BCrypt 해시
INSERT INTO employee_account (employee_id, password_hash, role)
SELECT e.employee_id, '$2b$10$wyEbhn0AgE3Uy/Ndg6WyoeZIbtimGKbt91sCHgLoBv5EfkfvF9j9e', 'ADMIN'
FROM employee e WHERE e.employee_code = 'ADMIN001';

-- 일반 직원 계정: 평문 비밀번호 pass123 에 해당하는 BCrypt 해시
INSERT INTO employee_account (employee_id, password_hash, role)
SELECT e.employee_id, '$2b$10$qzVVIwAzyY7FceCnLjvWeezPOzC7f7oOhOg6S/GZgWTWs/XZmjwfO', 'EMPLOYEE'
FROM employee e WHERE e.employee_code = 'EMP001';

INSERT INTO employee_account (employee_id, password_hash, role)
SELECT e.employee_id, '$2b$10$qzVVIwAzyY7FceCnLjvWeezPOzC7f7oOhOg6S/GZgWTWs/XZmjwfO', 'EMPLOYEE'
FROM employee e WHERE e.employee_code = 'EMP002';
