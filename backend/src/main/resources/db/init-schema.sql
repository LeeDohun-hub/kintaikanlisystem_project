-- アプリケーション起動時に自動実行（MySQL、kintai_db 接続後）
-- 手動適用はプロジェクトルート sql/schema.sql を使用

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

CREATE TABLE IF NOT EXISTS employee (
  employee_id   BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  employee_code VARCHAR(20)     NOT NULL,
  employee_name VARCHAR(50)     NOT NULL,
  department    VARCHAR(50)     NULL,
  invite_email  VARCHAR(254)    NULL,
  hourly_cost   DECIMAL(8, 2)   NOT NULL,
  active_flag   TINYINT         NOT NULL DEFAULT 1 COMMENT '1:有効 0:無効',
  created_at    DATETIME(3)     NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at    DATETIME(3)     NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  UNIQUE KEY uk_employee_code (employee_code),
  KEY idx_employee_active (active_flag)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS employee_account (
  employee_id   BIGINT UNSIGNED NOT NULL PRIMARY KEY,
  password_hash VARCHAR(255)    NOT NULL COMMENT 'BCrypt',
  role          VARCHAR(20)     NOT NULL COMMENT 'ADMIN | EMPLOYEE',
  CONSTRAINT fk_employee_account_employee FOREIGN KEY (employee_id) REFERENCES employee (employee_id)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS work_time (
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

CREATE TABLE IF NOT EXISTS batch_import_history (
  import_id     BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  file_name     VARCHAR(100)    NOT NULL,
  status        VARCHAR(20)     NOT NULL COMMENT 'SUCCESS | ERROR',
  error_message VARCHAR(255)    NULL,
  imported_at   DATETIME(3)     NOT NULL DEFAULT CURRENT_TIMESTAMP(3)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

SET FOREIGN_KEY_CHECKS = 1;

-- 既存 DB（work_time に remarks なしで作成された場合）互換: 列のみ追加
SET @wt_remarks := (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'work_time' AND COLUMN_NAME = 'remarks'
);
SET @wt_sql := IF(@wt_remarks = 0,
  'ALTER TABLE work_time ADD COLUMN remarks VARCHAR(500) NULL COMMENT ''備考''',
  'SELECT 1');
PREPARE wt_stmt FROM @wt_sql;
EXECUTE wt_stmt;
DEALLOCATE PREPARE wt_stmt;

-- 既存 DB（work_time に UNIQUE(employee_id, work_date) がない場合）互換: ユニークキー追加
SET @wt_uk := (
  SELECT COUNT(*) FROM information_schema.STATISTICS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'work_time'
    AND INDEX_NAME = 'uk_work_time_emp_date'
);
SET @wt_uk_sql := IF(@wt_uk = 0,
  'ALTER TABLE work_time ADD UNIQUE KEY uk_work_time_emp_date (employee_id, work_date)',
  'SELECT 1');
PREPARE wt_uk_stmt FROM @wt_uk_sql;
EXECUTE wt_uk_stmt;
DEALLOCATE PREPARE wt_uk_stmt;

-- テストアカウントシード（重複時は無視）
INSERT IGNORE INTO employee (employee_code, employee_name, department, hourly_cost, active_flag, created_at, updated_at) VALUES
  ('ADMIN001', 'システム管理者', NULL, 5000.00, 1, NOW(3), NOW(3)),
  ('EMP001',   'テスト従業員1',  NULL, 3000.00, 1, NOW(3), NOW(3)),
  ('EMP002',   'テスト従業員2',  NULL, 3000.00, 1, NOW(3), NOW(3));

INSERT INTO employee_account (employee_id, password_hash, role)
SELECT e.employee_id, '$2b$10$wyEbhn0AgE3Uy/Ndg6WyoeZIbtimGKbt91sCHgLoBv5EfkfvF9j9e', 'ADMIN'
FROM employee e WHERE e.employee_code = 'ADMIN001'
AND NOT EXISTS (SELECT 1 FROM employee_account a WHERE a.employee_id = e.employee_id);

INSERT INTO employee_account (employee_id, password_hash, role)
SELECT e.employee_id, '$2b$10$qzVVIwAzyY7FceCnLjvWeezPOzC7f7oOhOg6S/GZgWTWs/XZmjwfO', 'EMPLOYEE'
FROM employee e WHERE e.employee_code = 'EMP001'
AND NOT EXISTS (SELECT 1 FROM employee_account a WHERE a.employee_id = e.employee_id);

INSERT INTO employee_account (employee_id, password_hash, role)
SELECT e.employee_id, '$2b$10$qzVVIwAzyY7FceCnLjvWeezPOzC7f7oOhOg6S/GZgWTWs/XZmjwfO', 'EMPLOYEE'
FROM employee e WHERE e.employee_code = 'EMP002'
AND NOT EXISTS (SELECT 1 FROM employee_account a WHERE a.employee_id = e.employee_id);
