import React, { useState } from "react";
import { importAttendanceExcel } from "../api/attendance";
import { getErrorMessage } from "../api/error";

export default function AttendanceImportCard({
  title = "Excel Import",
  helperText,
}) {
  const [file, setFile] = useState(null);
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const onSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setResult(null);
    if (!file) {
      setError("取り込む Excel ファイルを選択してください。");
      return;
    }
    setLoading(true);
    try {
      const res = await importAttendanceExcel(file);
      setResult(res.data);
    } catch (err) {
      setError(getErrorMessage(err, "Excel のアップロードに失敗しました。"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {error && <div className="error-msg">{error}</div>}

      <div className="card" style={{ marginBottom: 16 }}>
        <h3 style={{ marginTop: 0 }}>{title}</h3>
        <form onSubmit={onSubmit}>
          <div className="form-row">
            <input
              type="file"
              accept=".xlsx,.xls"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
              required
            />
            <button type="submit" className="primary" disabled={loading}>
              {loading ? "処理中…" : "取込"}
            </button>
          </div>
          {helperText && (
            <p style={{ marginTop: 10, fontSize: 13, color: "#666" }}>
              {helperText}
            </p>
          )}
        </form>
      </div>

      {result && (
        <div className="card">
          <h3 style={{ marginTop: 0 }}>結果</h3>
          {result.successCount === 0 && (
            <div className="error-msg" style={{ marginBottom: 12 }}>
              登録された行がないか、すべて失敗しました。下記のエラーと列形式（A〜F）をご確認ください。
            </div>
          )}
          <p>
            <strong>成功:</strong> {result.successCount}件 /{" "}
            <strong>失敗:</strong> {result.errorCount}件
          </p>
          {result.errors?.length > 0 && (
            <div style={{ marginTop: 12 }}>
              <h4 style={{ margin: 0 }}>エラー行</h4>
              <ul>
                {result.errors.map((e, idx) => (
                  <li key={idx}>
                    Row {e.row}: {e.message}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </>
  );
}
