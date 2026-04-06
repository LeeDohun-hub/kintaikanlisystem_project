package com.kintai.repository;

import com.kintai.entity.Attendance;
import com.kintai.entity.Employee;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface AttendanceRepository extends JpaRepository<Attendance, Long> {
    List<Attendance> findByEmployeeOrderByWorkDateDesc(Employee employee);
    List<Attendance> findAllByOrderByWorkDateDesc();
}
