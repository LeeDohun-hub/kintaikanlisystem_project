import api from "./api";

export function listWorkTimeByMonth(month, employeeId) {
  const qs = new URLSearchParams({ month });
  if (employeeId != null && employeeId !== "") qs.set("employeeId", String(employeeId));
  return api.get(`/worktime?${qs.toString()}`);
}

export function createWorkTime(payload, employeeId) {
  const params = {};
  if (employeeId != null && employeeId !== "") params.employeeId = employeeId;
  return api.post("/worktime", payload, { params });
}

export function bulkUpsertWorkTime(payload, employeeId) {
  const params = {};
  if (employeeId != null && employeeId !== "") params.employeeId = employeeId;
  return api.post("/worktime/bulk", payload, { params });
}

export function updateWorkTime(workId, payload, employeeId) {
  const params = {};
  if (employeeId != null && employeeId !== "") params.employeeId = employeeId;
  return api.put(`/worktime/${workId}`, payload, { params });
}

export function deleteWorkTime(workId, employeeId) {
  const params = {};
  if (employeeId != null && employeeId !== "") params.employeeId = employeeId;
  return api.delete(`/worktime/${workId}`, { params });
}
