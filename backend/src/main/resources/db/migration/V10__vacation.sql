CREATE TABLE vacation_request (
  request_id    BIGINT UNSIGNED  NOT NULL AUTO_INCREMENT PRIMARY KEY,
  employee_id   BIGINT UNSIGNED  NOT NULL,
  vacation_type VARCHAR(10)      NOT NULL COMMENT 'FULL | HALF_AM | HALF_PM',
  vacation_date DATE             NOT NULL,
  reason        VARCHAR(500)     NULL,
  status        VARCHAR(10)      NOT NULL DEFAULT 'PENDING' COMMENT 'PENDING | APPROVED | REJECTED',
  approved_by   BIGINT UNSIGNED  NULL,
  approved_at   DATETIME(3)      NULL,
  reject_reason VARCHAR(500)     NULL,
  created_at    DATETIME(3)      NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at    DATETIME(3)      NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  CONSTRAINT fk_vacation_employee FOREIGN KEY (employee_id) REFERENCES employee (employee_id) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_vacation_approver FOREIGN KEY (approved_by) REFERENCES employee (employee_id) ON DELETE SET NULL  ON UPDATE CASCADE,
  KEY idx_vacation_employee (employee_id, vacation_date),
  KEY idx_vacation_status   (status, vacation_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
