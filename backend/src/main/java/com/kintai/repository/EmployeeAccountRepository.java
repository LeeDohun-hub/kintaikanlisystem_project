package com.kintai.repository;

import com.kintai.entity.EmployeeAccount;
import org.springframework.data.jpa.repository.JpaRepository;

public interface EmployeeAccountRepository extends JpaRepository<EmployeeAccount, Long> {
}
