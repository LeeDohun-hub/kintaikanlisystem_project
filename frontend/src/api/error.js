export function getErrorMessage(err, fallback = "リクエストに失敗しました。") {
  const msg = err?.response?.data?.error;
  if (typeof msg === "string" && msg.trim() !== "") return msg;
  return fallback;
}
