import { useEffect, useState } from "react";
import api from "../api/api";

/**
 * Admin only. Loads employee list for selectors.
 */
export function useEmployees(enabled = true) {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;
    setLoading(true);
    setError("");
    api
      .get("/employees")
      .then((r) => {
        if (!cancelled) setRows(r.data || []);
      })
      .catch(() => {
        if (!cancelled) {
          setRows([]);
          setError("従業員一覧を読み込めませんでした。");
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [enabled]);

  return { rows, loading, error };
}

