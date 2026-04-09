import { useState, useEffect, useCallback } from "react";
import { listWorkTimeByMonth } from "../api/worktime";

/**
 * @param {string} month — YYYY-MM
 */
export function useWorkTimeByMonth(month) {
  const [rows, setRows] = useState([]);
  const [error, setError] = useState("");
  const [tick, setTick] = useState(0);

  const refetch = useCallback(() => {
    setTick((t) => t + 1);
  }, []);

  useEffect(() => {
    setError("");
    listWorkTimeByMonth(month)
      .then((res) => setRows(res.data || []))
      .catch(() => {
        setRows([]);
        setError("데이터를 불러오지 못했습니다.");
      });
  }, [month, tick]);

  return { rows, error, refetch };
}
