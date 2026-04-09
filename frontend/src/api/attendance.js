import api from "./api";

export function importAttendanceExcel(file) {
  const form = new FormData();
  form.append("file", file);
  return api.post("/attendance/import", form, {
    headers: { "Content-Type": "multipart/form-data" },
  });
}
