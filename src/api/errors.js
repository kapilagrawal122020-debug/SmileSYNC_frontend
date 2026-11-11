export class ApiError extends Error {
  constructor(status, data) {
    super(errorText(data, status));
    this.status = status;
    this.data = data;
    this.fields = data && typeof data === "object" ? data : {};
  }
}

// DRF errors come as {detail: "..."} or {field: ["msg"]}. Turn either into one readable line.
function errorText(data, status) {
  if (!data) return status ? `Request failed (${status})` : "Could not reach the server. Is the backend running?";
  if (typeof data === "string") return data;
  if (Array.isArray(data)) return data.join(" ");
  if (data.detail) return String(data.detail);
  const parts = Object.entries(data).map(([k, v]) => {
    const msg = Array.isArray(v) ? v.join(" ") : typeof v === "object" ? JSON.stringify(v) : String(v);
    return k === "non_field_errors" ? msg : `${k.replace(/_/g, " ")}: ${msg}`;
  });
  return parts.join("  ") || `Request failed (${status})`;
}
