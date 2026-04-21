-- kintai / 勤怠アプリ用 MySQL 定義
-- Flyway の migration をまとめ直しただけ（V1〜V11 + dev の seed は下にコメントで置いてある）
-- 手元では未実行。空の DB に当てるなら先に kintai_db を作ってからで。

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

CREATE DATABASE IF NOT EXISTS kintai_db
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;
USE kintai_db;

DROP TABLE IF EXISTS conversation_leave;
DROP TABLE IF EXISTS board_comment;
DROP TABLE IF EXISTS board_post;
DROP TABLE IF EXISTS message;
DROP TABLE IF EXISTS vacation_request;
DROP TABLE IF EXISTS login_attempt;
DROP TABLE IF EXISTS work_time;
DROP TABLE IF EXISTS employee_account;
DROP TABLE IF EXISTS batch_import_history;
DROP TABLE IF EXISTS employee;

CREATE TABLE employee (
  employee_id   BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  employee_code VARCHAR(20)     NOT NULL,
  employee_name VARCHAR(50)     NOT NULL,
  department    VARCHAR(50)     NULL,
  invite_email  VARCHAR(254)    NULL COMMENT '招待メール送付先（任意）',
  hourly_cost   DECIMAL(8, 2)   NOT NULL,
  active_flag   TINYINT         NOT NULL DEFAULT 1 COMMENT '1:有効 0:無効',
  created_at    DATETIME(3)     NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at    DATETIME(3)     NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  photo_filename VARCHAR(255)   NULL,
  UNIQUE KEY uk_employee_code (employee_code),
  KEY idx_employee_active (active_flag)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE employee_account (
  employee_id   BIGINT UNSIGNED NOT NULL PRIMARY KEY,
  login_id      VARCHAR(50)     NOT NULL COMMENT 'ログインID（社員コードと別でも可）',
  password_hash VARCHAR(255)    NOT NULL COMMENT 'BCrypt',
  role          VARCHAR(20)     NOT NULL COMMENT 'ADMIN | EMPLOYEE',
  UNIQUE KEY uk_employee_account_login_id (login_id),
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

CREATE TABLE login_attempt (
  attempt_id     BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  attempted_at   DATETIME(3)     NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  login_id       VARCHAR(100)    NOT NULL COMMENT '入力ログインID（トリム後）',
  success_flag   TINYINT         NOT NULL COMMENT '1:成功 0:失敗',
  failure_code   VARCHAR(40)     NULL COMMENT '失敗時の理由コード',
  employee_id    BIGINT UNSIGNED NULL COMMENT '成功時またはアカウント同定後',
  ip_address     VARCHAR(45)     NULL,
  user_agent     VARCHAR(500)    NULL,
  KEY idx_login_attempt_time (attempted_at),
  KEY idx_login_attempt_login (login_id(32)),
  CONSTRAINT fk_login_attempt_employee FOREIGN KEY (employee_id) REFERENCES employee (employee_id)
    ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE board_post (
  post_id     BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  title       VARCHAR(200)    NOT NULL,
  content     TEXT            NOT NULL,
  author_id   BIGINT UNSIGNED NOT NULL,
  created_at  DATETIME(3)     NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at  DATETIME(3)     NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  CONSTRAINT fk_board_post_employee FOREIGN KEY (author_id) REFERENCES employee (employee_id)
    ON DELETE CASCADE ON UPDATE CASCADE,
  KEY idx_board_post_created (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE board_comment (
  comment_id  BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  post_id     BIGINT UNSIGNED NOT NULL,
  content     TEXT            NOT NULL,
  author_id   BIGINT UNSIGNED NOT NULL,
  created_at  DATETIME(3)     NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  CONSTRAINT fk_board_comment_post FOREIGN KEY (post_id) REFERENCES board_post (post_id)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_board_comment_employee FOREIGN KEY (author_id) REFERENCES employee (employee_id)
    ON DELETE CASCADE ON UPDATE CASCADE,
  KEY idx_board_comment_post (post_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE message (
  message_id   BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  sender_id    BIGINT UNSIGNED NOT NULL,
  receiver_id  BIGINT UNSIGNED NOT NULL,
  content      TEXT            NOT NULL,
  system_type  VARCHAR(32)     NULL COMMENT 'PARTNER_LEFT 等',
  is_read      TINYINT(1)      NOT NULL DEFAULT 0,
  created_at   DATETIME(3)     NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  CONSTRAINT fk_message_sender FOREIGN KEY (sender_id) REFERENCES employee (employee_id)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_message_receiver FOREIGN KEY (receiver_id) REFERENCES employee (employee_id)
    ON DELETE CASCADE ON UPDATE CASCADE,
  KEY idx_message_sender (sender_id, created_at),
  KEY idx_message_receiver (receiver_id, is_read)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE vacation_request (
  request_id    BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  employee_id   BIGINT UNSIGNED NOT NULL,
  vacation_type VARCHAR(10)     NOT NULL COMMENT 'FULL | HALF_AM | HALF_PM',
  vacation_date DATE            NOT NULL,
  reason        VARCHAR(500)    NULL,
  status        VARCHAR(10)     NOT NULL DEFAULT 'PENDING' COMMENT 'PENDING | APPROVED | REJECTED',
  approved_by   BIGINT UNSIGNED NULL,
  approved_at   DATETIME(3)     NULL,
  reject_reason VARCHAR(500)    NULL,
  created_at    DATETIME(3)     NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at    DATETIME(3)     NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  CONSTRAINT fk_vacation_employee FOREIGN KEY (employee_id) REFERENCES employee (employee_id)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_vacation_approver FOREIGN KEY (approved_by) REFERENCES employee (employee_id)
    ON DELETE SET NULL ON UPDATE CASCADE,
  KEY idx_vacation_employee (employee_id, vacation_date),
  KEY idx_vacation_status (status, vacation_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE conversation_leave (
  leaver_id  BIGINT UNSIGNED NOT NULL,
  partner_id BIGINT UNSIGNED NOT NULL,
  left_at    DATETIME(3)     NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (leaver_id, partner_id),
  CONSTRAINT fk_conv_leave_leaver FOREIGN KEY (leaver_id) REFERENCES employee (employee_id)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_conv_leave_partner FOREIGN KEY (partner_id) REFERENCES employee (employee_id)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

SET FOREIGN_KEY_CHECKS = 1;

-- 以下 dev 用。V2__dev_seed.sql から拾っただけ。ADMIN001 のハッシュは V4 と同じ（平文は各自 README 参照）
/*
INSERT IGNORE INTO employee (employee_code, employee_name, department, hourly_cost, active_flag, created_at, updated_at) VALUES
  ('ADMIN001', 'システム管理者', NULL, 5000.00, 1, NOW(3), NOW(3)),
  ('00000001', 'テスト従業員1',  NULL, 3000.00, 1, NOW(3), NOW(3)),
  ('00000002', 'テスト従業員2',  NULL, 3000.00, 1, NOW(3), NOW(3));

-- login_id は社員コードと同じで入れる想定
INSERT INTO employee_account (employee_id, login_id, password_hash, role)
SELECT e.employee_id, e.employee_code, '$2a$10$GyosPik6iAtj5j0OgGB4ju1MgAZ3BerVXSPPY9lFTRVhBfahUGs9u', 'ADMIN'
FROM employee e WHERE e.employee_code = 'ADMIN001'
AND NOT EXISTS (SELECT 1 FROM employee_account a WHERE a.employee_id = e.employee_id);

INSERT INTO employee_account (employee_id, login_id, password_hash, role)
SELECT e.employee_id, e.employee_code, '$2a$10$nb8i6goJP1.HOZpfDBdCGuZeoWTzxjA4NucYPCBnvi3Mlg8OgjFhK', 'EMPLOYEE'
FROM employee e WHERE e.employee_code = '00000001'
AND NOT EXISTS (SELECT 1 FROM employee_account a WHERE a.employee_id = e.employee_id);

INSERT INTO employee_account (employee_id, login_id, password_hash, role)
SELECT e.employee_id, e.employee_code, '$2a$10$nb8i6goJP1.HOZpfDBdCGuZeoWTzxjA4NucYPCBnvi3Mlg8OgjFhK', 'EMPLOYEE'
FROM employee e WHERE e.employee_code = '00000002'
AND NOT EXISTS (SELECT 1 FROM employee_account a WHERE a.employee_id = e.employee_id);
*/
