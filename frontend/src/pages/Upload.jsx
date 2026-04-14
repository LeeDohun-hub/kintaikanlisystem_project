import React, { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";
import KintaihyoImportCard from "../components/KintaihyoImportCard";
import BackToMenuLink from "../components/BackToMenuLink";
import { useEmployees } from "../hooks/useEmployees";
import EmployeePicker from "../components/EmployeePicker";

export default function Upload() {
  const { user } = useAuth();
  const isAdmin = user?.role === "ADMIN";
  const { rows: employees, loading: empLoading, error: empError } =
    useEmployees(isAdmin);
  const [employeeId, setEmployeeId] = useState("");

  useEffect(() => {
    if (!isAdmin) return;
    if (employeeId !== "" || employees.length === 0) return;
    setEmployeeId(employees[0].employeeId);
  }, [isAdmin, employees, employeeId]);

  return (
    <div className="page-container">
      <h2 className="page-title">アップロード</h2>
      <p className="page-subtitle">
        Excel をアップロードして勤怠データを取り込みます。
      </p>

      {isAdmin ? (
        <>
          {empError && <div className="error-msg">{empError}</div>}
          <EmployeePicker
            employees={employees}
            value={employeeId}
            onChange={setEmployeeId}
            disabled={empLoading}
            helper="管理者は社員を選択して、勤務表インポート（本人形式）を代行できます。"
          />

          <KintaihyoImportCard employeeId={employeeId} />
        </>
      ) : (
        <KintaihyoImportCard />
      )}

      <BackToMenuLink />
    </div>
  );
}

