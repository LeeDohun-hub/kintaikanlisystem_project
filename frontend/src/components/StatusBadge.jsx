import React from "react";

const STATUS_MAP = {
  PRESENT:  { label: "在席",  color: "#16a34a", bg: "#dcfce7" },
  ABSENT:   { label: "退勤",  color: "#6b7280", bg: "#f3f4f6" },
  VACATION: { label: "休暇",  color: "#2563eb", bg: "#dbeafe" },
  OUTING:        { label: "外出",  color: "#d97706", bg: "#fef3c7" },
  BUSINESS_TRIP: { label: "出張",  color: "#7c3aed", bg: "#ede9fe" },
};

export default function StatusBadge({ status, size = "sm" }) {
  const s = STATUS_MAP[status] ?? STATUS_MAP.PRESENT;
  const isLg = size === "lg";
  return (
    <span
      style={{
        display: "inline-block",
        padding: isLg ? "3px 10px" : "1px 7px",
        borderRadius: 12,
        fontSize: isLg ? 13 : 11,
        fontWeight: 700,
        color: s.color,
        background: s.bg,
        border: `1px solid ${s.color}33`,
        lineHeight: 1.4,
        whiteSpace: "nowrap",
      }}
    >
      {s.label}
    </span>
  );
}
