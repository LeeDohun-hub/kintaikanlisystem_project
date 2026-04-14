import React, { useState } from "react";
import { importKintaihyo } from "../api/attendance";
import { getErrorMessage } from "../api/error";

function uploadFileChangedMessage(err) {
  const s = `${err?.code || ""} ${err?.message || ""} ${err?.cause?.message || ""}`;
  if (s.includes("UPLOAD_FILE_CHANGED") || s.includes("ERR_UPLOAD_FILE_CHANGED")) {
    return "Excel を保存した後は、必ずファイルを選び直してから「保存」を押してください。（ブラウザがディスク上の変更を検知するとアップロードが中断されることがあります。）";
  }
  return null;
}

export default function KintaihyoImportCard({ employeeId }) {
  /** アップロード直前にメモリへ固定したコピー — 保存後にディスクのみ変わった場合でも送信可能 */
  const [fileSnapshot, setFileSnapshot] = useState(null);
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const onFileChange = async (e) => {
    const f = e.target.files?.[0];
    setResult(null);
    setError("");
    if (!f) {
      setFileSnapshot(null);
      return;
    }
    try {
      const ab = await f.arrayBuffer();
      const blob = new Blob([ab], {
        type:
          f.type ||
          (f.name?.toLowerCase().endsWith(".csv")
            ? "text/csv"
            : "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"),
      });
      setFileSnapshot({ blob, name: f.name });
    } catch {
      setFileSnapshot(null);
      setError(
        "ファイルを読み取れません。Excel を他のアプリで閉じてから選び直してください。",
      );
    }
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setResult(null);
    if (!fileSnapshot) {
      setError("勤務表ファイル（.xlsx / .csv）を選択してください。");
      return;
    }
    setLoading(true);
    try {
      const res = await importKintaihyo(
        fileSnapshot.blob,
        fileSnapshot.name,
        employeeId,
      );
      setResult(res.data);
    } catch (err) {
      const hint = uploadFileChangedMessage(err);
      setError(
        hint ||
          getErrorMessage(err, "インポートに失敗しました。"),
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {error && <div className="error-msg">{error}</div>}

      <div className="card" style={{ marginBottom: 16 }}>
        <h3 style={{ marginTop: 0 }}>勤務表インポート</h3>
        <form onSubmit={onSubmit}>
          <div className="form-row" style={{ alignItems: "center", gap: 12 }}>
            <input
              type="file"
              accept=".xlsx,.xls,.csv"
              onChange={onFileChange}
              required
            />
            <button type="submit" className="primary" disabled={loading}>
              {loading ? "処理中…" : "保存"}
            </button>
          </div>
          {fileSnapshot && (
            <p style={{ marginTop: 8, fontSize: 12, color: "#555" }}>
              選択中: {fileSnapshot.name}（アップロード時点のコピーを送ります。Excel
              で保存し直した場合は、もう一度ファイルを選び直してください。）
            </p>
          )}
          <p style={{ marginTop: 10, fontSize: 13, color: "#666" }}>
            202604_勤務表(氏名).xlsx 形式、または CSV（UTF-8, ヘッダあり）のファイルを選択し、「保存」を押してください。
            出勤・退勤が入力されている日のみ勤務履歴に登録されます。同一勤務日のデータがある場合は、Excel
            の内容で上書き更新します。
          </p>
        </form>
      </div>

      {result && (
        <div className="card">
          <h3 style={{ marginTop: 0 }}>取込結果</h3>
          {result.successCount === 0 && (
            <div className="error-msg" style={{ marginBottom: 12 }}>
              登録された勤務がありません。下記の案内・エラーを確認するか、勤務表テンプレート形式かご確認ください。
            </div>
          )}
          <p>
            <strong>成功:</strong> {result.successCount}件 &nbsp;/&nbsp;
            <strong>失敗:</strong> {result.errorCount}件
            {result.updatedExistingDays > 0 && (
              <>
                {" "}
                / <strong>既存日の更新:</strong> {result.updatedExistingDays}件
              </>
            )}
          </p>
          {result.updatedExistingDays > 0 && (
            <p style={{ color: "#1565c0", marginTop: 8 }}>
              既に登録されていた勤務日 {result.updatedExistingDays}
              件を、Excel の出勤・退勤・休憩・備考で更新しました。
            </p>
          )}
          {result.successCount > 0 && result.errorCount === 0 && (
            <p style={{ color: "#2e7d32" }}>勤務履歴に反映しました。</p>
          )}
          {result.errors?.length > 0 && (
            <div style={{ marginTop: 12 }}>
              <h4 style={{ margin: "0 0 8px" }}>エラー内容</h4>
              <ul style={{ paddingLeft: 20 }}>
                {result.errors.map((e, idx) => (
                  <li key={idx} style={{ color: "#c62828" }}>
                    {e.row > 0 ? `行 ${e.row}: ` : ""}{e.message}
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
