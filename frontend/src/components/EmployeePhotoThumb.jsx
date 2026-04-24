import React, { useState } from "react";

/**
 * 社員プロフィール写真（/api/employees/:id/photo）。未設定・読み込み失敗時はプレースホルダ。
 */
export default function EmployeePhotoThumb({ employeeId, photoFilename, size = 32 }) {
  const [broken, setBroken] = useState(false);
  if (!photoFilename || broken) {
    return (
      <span
        style={{
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          width: size,
          height: size,
          borderRadius: "50%",
          background: "#dde3ec",
          fontSize: size * 0.45,
          color: "#7f8c8d",
          flexShrink: 0,
        }}
      >
        {"\u{1F464}"}
      </span>
    );
  }
  return (
    <img
      src={`/api/employees/${employeeId}/photo`}
      alt=""
      onError={() => setBroken(true)}
      style={{
        width: size,
        height: size,
        borderRadius: "50%",
        objectFit: "cover",
        flexShrink: 0,
      }}
    />
  );
}
