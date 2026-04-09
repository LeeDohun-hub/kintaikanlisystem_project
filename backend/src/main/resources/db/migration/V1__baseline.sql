-- Flyway baseline schema (MySQL)
SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

CREATE TABLE employee (
  employee_id   BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  employee_code VARCHAR(20)     NOT NULL,
  employee_name VARCHAR(50)     NOT NULL,
  department    VARCHAR(50)     NULL,
  hourly_cost   DECIMAL(8, 2)   NOT NULL,
  active_flag   TINYINT         NOT NULL DEFAULT 1 COMMENT '1:有効 0:無効',
  created_at    DATETIME(3)     NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at    DATETIME(3)     NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  UNIQUE KEY uk_employee_code (employee_code),
  KEY idx_employee_active (active_flag)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE employee_account (
  employee_id   BIGINT UNSIGNED NOT NULL PRIMARY KEY,
  password_hash VARCHAR(255)    NOT NULL COMMENT 'BCrypt',
  role          VARCHAR(20)     NOT NULL COMMENT 'ADMIN | EMPLOYEE',
  CONSTRAINT fk_employee_account_employee FOREIGN KEY (employee_id) REFERENCES employee (employee_id)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE work_time (
  work_id       BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  employee_id   BIGINT UNSIGNED NOT NULL,
  work_date     DATE            NOT NULL,
  start_time    TIME            NOT NULL,
  end_time      TIME            NOT NULL,
  break_minutes INT UNSIGNED    NOT NULL,
  work_minutes  INT UNSIGNED    NOT NULL COMMENT '実働（分）',
  remarks       VARCHAR(500)    NULL COMMENT '備考',
  created_at    DATETIME(3)     NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  UNIQUE KEY uk_work_time_emp_date (employee_id, work_date),
  KEY idx_work_time_emp_date (employee_id, work_date),
  KEY idx_work_time_month (work_date),
  CONSTRAINT fk_work_time_employee FOREIGN KEY (employee_id) REFERENCES employee (employee_id)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE batch_import_history (
  import_id     BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  file_name     VARCHAR(100)    NOT NULL,
  status        VARCHAR(20)     NOT NULL COMMENT 'SUCCESS | ERROR',
  error_message VARCHAR(255)    NULL,
  imported_at   DATETIME(3)     NOT NULL DEFAULT CURRENT_TIMESTAMP(3)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

SET FOREIGN_KEY_CHECKS = 1;

