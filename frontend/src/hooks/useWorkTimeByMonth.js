import { useState, useEffect, useCallback } from "react";
import { listWorkTimeByMonth } from "../api/worktime";

/**
 * @param {string} month — YYYY-MM
 * @param {number|string|undefined} [employeeId] — 管理者のみ指定可（本人フィルタ）
 * @param {boolean} [skip] — true のとき API を呼ばない（例: 管理者で未選択）
 */
export function useWorkTimeByMonth(month, employeeId, skip = false) {
  const [rows, setRows] = useState([]);
  const [error, setError] = useState("");
  const [tick, setTick] = useState(0);

  const refetch = useCallback(() => {
    setTick((t) => t + 1);
  }, []);

  useEffect(() => {
    if (skip) {
      setRows([]);
      setError("");
      return;
    }
    setError("");
    listWorkTimeByMonth(month, employeeId)
      .then((res) => setRows(res.data || []))
      .catch(() => {
        setRows([]);
        setError("データを読み込めませんでした。");
      });
  }, [month, employeeId, skip, tick]);

  return { rows, error, refetch };
}
