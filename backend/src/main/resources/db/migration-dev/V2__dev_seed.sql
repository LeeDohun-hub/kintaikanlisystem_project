-- 開発/デモ用シード（dev プロファイルでのみ実行）
-- ログインIDは V3 で employee_code からバックフィルされる。ここでは平文: 管理者 ADMIN001=1234 / スタッフ 00000001,00000002=12345678
INSERT IGNORE INTO employee (employee_code, employee_name, department, hourly_cost, active_flag, created_at, updated_at) VALUES
  ('ADMIN001', 'システム管理者', NULL, 5000.00, 1, NOW(3), NOW(3)),
  ('00000001', 'テスト従業員1',  NULL, 3000.00, 1, NOW(3), NOW(3)),
  ('00000002', 'テスト従業員2',  NULL, 3000.00, 1, NOW(3), NOW(3));

INSERT INTO employee_account (employee_id, password_hash, role)
SELECT e.employee_id, '$2a$10$GyosPik6iAtj5j0OgGB4ju1MgAZ3BerVXSPPY9lFTRVhBfahUGs9u', 'ADMIN'
FROM employee e WHERE e.employee_code = 'ADMIN001'
AND NOT EXISTS (SELECT 1 FROM employee_account a WHERE a.employee_id = e.employee_id);

INSERT INTO employee_account (employee_id, password_hash, role)
SELECT e.employee_id, '$2a$10$nb8i6goJP1.HOZpfDBdCGuZeoWTzxjA4NucYPCBnvi3Mlg8OgjFhK', 'EMPLOYEE'
FROM employee e WHERE e.employee_code = '00000001'
AND NOT EXISTS (SELECT 1 FROM employee_account a WHERE a.employee_id = e.employee_id);

INSERT INTO employee_account (employee_id, password_hash, role)
SELECT e.employee_id, '$2a$10$nb8i6goJP1.HOZpfDBdCGuZeoWTzxjA4NucYPCBnvi3Mlg8OgjFhK', 'EMPLOYEE'
FROM employee e WHERE e.employee_code = '00000002'
AND NOT EXISTS (SELECT 1 FROM employee_account a WHERE a.employee_id = e.employee_id);
