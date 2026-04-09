import api from "./api";

export function listWorkTimeByMonth(month) {
  return api.get(`/worktime?month=${month}`);
}

export function createWorkTime(payload) {
  return api.post("/worktime", payload);
}

export function updateWorkTime(workId, payload) {
  return api.put(`/worktime/${workId}`, payload);
}

export function deleteWorkTime(workId) {
  return api.delete(`/worktime/${workId}`);
}
