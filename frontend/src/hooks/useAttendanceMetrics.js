import { useState, useEffect, useCallback } from "react";
import { fetchAttendanceMetrics } from "../api/worktime";
import { getErrorMessage } from "../api/error";

/**
 * @param {string} month YYYY-MM
 * @param {number|string|undefined} employeeId 管理者のみ
 * @param {boolean} skip
 */
export function useAttendanceMetrics(month, employeeId, skip = false) {
  const [metrics, setMetrics] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [tick, setTick] = useState(0);

  const refetch = useCallback(() => {
    setTick((t) => t + 1);
  }, []);

  useEffect(() => {
    if (skip) {
      setMetrics(null);
      setError("");
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError("");
    fetchAttendanceMetrics(month, employeeId)
      .then((res) => {
        if (!cancelled) setMetrics(res.data || null);
      })
      .catch((err) => {
        if (!cancelled) {
          setMetrics(null);
          setError(getErrorMessage(err, "指標を読み込めませんでした。"));
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [month, employeeId, skip, tick]);

  return { metrics, loading, error, refetch };
}
