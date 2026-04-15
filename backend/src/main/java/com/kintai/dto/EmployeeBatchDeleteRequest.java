package com.kintai.dto;

import lombok.Data;

import java.util.ArrayList;
import java.util.List;

@Data
public class EmployeeBatchDeleteRequest {

    private List<Long> employeeIds = new ArrayList<>();
}
