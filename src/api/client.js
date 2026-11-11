// One place for every network call. Pages use api.get / api.post / ... and never care
// whether the data comes from the Django backend or from the in-browser demo.
import { mockRequest, resetMock } from "./mock";
import { ApiError } from "./errors";

const BASE = (import.meta.env.VITE_API_URL || "").replace(/\/$/, "");

const safe = {
  get: (k) => { try { return localStorage.getItem(k); } catch { return null; } },
  set: (k, v) => { try { localStorage.setItem(k, v); } catch { /* ignore */ } },
  del: (k) => { try { localStorage.removeItem(k); } catch { /* ignore */ } },
};
export { safe as storage };

export const isMock = () => {
  const v = safe.get("ss_mock");
  return v === null ? import.meta.env.VITE_USE_MOCK !== "false" : v === "true";
};
export const setMock = (on) => safe.set("ss_mock", String(on));
export { resetMock };

export const getToken = () => safe.get("ss_token");

export { ApiError };

let onUnauthorized = () => {};
export const setUnauthorizedHandler = (fn) => { onUnauthorized = fn; };

const clean = (params = {}) =>
  Object.fromEntries(Object.entries(params).filter(([, v]) => v !== "" && v !== null && v !== undefined));

async function request(method, path, { params, body } = {}) {
  const token = getToken();
  const isAuthCall = path.startsWith("/auth/login") || path.startsWith("/auth/otp") || path.startsWith("/auth/register");
  try {
    if (isMock()) return await mockRequest(method, path, { params: clean(params), body, token });

    const qs = new URLSearchParams(clean(params)).toString();
    const headers = {};
    if (token) headers.Authorization = `Token ${token}`;
    let payload;
    if (body instanceof FormData) payload = body;
    else if (body !== undefined) { headers["Content-Type"] = "application/json"; payload = JSON.stringify(body); }

    let res;
    try {
      res = await fetch(`${BASE}/api${path}${qs ? `?${qs}` : ""}`, { method, headers, body: payload });
    } catch {
      throw new ApiError(0, null);
    }
    if (res.status === 204) return null;
    const text = await res.text();
    let data = null;
    try { data = text ? JSON.parse(text) : null; } catch { data = null; } // e.g. an HTML error page: show a generic message instead
    if (!res.ok) throw new ApiError(res.status, data);
    return data;
  } catch (err) {
    if (err instanceof ApiError && err.status === 401 && !isAuthCall) onUnauthorized();
    throw err;
  }
}

export const api = {
  get: (path, params) => request("GET", path, { params }),
  post: (path, body) => request("POST", path, { body }),
  patch: (path, body) => request("PATCH", path, { body }),
  del: (path) => request("DELETE", path),
  // Lists are paginated (50 per page). Follow the pages and return one array.
  async list(path, params = {}) {
    let all = [];
    for (let page = 1; page <= 20; page++) {
      const data = await request("GET", path, { params: { ...params, page: page > 1 ? page : "" } });
      if (Array.isArray(data)) return data;
      all = all.concat(data.results || []);
      if (!data.next) break;
    }
    return all;
  },
};

// Uploaded files are served by authenticated endpoints, so an <img src> cannot fetch them.
// Download with the token and hand the browser a temporary blob URL instead.
export async function fetchFileUrl(url) {
  if (!url) return null;
  if (url.startsWith("data:") || url.startsWith("blob:") || isMock()) return url;
  const u = new URL(url, window.location.origin);
  const res = await fetch(`${BASE}${u.pathname}${u.search}`, { headers: { Authorization: `Token ${getToken()}` } });
  if (!res.ok) throw new ApiError(res.status, null);
  return URL.createObjectURL(await res.blob());
}

// ---- small formatting helpers used across pages ----
export const rupees = (n) => `₹${Number(n || 0).toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;
export const fmtDate = (iso) => (iso ? new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : "");
export const fmtTime = (iso) => (iso ? new Date(iso).toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit" }) : "");
export const fmtDateTime = (iso) => (iso ? `${fmtDate(iso)}, ${fmtTime(iso)}` : "");
export const todayStr = () => new Date().toLocaleDateString("en-CA"); // YYYY-MM-DD in local time
