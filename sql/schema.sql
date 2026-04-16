-- ============================================================================
-- 勤怠管理（トレーニング）システム — MySQL DDL + 初期データ（シード）
-- ----------------------------------------------------------------------------
-- 根拠: テーブル定義書（employee, work_time, batch_import_history）
-- 拡張: Web ログイン用 employee_account（定義書外、アプリ運用用）
--
-- 適用例:
--   mysql -u root -p < sql/schema.sql
--
-- シードアカウントの平文パスワード（ログイン検証用）:
--   ADMIN001 → admin123
--   EMP001, EMP002 → pass123
-- （DB には BCrypt ハッシュのみ保存）
-- ============================================================================

-- クライアント・接続文字セットを utf8mb4 に固定（絵文字・多言語対応）
SET NAMES utf8mb4;

-- DROP/CREATE の順序で FK 違反を避けるため、一時的に外部キー検査をオフ
-- （末尾で再度 1 に戻す）
SET FOREIGN_KEY_CHECKS = 0;

-- アプリ専用 DB がなければ作成
CREATE DATABASE IF NOT EXISTS kintai_db
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

-- 以降の DDL/DML はこの DB 内で実行
USE kintai_db;

-- ----------------------------------------------------------------------------
-- 既存テーブル削除（依存関係: 子 → 親の順）
-- batch_import_history: 他テーブルを参照しない → 先に削除可
-- work_time: employee 参照
-- employee_account: employee 参照
-- employee: マスタ（親）
-- ----------------------------------------------------------------------------
DROP TABLE IF EXISTS batch_import_history;
DROP TABLE IF EXISTS work_time;
DROP TABLE IF EXISTS employee_account;
DROP TABLE IF EXISTS employee;

-- ============================================================================
-- 1.1 employee — 従業員マスタ（定義書 1.1 どおり）
-- ============================================================================
-- 1 行 = 1 名の従業員。業務上の従業員コード（employee_code）で識別。
-- ============================================================================
CREATE TABLE employee (
  -- PK: 内部識別子（自動採番、JPA @GeneratedValue IDENTITY に対応）
  employee_id   BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,

  -- 従業員コード: ログイン ID として使う業務コード（重複不可、最大 20 文字）
  employee_code VARCHAR(20)     NOT NULL,

  -- 従業員名（表示名）
  employee_name VARCHAR(50)     NOT NULL,

  -- 所属部署・チーム（なければ NULL）
  department    VARCHAR(50)     NULL,

  -- 未登録者向け招待メールの送付先（任意）
  invite_email  VARCHAR(254)    NULL,

  -- 時間単価原価: 損益計算等に使う単価（定義書上必須）
  hourly_cost   DECIMAL(8, 2)   NOT NULL,

  -- 有効フラグ: 1=在籍・利用可、0=無効（ログイン拒否等に利用可）
  active_flag   TINYINT         NOT NULL DEFAULT 1 COMMENT '1:有効 0:無効',

  -- 登録日時（行の初回挿入時刻、ミリ秒）
  created_at    DATETIME(3)     NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

  -- 更新日時（行が更新されるたびに自動更新）
  updated_at    DATETIME(3)     NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),

  -- 従業員コード一意制約（同一コードで 2 名不可）
  UNIQUE KEY uk_employee_code (employee_code),

  -- 有効従業員のみを取得するクエリ用補助インデックス
  KEY idx_employee_active (active_flag)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- 1.x employee_account — ログイン・権限（定義書になし、Web アプリ拡張）
-- ============================================================================
-- 定義書の employee にパスワード・ロールがないため、1:1 で分離保存。
-- employee_id が PK かつ employee を指す外部キー。
-- ============================================================================
CREATE TABLE employee_account (
  -- 従業員 PK と 1:1（アカウントは従業員につき 1 つ）
  employee_id   BIGINT UNSIGNED NOT NULL PRIMARY KEY,

  -- BCrypt 等でハッシュ化したパスワード（平文保存禁止）
  password_hash VARCHAR(255)    NOT NULL COMMENT 'BCrypt',

  -- ADMIN: 管理者メニュー、EMPLOYEE: 本人勤務のみ
  role          VARCHAR(20)     NOT NULL COMMENT 'ADMIN | EMPLOYEE',

  -- 従業員削除時にアカウントも削除（孤児アカウント防止）
  CONSTRAINT fk_employee_account_employee FOREIGN KEY (employee_id) REFERENCES employee (employee_id)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- 1.2 work_time — 勤怠実績（定義書 1.2 どおり）
-- ============================================================================
-- 1 行 = 1 従業員の 1 日（または 1 件）の勤務記録。
-- employee_id で従業員マスタと紐付け。
-- ============================================================================
CREATE TABLE work_time (
  -- PK: 勤怠行ごとの識別子
  work_id       BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,

  -- 勤務した従業員（employee.employee_id 参照）
  employee_id   BIGINT UNSIGNED NOT NULL,

  -- 勤務日（日付のみ。タイムゾーンはアプリで Asia/Tokyo 等に統一推奨）
  work_date     DATE            NOT NULL,

  -- 出勤時刻（TIME, NOT NULL — 定義書上必須）
  start_time    TIME            NOT NULL,

  -- 退勤時刻（TIME, NOT NULL）
  end_time      TIME            NOT NULL,

  -- 休憩時間（分）。実働分計算時に減算
  break_minutes INT UNSIGNED    NOT NULL,

  -- 実働時間（分）。（終了−開始）−休憩 をアプリで計算して保存する値
  work_minutes  INT UNSIGNED    NOT NULL COMMENT '実働（分）',

  -- 備考（勤務表の備考）
  remarks       VARCHAR(500)    NULL,

  -- この行が DB に記録された時刻
  created_at    DATETIME(3)     NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

  -- 1 従業員は 1 日 1 件のみ（時刻に依らない）
  UNIQUE KEY uk_work_time_emp_date (employee_id, work_date),

  -- 従業員別・日付別一覧取得の最適化（例: 1 か月分）
  KEY idx_work_time_emp_date (employee_id, work_date),

  -- 月単位で全従業員取得などに使用
  KEY idx_work_time_month (work_date),

  -- 従業員削除時に当該従業員の勤怠履歴も削除
  CONSTRAINT fk_work_time_employee FOREIGN KEY (employee_id) REFERENCES employee (employee_id)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- 1.3 batch_import_history — バッチ/ファイル取込履歴（定義書 1.3 どおり）
-- ============================================================================
-- Excel 等の一括アップロード結果を残す用途（現アプリ未使用でもスキーマ維持）
-- ============================================================================
CREATE TABLE batch_import_history (
  import_id     BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  file_name     VARCHAR(100)    NOT NULL,
  status        VARCHAR(20)     NOT NULL COMMENT 'SUCCESS | ERROR',
  error_message VARCHAR(255)    NULL,
  imported_at   DATETIME(3)     NOT NULL DEFAULT CURRENT_TIMESTAMP(3)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 外部キー検査を再度オン（以降の INSERT で参照整合性を検査）
SET FOREIGN_KEY_CHECKS = 1;

-- ============================================================================
-- シードデータ — 開発・デモ用の初期従業員とアカウント
-- ============================================================================
-- 1) employee を 3 名挿入（department NULL 可、hourly_cost・active_flag 明示）
-- 2) employee_account は employee_code で従業員を探し employee_id を突合して挿入
--    （AUTO_INCREMENT で id が確定した後なので SELECT 方式が安全）
-- ============================================================================

INSERT INTO employee (employee_code, employee_name, department, hourly_cost, active_flag, created_at, updated_at) VALUES
  ('ADMIN001', 'システム管理者', NULL, 5000.00, 1, NOW(3), NOW(3)),
  ('EMP001',   'テスト従業員1',  NULL, 3000.00, 1, NOW(3), NOW(3)),
  ('EMP002',   'テスト従業員2',  NULL, 3000.00, 1, NOW(3), NOW(3));

-- 管理者アカウント: 平文パスワード admin123 に対応する BCrypt ハッシュ
INSERT INTO employee_account (employee_id, password_hash, role)
SELECT e.employee_id, '$2b$10$wyEbhn0AgE3Uy/Ndg6WyoeZIbtimGKbt91sCHgLoBv5EfkfvF9j9e', 'ADMIN'
FROM employee e WHERE e.employee_code = 'ADMIN001';

-- 一般従業員アカウント: 平文パスワード pass123 に対応する BCrypt ハッシュ
INSERT INTO employee_account (employee_id, password_hash, role)
SELECT e.employee_id, '$2b$10$qzVVIwAzyY7FceCnLjvWeezPOzC7f7oOhOg6S/GZgWTWs/XZmjwfO', 'EMPLOYEE'
FROM employee e WHERE e.employee_code = 'EMP001';

INSERT INTO employee_account (employee_id, password_hash, role)
SELECT e.employee_id, '$2b$10$qzVVIwAzyY7FceCnLjvWeezPOzC7f7oOhOg6S/GZgWTWs/XZmjwfO', 'EMPLOYEE'
FROM employee e WHERE e.employee_code = 'EMP002';
