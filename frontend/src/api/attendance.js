import api from "./api";

export function importAttendanceExcel(file) {
  const form = new FormData();
  form.append("file", file);
  return api.post("/attendance/import", form);
}

/**
 * @param {Blob|File} fileOrBlob - File はディスク変更で ERR_UPLOAD_FILE_CHANGED が出ることがあるため、Blob スナップショット推奨
 * @param {string} [filename] - Blob のとき元ファイル名を渡すとサーバーログに反映されます。
 */
export function importKintaihyo(fileOrBlob, filename = "kintaihyo.xlsx", employeeId) {
  const form = new FormData();
  form.append("file", fileOrBlob, filename);
  const params = {};
  if (employeeId != null && employeeId !== "") params.employeeId = employeeId;
  return api.post("/worktime/import-kintaihyo", form, { params });
}
