-- 手動実行用: すべての Flyway マイグレーション適用後に MySQL で実行してください。
-- 例: mysql -u USER -p DATABASE < sql/seed_dev_default_accounts_manual.sql
--
-- デモアカウント（平文パスワード）
--   ADMIN001  / 1234       （管理者）
--   00000001  / 12345678   （従業員）
--   00000002  / 12345678   （従業員）
-- ログイン画面では login_id に上記のコードを入力します（V3 以降は社員コードと同一で登録）。

SET NAMES utf8mb4;

INSERT IGNORE INTO employee (employee_code, employee_name, department, hourly_cost, active_flag, created_at, updated_at) VALUES
  ('ADMIN001', 'システム管理者', NULL, 5000.00, 1, NOW(3), NOW(3)),
  ('00000001', 'テスト従業員1',  NULL, 3000.00, 1, NOW(3), NOW(3)),
  ('00000002', 'テスト従業員2',  NULL, 3000.00, 1, NOW(3), NOW(3));

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
