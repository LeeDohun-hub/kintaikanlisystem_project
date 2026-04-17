import React, { useRef, useState } from "react";
import * as XLSX from "xlsx";
import { importKintaihyo } from "../api/attendance";
import { getErrorMessage } from "../api/error";

const PREVIEW_MAX_ROWS = 100;
const PREVIEW_MAX_COLS = 30;

/** Excel(Windows) 日付シリアルと Unix 日付の対応に使う定数（1970-01-01 = 25569） */
const EXCEL_UNIX_EPOCH_OFFSET = 25569;
const MS_PER_DAY = 86400000;

/** 0〜1 未満: 1日の端数としての時刻（バックエンドの readKintaihyoTime と同趣旨） */
function formatExcelTimeFraction(v) {
  const secs = Math.round(v * 86400);
  const hh = Math.floor(secs / 3600);
  const mi = Math.floor((secs % 3600) / 60);
  return `${String(hh).padStart(2, "0")}:${String(mi).padStart(2, "0")}`;
}

/**
 * 勤務表で多い「日付が数値シリアル」の列向け（例: 46113）。累計など 2.625 のような値は対象外。
 */
function formatLikelyExcelDateSerial(v) {
  const whole = Math.floor(v);
  const frac = v - whole;
  if (whole < 20000 || whole > 120000) return null;
  const utcMs = (whole - EXCEL_UNIX_EPOCH_OFFSET) * MS_PER_DAY;
  const datePart = new Date(utcMs);
  if (Number.isNaN(datePart.getTime())) return null;
  const y = datePart.getUTCFullYear();
  const m = String(datePart.getUTCMonth() + 1).padStart(2, "0");
  const d = String(datePart.getUTCDate()).padStart(2, "0");
  if (frac < 1e-8) return `${y}-${m}-${d}`;
  return `${y}-${m}-${d} ${formatExcelTimeFraction(frac)}`;
}

/** 「4月1日(火)」「4月1日（水）」の括弧内（曜日）を表示から除く（取込ロジックと揃える） */
function stripParentheticalsAfterJapaneseMonthDay(s) {
  if (typeof s !== "string") return s;
  return s.replace(
    /(\d{1,2}月\d{1,2}日)(\s*[\(（][^)）]*[\)）])+/g,
    "$1",
  );
}

/** プレビュー用: Excel が内部で持つ数値を画面表示向けにする */
function formatPreviewCellValue(v) {
  if (v === null || v === undefined) return "";
  if (typeof v === "string") return stripParentheticalsAfterJapaneseMonthDay(v);
  if (typeof v === "boolean") return v ? "TRUE" : "FALSE";
  if (v instanceof Date) {
    const y = v.getFullYear();
    const m = String(v.getMonth() + 1).padStart(2, "0");
    const d = String(v.getDate()).padStart(2, "0");
    const hh = String(v.getHours()).padStart(2, "0");
    const mi = String(v.getMinutes()).padStart(2, "0");
    if (
      v.getHours() === 0 &&
      v.getMinutes() === 0 &&
      v.getSeconds() === 0 &&
      v.getMilliseconds() === 0
    ) {
      return `${y}-${m}-${d}`;
    }
    return `${y}-${m}-${d} ${hh}:${mi}`;
  }
  if (typeof v === "number" && Number.isFinite(v)) {
    if (v >= 0 && v < 1) return formatExcelTimeFraction(v);
    const dateStr = formatLikelyExcelDateSerial(v);
    if (dateStr != null) return dateStr;
    return String(v);
  }
  return String(v);
}

/**
 * @param {ArrayBuffer} ab
 * @param {string} filename
 * @param {number} sheetIndex
 */
function buildPreviewData(ab, filename, sheetIndex = 0) {
  const lower = (filename || "").toLowerCase();
  let workbook;
  if (lower.endsWith(".csv")) {
    const text = new TextDecoder("utf-8", { fatal: false }).decode(ab);
    workbook = XLSX.read(text, { type: "string" });
  } else {
    workbook = XLSX.read(ab, { type: "array", cellDates: true });
  }
  if (!workbook.SheetNames?.length) {
    return {
      sheetNames: [],
      activeIndex: 0,
      rows: [],
      rowTruncated: false,
      colTruncated: false,
      totalSheets: 0,
    };
  }
  const idx = Math.min(
    Math.max(0, sheetIndex),
    workbook.SheetNames.length - 1,
  );
  const sheetName = workbook.SheetNames[idx];
  const sheet = workbook.Sheets[sheetName];
  const raw = XLSX.utils.sheet_to_json(sheet, {
    header: 1,
    defval: "",
    raw: false,
  });
  const totalDataRows = raw.length;
  const sliced = raw.slice(0, PREVIEW_MAX_ROWS);
  let maxLen = 0;
  for (const r of sliced) {
    if (Array.isArray(r)) maxLen = Math.max(maxLen, r.length);
  }
  const maxCol = Math.min(PREVIEW_MAX_COLS, Math.max(maxLen, 1));
  const colTruncated = maxLen > PREVIEW_MAX_COLS;
  const rows = sliced.map((r) => {
    const arr = Array.isArray(r) ? r : [];
    const cells = [];
    for (let c = 0; c < maxCol; c++) {
      const v = arr[c];
      cells.push(formatPreviewCellValue(v));
    }
    return cells;
  });
  return {
    sheetNames: [...workbook.SheetNames],
    activeIndex: idx,
    rows,
    rowTruncated: totalDataRows > PREVIEW_MAX_ROWS,
    colTruncated,
    totalSheets: workbook.SheetNames.length,
  };
}

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
  const [preview, setPreview] = useState(null);
  const [previewError, setPreviewError] = useState("");
  const [previewLoading, setPreviewLoading] = useState(false);
  const previewBufferRef = useRef(null);

  const onFileChange = async (e) => {
    const f = e.target.files?.[0];
    setResult(null);
    setError("");
    setPreview(null);
    setPreviewError("");
    previewBufferRef.current = null;
    if (!f) {
      setFileSnapshot(null);
      return;
    }
    try {
      const ab = await f.arrayBuffer();
      previewBufferRef.current = ab;
      const blob = new Blob([ab], {
        type:
          f.type ||
          (f.name?.toLowerCase().endsWith(".csv")
            ? "text/csv"
            : "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"),
      });
      setFileSnapshot({ blob, name: f.name });
      setPreviewLoading(true);
      try {
        const data = buildPreviewData(ab, f.name, 0);
        setPreview(data);
      } catch {
        setPreview(null);
        setPreviewError(
          "プレビューを表示できませんでした。（ファイルは選択済みです。取込は試せます。）",
        );
      } finally {
        setPreviewLoading(false);
      }
    } catch {
      setFileSnapshot(null);
      setPreview(null);
      setError(
        "ファイルを読み取れません。Excel を他のアプリで閉じてから選び直してください。",
      );
    }
  };

  const onPreviewSheetChange = (e) => {
    const idx = Number(e.target.value);
    const ab = previewBufferRef.current;
    const name = fileSnapshot?.name;
    if (!ab || !name || Number.isNaN(idx)) return;
    setPreviewError("");
    setPreviewLoading(true);
    try {
      setPreview(buildPreviewData(ab, name, idx));
    } catch {
      setPreview(null);
      setPreviewError(
        "シートのプレビューを表示できませんでした。",
      );
    } finally {
      setPreviewLoading(false);
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
          {previewLoading && (
            <p style={{ marginTop: 8, fontSize: 13, color: "#555" }}>
              プレビューを読み込み中…
            </p>
          )}
          {previewError && (
            <div className="error-msg" style={{ marginTop: 10 }}>
              {previewError}
            </div>
          )}
          {preview && preview.totalSheets > 0 && !previewLoading && (
            <div style={{ marginTop: 14 }}>
              <div
                style={{
                  display: "flex",
                  flexWrap: "wrap",
                  alignItems: "center",
                  gap: 10,
                  marginBottom: 8,
                }}
              >
                <strong style={{ fontSize: 14 }}>プレビュー</strong>
                {preview.sheetNames.length > 1 ? (
                  <label style={{ fontSize: 13, display: "flex", gap: 6, alignItems: "center" }}>
                    <span style={{ color: "#555" }}>シート</span>
                    <select
                      value={preview.activeIndex}
                      onChange={onPreviewSheetChange}
                      style={{ minWidth: 180, padding: "4px 8px" }}
                    >
                      {preview.sheetNames.map((sn, i) => (
                        <option key={`${i}-${sn}`} value={i}>
                          {sn}
                        </option>
                      ))}
                    </select>
                  </label>
                ) : null}
                <span style={{ fontSize: 12, color: "#666" }}>
                  先頭 {PREVIEW_MAX_ROWS} 行・{PREVIEW_MAX_COLS} 列まで表示
                  {preview.rowTruncated || preview.colTruncated
                    ? "（省略あり）"
                    : ""}
                  。xlsx の日付・時刻は内部が数値のため、プレビューでは読みやすい形式に変換しています（取込は従来どおり xlsx / csv 対応）。
                </span>
              </div>
              <div
                style={{
                  maxHeight: 360,
                  overflow: "auto",
                  border: "1px solid #ddd",
                  borderRadius: 4,
                  background: "#fafafa",
                }}
              >
                {preview.rows.length === 0 ? (
                  <p style={{ margin: 12, fontSize: 13, color: "#666" }}>
                    表示できるデータ行がありません。
                  </p>
                ) : (
                  <table
                    className="data-table"
                    style={{
                      margin: 0,
                      fontSize: 12,
                      whiteSpace: "nowrap",
                      minWidth: "100%",
                    }}
                  >
                    <tbody>
                      {preview.rows.map((row, ri) => (
                        <tr key={ri}>
                          <td
                            style={{
                              width: 40,
                              textAlign: "right",
                              color: "#888",
                              background: "#f0f0f0",
                              position: "sticky",
                              left: 0,
                              zIndex: 1,
                              borderRight: "1px solid #ddd",
                            }}
                          >
                            {ri + 1}
                          </td>
                          {row.map((cell, ci) => (
                            <td key={ci} title={cell}>
                              {cell}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
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
