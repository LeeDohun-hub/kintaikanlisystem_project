package com.kintai.repository;

import com.kintai.entity.EmployeeAccount;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface EmployeeAccountRepository extends JpaRepository<EmployeeAccount, Long> {

    Optional<EmployeeAccount> findByLoginId(String loginId);

    boolean existsByLoginId(String loginId);

    boolean existsByLoginIdAndEmployeeIdNot(String loginId, Long employeeId);
}
