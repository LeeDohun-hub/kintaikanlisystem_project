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
        setError("データを読み込めませんでした。");
      });
  }, [month, tick]);

  return { rows, error, refetch };
}
