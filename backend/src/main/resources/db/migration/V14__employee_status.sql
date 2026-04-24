ALTER TABLE employee_account
    ADD COLUMN current_status VARCHAR(20) NOT NULL DEFAULT 'PRESENT';
