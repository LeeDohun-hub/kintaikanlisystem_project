-- 勤怠管理システム DB スキーマ（JPA エンティティと対応）
-- MySQL 8.x / utf8mb4
-- アプリは spring.jpa.hibernate.ddl-auto=update でもスキーマを揃えられます。
-- 初期ユーザー・BCrypt パスワードは DataInitializer（Java）で投入されます。
--
-- 注意: 下記 DROP は既存テーブル・データを削除します。初回のみ実行するか、必要に応じて DROP ブロックをコメントアウトしてください。

SET NAMES utf8mb4;

CREATE DATABASE IF NOT EXISTS kintai_db
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE kintai_db;

SET FOREIGN_KEY_CHECKS = 0;

DROP TABLE IF EXISTS payment_schedule;
DROP TABLE IF EXISTS unit_price;
DROP TABLE IF EXISTS attendance;
DROP TABLE IF EXISTS project;
DROP TABLE IF EXISTS employee;

SET FOREIGN_KEY_CHECKS = 1;

-- ---------------------------------------------------------------------------
-- employee（com.kintai.entity.Employee）
-- ---------------------------------------------------------------------------
CREATE TABLE employee (
  id              BIGINT       NOT NULL AUTO_INCREMENT,
  employee_code   VARCHAR(20)  NOT NULL,
  name            VARCHAR(100) NOT NULL,
  password        VARCHAR(255) NOT NULL,
  email           VARCHAR(100) NULL,
  role            VARCHAR(20)  NOT NULL,
  unit_price      DECIMAL(10, 2) NULL,
  created_at      DATETIME(6)  NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uk_employee_code (employee_code)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------------
-- project（com.kintai.entity.Project）
-- ---------------------------------------------------------------------------
CREATE TABLE project (
  id          BIGINT       NOT NULL AUTO_INCREMENT,
  name        VARCHAR(100) NOT NULL,
  description TEXT         NULL,
  created_at  DATETIME(6)  NULL,
  PRIMARY KEY (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------------
-- attendance（com.kintai.entity.Attendance）
-- ---------------------------------------------------------------------------
CREATE TABLE attendance (
  id            BIGINT       NOT NULL AUTO_INCREMENT,
  employee_id   BIGINT       NOT NULL,
  work_date     DATE         NOT NULL,
  start_time    TIME(6)      NULL,
  end_time      TIME(6)      NULL,
  break_minutes INT          NULL,
  work_type     VARCHAR(20)  NULL,
  comment       TEXT         NULL,
  project_id    BIGINT       NULL,
  created_at    DATETIME(6)  NULL,
  PRIMARY KEY (id),
  KEY idx_attendance_employee_id (employee_id),
  KEY idx_attendance_project_id (project_id),
  KEY idx_attendance_work_date (work_date),
  CONSTRAINT fk_attendance_employee
    FOREIGN KEY (employee_id) REFERENCES employee (id),
  CONSTRAINT fk_attendance_project
    FOREIGN KEY (project_id) REFERENCES project (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------------
-- unit_price（com.kintai.entity.UnitPrice）
-- ---------------------------------------------------------------------------
CREATE TABLE unit_price (
  id          BIGINT         NOT NULL AUTO_INCREMENT,
  employee_id BIGINT         NOT NULL,
  month       VARCHAR(7)     NOT NULL,
  price       DECIMAL(10, 2) NOT NULL,
  PRIMARY KEY (id),
  KEY idx_unit_price_employee_id (employee_id),
  CONSTRAINT fk_unit_price_employee
    FOREIGN KEY (employee_id) REFERENCES employee (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------------
-- payment_schedule（com.kintai.entity.PaymentSchedule）
-- ---------------------------------------------------------------------------
CREATE TABLE payment_schedule (
  id                BIGINT          NOT NULL AUTO_INCREMENT,
  employee_id       BIGINT          NOT NULL,
  month             VARCHAR(7)      NOT NULL,
  scheduled_amount  DECIMAL(12, 2)  NULL,
  scheduled_date    DATE            NULL,
  is_received       TINYINT(1)      NOT NULL DEFAULT 0,
  PRIMARY KEY (id),
  KEY idx_payment_schedule_employee_id (employee_id),
  CONSTRAINT fk_payment_schedule_employee
    FOREIGN KEY (employee_id) REFERENCES employee (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
