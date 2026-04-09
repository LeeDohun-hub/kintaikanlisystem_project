export function getErrorMessage(err, fallback = "요청에 실패했습니다.") {
  const msg = err?.response?.data?.error;
  if (typeof msg === "string" && msg.trim() !== "") return msg;
  return fallback;
}
