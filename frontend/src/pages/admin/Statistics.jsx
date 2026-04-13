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
        setError("統計を読み込めませんでした。");
      });
  }, [month]);

  return (
    <div className="page-container">
      <h2 className="page-title">統計</h2>

      <MonthPickerCard label="表示月" month={month} onChange={setMonth} />

      <div style={{ margin: "8px 0 12px" }}>
        <button
          type="button"
          className="primary"
          onClick={() =>
            window.open(`/api/reports/monthly.pdf?month=${month}`, "_blank")
          }
        >
          月次レポート PDF
        </button>
      </div>

      {error && <div className="error-msg">{error}</div>}

      <div className="card">
        {data ? (
          <pre style={{ fontSize: 13, overflow: "auto" }}>
            {JSON.stringify(data, null, 2)}
          </pre>
        ) : (
          !error && <p>データがありません。</p>
        )}
      </div>
    </div>
  );
}

export default Statistics;
