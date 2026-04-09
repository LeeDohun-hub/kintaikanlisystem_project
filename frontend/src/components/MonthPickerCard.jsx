import React from "react";

export default function MonthPickerCard({ label, month, onChange }) {
  return (
    <div className="card" style={{ marginBottom: 16 }}>
      <label style={{ marginRight: 8 }}>{label}</label>
      <input
        type="month"
        value={month}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}
