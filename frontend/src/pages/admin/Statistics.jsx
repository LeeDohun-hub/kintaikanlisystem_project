import React, { useState, useEffect } from "react";
import api from "../../api/api";
import MonthPickerCard from "../../components/MonthPickerCard";
import { useYearMonthState } from "../../hooks/useYearMonthState";

function Statistics() {
  const [month, setMonth] = useYearMonthState();
  const [data, setData] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    setError("");
    api
      .get(`/statistics/monthly?month=${month}`)
      .then((res) => setData(res.data))
      .catch(() => {
        setData(null);
        setError("통계를 불러오지 못했습니다.");
      });
  }, [month]);

  return (
    <div className="page-container">
      <h2 className="page-title">통계</h2>

      <MonthPickerCard label="조회 월" month={month} onChange={setMonth} />

      <div style={{ margin: "8px 0 12px" }}>
        <button
          type="button"
          className="primary"
          onClick={() =>
            window.open(`/api/reports/monthly.pdf?month=${month}`, "_blank")
          }
        >
          월별 리포트 PDF 출력
        </button>
      </div>

      {error && <div className="error-msg">{error}</div>}

      <div className="card">
        {data ? (
          <pre style={{ fontSize: 13, overflow: "auto" }}>
            {JSON.stringify(data, null, 2)}
          </pre>
        ) : (
          !error && <p>데이터가 없습니다.</p>
        )}
      </div>
    </div>
  );
}

export default Statistics;
