-- 근태관리 시스템 — MySQL 8.x
-- 적용: mysql -u root -p < sql/schema.sql
-- 비밀번호는 BCrypt(Spring BCryptPasswordEncoder 호환). 평문: admin123 / pass123

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

CREATE DATABASE IF NOT EXISTS kintai_db
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE kintai_db;

-- ---------------------------------------------------------------------------
-- 직원 (JPA: com.kintai.entity.Employee → 테이블 employees)
-- ---------------------------------------------------------------------------
DROP TABLE IF EXISTS payment_schedules;
DROP TABLE IF EXISTS unit_prices;
DROP TABLE IF EXISTS attendance;
DROP TABLE IF EXISTS projects;
DROP TABLE IF EXISTS employees;

CREATE TABLE employees (
  id            BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  employee_code VARCHAR(32)  NOT NULL,
  name          VARCHAR(100) NOT NULL,
  password      VARCHAR(255) NOT NULL COMMENT 'BCrypt',
  role          VARCHAR(20)  NOT NULL COMMENT 'ADMIN | EMPLOYEE',
  UNIQUE KEY uk_employees_code (employee_code),
  KEY idx_employees_role (role)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------------
-- 프로젝트
-- ---------------------------------------------------------------------------
CREATE TABLE projects (
  id   BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(200) NOT NULL,
  code VARCHAR(50)  NOT NULL,
  UNIQUE KEY uk_projects_code (code),
  KEY idx_projects_name (name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------------
-- 근태
-- ---------------------------------------------------------------------------
CREATE TABLE attendance (
  id             BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  employee_id    BIGINT UNSIGNED NOT NULL,
  work_date      DATE            NOT NULL,
  start_time     TIME            NULL,
  end_time       TIME            NULL,
  break_minutes  INT UNSIGNED    NOT NULL DEFAULT 0,
  work_type      VARCHAR(20)     NOT NULL DEFAULT 'NORMAL' COMMENT 'NORMAL | OVERTIME | HOLIDAY',
  comment        VARCHAR(500)    NULL,
  project_id     BIGINT UNSIGNED NULL,
  created_at     DATETIME(3)     NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  KEY idx_attendance_emp_date (employee_id, work_date),
  KEY idx_attendance_month (work_date),
  CONSTRAINT fk_attendance_employee FOREIGN KEY (employee_id) REFERENCES employees (id)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_attendance_project FOREIGN KEY (project_id) REFERENCES projects (id)
    ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------------
-- 직원 단가 (월별)
-- ---------------------------------------------------------------------------
CREATE TABLE unit_prices (
  id          BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  employee_id BIGINT UNSIGNED NOT NULL,
  month       VARCHAR(7)      NOT NULL COMMENT 'YYYY-MM',
  price       DECIMAL(12, 2)  NOT NULL,
  UNIQUE KEY uk_unit_prices_emp_month (employee_id, month),
  CONSTRAINT fk_unit_prices_employee FOREIGN KEY (employee_id) REFERENCES employees (id)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------------
-- 입금 예정 (캐시플로우)
-- ---------------------------------------------------------------------------
CREATE TABLE payment_schedules (
  id             BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  employee_id    BIGINT UNSIGNED NOT NULL,
  month          VARCHAR(7)      NOT NULL COMMENT 'YYYY-MM',
  expected_date  DATE            NOT NULL,
  amount         DECIMAL(14, 2)  NOT NULL,
  status         VARCHAR(20)     NOT NULL DEFAULT 'PENDING',
  created_at     DATETIME(3)     NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  KEY idx_payment_month (month),
  CONSTRAINT fk_payment_employee FOREIGN KEY (employee_id) REFERENCES employees (id)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

SET FOREIGN_KEY_CHECKS = 1;

-- ---------------------------------------------------------------------------
-- 시드 데이터 (테스트 계정 — 로그인 화면 안내와 동일)
-- BCrypt: admin123, pass123 (각각 동일 해시로 관리자/직원 구분)
-- ---------------------------------------------------------------------------
INSERT INTO employees (employee_code, name, password, role) VALUES
  ('ADMIN001', '시스템관리자', '$2b$10$wyEbhn0AgE3Uy/Ndg6WyoeZIbtimGKbt91sCHgLoBv5EfkfvF9j9e', 'ADMIN'),
  ('EMP001',   '테스트직원1',  '$2b$10$qzVVIwAzyY7FceCnLjvWeezPOzC7f7oOhOg6S/GZgWTWs/XZmjwfO', 'EMPLOYEE'),
  ('EMP002',   '테스트직원2',  '$2b$10$qzVVIwAzyY7FceCnLjvWeezPOzC7f7oOhOg6S/GZgWTWs/XZmjwfO', 'EMPLOYEE')
ON DUPLICATE KEY UPDATE
  name = VALUES(name),
  password = VALUES(password),
  role = VALUES(role);

INSERT INTO projects (name, code) VALUES
  ('사내 업무', 'INT'),
  ('외부 프로젝트 A', 'PRJ-A')
ON DUPLICATE KEY UPDATE name = VALUES(name);
