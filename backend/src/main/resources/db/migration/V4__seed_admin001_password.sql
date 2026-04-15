-- システム管理者 ADMIN001 の初期パスワードを 1234 に設定（BCrypt）
UPDATE employee_account ea
INNER JOIN employee e ON e.employee_id = ea.employee_id
SET ea.password_hash = '$2a$10$GyosPik6iAtj5j0OgGB4ju1MgAZ3BerVXSPPY9lFTRVhBfahUGs9u'
WHERE e.employee_code = 'ADMIN001';
