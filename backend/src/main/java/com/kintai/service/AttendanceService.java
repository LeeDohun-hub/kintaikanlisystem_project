package com.kintai.service;

import com.kintai.dto.AttendanceRequest;
import com.kintai.dto.AttendanceResponse;
import com.kintai.entity.Attendance;
import com.kintai.entity.Employee;
import com.kintai.entity.Project;
import com.kintai.repository.AttendanceRepository;
import com.kintai.repository.EmployeeRepository;
import com.kintai.repository.ProjectRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.Comparator;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class AttendanceService {

    private final AttendanceRepository attendanceRepository;
    private final EmployeeRepository employeeRepository;
    private final ProjectRepository projectRepository;

    public List<AttendanceResponse> getMyAttendance(Long employeeId) {
        Employee employee = getEmployeeById(employeeId);
        return attendanceRepository.findByEmployeeOrderByWorkDateDesc(employee)
                .stream().map(this::toResponse).collect(Collectors.toList());
    }

    public List<AttendanceResponse> getMyAttendanceByMonth(Long employeeId, String month) {
        Employee employee = getEmployeeById(employeeId);
        return attendanceRepository.findByEmployeeOrderByWorkDateDesc(employee).stream()
                .filter(a -> a.getWorkDate().toString().startsWith(month))
                .map(this::toResponse).collect(Collectors.toList());
    }

    public List<AttendanceResponse> getAllAttendance() {
        return attendanceRepository.findAllByOrderByWorkDateDesc()
                .stream().map(this::toResponse).collect(Collectors.toList());
    }

    public List<AttendanceResponse> getAllAttendanceByMonth(String month) {
        return attendanceRepository.findAllByOrderByWorkDateDesc().stream()
                .filter(a -> a.getWorkDate().toString().startsWith(month))
                .map(this::toResponse).collect(Collectors.toList());
    }

    public AttendanceResponse createAttendance(Long employeeId, AttendanceRequest request) {
        Employee employee = getEmployeeById(employeeId);
        Project project = null;
        if (request.getProjectId() != null) {
            project = projectRepository.findById(request.getProjectId()).orElse(null);
        }

        Attendance attendance = Attendance.builder()
                .employee(employee)
                .workDate(request.getWorkDate())
                .startTime(request.getStartTime())
                .endTime(request.getEndTime())
                .breakMinutes(request.getBreakMinutes() != null ? request.getBreakMinutes() : 0)
                .workType(request.getWorkType() != null ? request.getWorkType() : Attendance.WorkType.NORMAL)
                .comment(request.getComment())
                .project(project)
                .build();

        return toResponse(attendanceRepository.save(attendance));
    }

    public AttendanceResponse updateAttendance(Long id, AttendanceRequest request) {
        Attendance attendance = attendanceRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Attendance not found: " + id));

        attendance.setWorkDate(request.getWorkDate());
        attendance.setStartTime(request.getStartTime());
        attendance.setEndTime(request.getEndTime());
        attendance.setBreakMinutes(request.getBreakMinutes() != null ? request.getBreakMinutes() : 0);
        if (request.getWorkType() != null) attendance.setWorkType(request.getWorkType());
        attendance.setComment(request.getComment());

        if (request.getProjectId() != null) {
            attendance.setProject(projectRepository.findById(request.getProjectId()).orElse(null));
        }

        return toResponse(attendanceRepository.save(attendance));
    }

    public void deleteAttendance(Long id) {
        attendanceRepository.deleteById(id);
    }

    private Employee getEmployeeById(Long id) {
        return employeeRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Employee not found: " + id));
    }

    private AttendanceResponse toResponse(Attendance a) {
        return AttendanceResponse.builder()
                .id(a.getId())
                .employeeId(a.getEmployee().getId())
                .employeeName(a.getEmployee().getName())
                .employeeCode(a.getEmployee().getEmployeeCode())
                .workDate(a.getWorkDate())
                .startTime(a.getStartTime())
                .endTime(a.getEndTime())
                .breakMinutes(a.getBreakMinutes())
                .workType(a.getWorkType() != null ? a.getWorkType().name() : null)
                .comment(a.getComment())
                .projectId(a.getProject() != null ? a.getProject().getId() : null)
                .projectName(a.getProject() != null ? a.getProject().getName() : null)
                .workHours(Math.round(a.getWorkHours() * 10.0) / 10.0)
                .build();
    }
}
