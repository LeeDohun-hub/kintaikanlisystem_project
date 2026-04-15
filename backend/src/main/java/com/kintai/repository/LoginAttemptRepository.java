package com.kintai.repository;

import com.kintai.entity.LoginAttempt;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface LoginAttemptRepository extends JpaRepository<LoginAttempt, Long> {

    List<LoginAttempt> findAllByOrderByAttemptedAtDesc(Pageable pageable);
}
