import api from "./api";

export const updateMyStatus = (status) =>
  api.patch("/employees/me/status", { status });
