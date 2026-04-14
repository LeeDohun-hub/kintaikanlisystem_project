import React, { useId } from "react";

export default function MonthPickerCard({ label, month, onChange, children }) {
  const inputId = useId();
  return (
    <div className="card month-picker-card">
      <div className="month-picker-card-row">
        <div className="month-picker-field">
          <label htmlFor={inputId}>{label}</label>
          <input
            id={inputId}
            type="month"
            value={month}
            onChange={(e) => onChange(e.target.value)}
          />
        </div>
        {children ? <div className="month-picker-actions">{children}</div> : null}
      </div>
    </div>
  );
}
