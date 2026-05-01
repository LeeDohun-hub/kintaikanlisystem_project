import axios from "axios";

const api = axios.create({
  baseURL: "/api",
  withCredentials: true,
});

/**
 * FormData: axios XHR 어댑터와 동일하게 Content-Type 을 비활성화해 브라우저가 boundary 포함 multipart 를 붙이게 함.
 * (instanceof FormData 만으로는 iframe/폴리필에서 누락될 수 있어 append + toStringTag 로 보강)
 */
function isFormDataLike(data) {
  if (data == null || typeof data !== "object") return false;
  if (typeof FormData !== "undefined" && data instanceof FormData) return true;
  if (typeof data.append !== "function") return false;
  if (data[Symbol.toStringTag] === "FormData") return true;
  return Object.prototype.toString.call(data) === "[object FormData]";
}

function clearContentType(headers) {
  if (typeof headers.setContentType === "function") {
    headers.setContentType(false);
  } else if (typeof headers.delete === "function") {
    headers.delete("Content-Type");
    headers.delete("content-type");
  } else {
    delete headers["Content-Type"];
    delete headers["content-type"];
  }
}

api.interceptors.request.use((config) => {
  const { data, headers } = config;
  if (!headers) return config;

  if (isFormDataLike(data)) {
    clearContentType(headers);
    return config;
  }

  const method = (config.method || "get").toLowerCase();
  const mutatesBody = method === "post" || method === "put" || method === "patch";

  const isJsonSerializableObject =
    data != null &&
    typeof data === "object" &&
    !(data instanceof URLSearchParams) &&
    !(data instanceof Blob) &&
    !(data instanceof ArrayBuffer) &&
    !(typeof File !== "undefined" && data instanceof File) &&
    !(typeof FileList !== "undefined" && data instanceof FileList);

  if (mutatesBody && isJsonSerializableObject) {
    if (typeof headers.set === "function") {
      headers.set("Content-Type", "application/json");
    } else {
      headers["Content-Type"] = "application/json";
    }
    return config;
  }

  if (mutatesBody && typeof data === "string") {
    if (typeof headers.set === "function") {
      headers.set("Content-Type", "application/json");
    } else {
      headers["Content-Type"] = "application/json";
    }
  }

  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      const url = `${error.config?.baseURL || ""}${error.config?.url || ""}`;
      const skipRedirect =
        url.includes("/auth/me") ||
        url.includes("/auth/login");
      if (!skipRedirect) {
        window.location.href = "/login";
      }
    }
    return Promise.reject(error);
  },
);

export default api;
