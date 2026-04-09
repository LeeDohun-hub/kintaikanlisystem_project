-- 개발/데모용 시드 (dev 프로파일에서만 실행)
INSERT IGNORE INTO employee (employee_code, employee_name, department, hourly_cost, active_flag, created_at, updated_at) VALUES
  ('ADMIN001', '시스템관리자', NULL, 5000.00, 1, NOW(3), NOW(3)),
  ('EMP001',   '테스트직원1',  NULL, 3000.00, 1, NOW(3), NOW(3)),
  ('EMP002',   '테스트직원2',  NULL, 3000.00, 1, NOW(3), NOW(3));

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

