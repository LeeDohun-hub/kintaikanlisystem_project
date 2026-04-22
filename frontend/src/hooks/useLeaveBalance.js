import { useCallback, useEffect, useState } from "react";
import api from "../api/api";
import { getErrorMessage } from "../api/error";

/**
 * 年休残数（本人）。
 * GET /api/vacations/balance
 */
export function useLeaveBalance(skip = false) {
  const [balance, setBalance] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [tick, setTick] = useState(0);

  const refetch = useCallback(() => {
    setTick((t) => t + 1);
  }, []);

  useEffect(() => {
    if (skip) {
      setBalance(null);
      setLoading(false);
      setError("");
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError("");
    api.get("/vacations/balance")
      .then((res) => {
        if (!cancelled) setBalance(res.data || null);
      })
      .catch((err) => {
        if (!cancelled) {
          setBalance(null);
          setError(getErrorMessage(err, "残数を読み込めませんでした。"));
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [skip, tick]);

  return { balance, loading, error, refetch };
}

