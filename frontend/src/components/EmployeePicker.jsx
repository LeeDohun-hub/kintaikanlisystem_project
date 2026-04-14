import React from "react";

export default function EmployeePicker({
  employees,
  value,
  onChange,
  label = "対象社員",
  disabled = false,
  helper,
}) {
  const list = Array.isArray(employees) ? employees : [];
  return (
    <div className="card" style={{ marginBottom: 16 }}>
      <div className="form-group" style={{ margin: 0 }}>
        <label htmlFor="employee-picker">{label}</label>
        <select
          id="employee-picker"
          value={value ?? ""}
          onChange={(e) => onChange(e.target.value === "" ? "" : Number(e.target.value))}
          disabled={disabled}
        >
          <option value="">選択してください</option>
          {list.map((e) => (
            <option key={e.employeeId} value={e.employeeId}>
              {e.employeeCode} - {e.employeeName}
            </option>
          ))}
        </select>
        {helper ? (
          <div style={{ marginTop: 6, fontSize: 12, color: "#7f8c8d" }}>
            {helper}
          </div>
        ) : null}
      </div>
    </div>
  );
}

