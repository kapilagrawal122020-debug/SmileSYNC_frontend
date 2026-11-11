import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { fetchFileUrl } from "../api/client";

// ---- data loading ---------------------------------------------------------------------
// useLoad(() => api.list("/patients/"), [deps]) -> { data, loading, error, reload }
export function useLoad(fn, deps = []) {
  const [state, setState] = useState({ data: null, loading: true, error: "" });
  const fnRef = useRef(fn);
  fnRef.current = fn;
  const [tick, setTick] = useState(0);

  useEffect(() => {
    let live = true;
    setState((s) => ({ ...s, loading: true, error: "" }));
    fnRef.current()
      .then((data) => live && setState({ data, loading: false, error: "" }))
      .catch((e) => live && setState({ data: null, loading: false, error: e.message || "Something went wrong" }));
    return () => { live = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, tick]);

  const reload = useCallback(() => setTick((t) => t + 1), []);
  return { ...state, reload };
}

// ---- toast ------------------------------------------------------------------------------
const ToastCtx = createContext(() => {});
export const useToast = () => useContext(ToastCtx);

export function ToastProvider({ children }) {
  const [toast, setToast] = useState(null);
  const show = useCallback((message, tone = "ok") => {
    setToast({ message, tone, id: Date.now() });
  }, []);
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3500);
    return () => clearTimeout(t);
  }, [toast]);
  return (
    <ToastCtx.Provider value={show}>
      {children}
      {toast && <div className={`toast ${toast.tone}`} role="status">{toast.message}</div>}
    </ToastCtx.Provider>
  );
}

// ---- layout bits --------------------------------------------------------------------------
export function Page({ title, subtitle, actions, children }) {
  return (
    <div className="page">
      <div className="page-head">
        <div>
          <h1>{title}</h1>
          {subtitle && <p className="muted">{subtitle}</p>}
        </div>
        {actions && <div className="page-actions">{actions}</div>}
      </div>
      {children}
    </div>
  );
}

export const Card = ({ title, actions, children, className = "" }) => (
  <section className={`card ${className}`}>
    {(title || actions) && (
      <div className="card-head">
        {title && <h2>{title}</h2>}
        {actions && <div className="row gap">{actions}</div>}
      </div>
    )}
    {children}
  </section>
);

export const Stat = ({ label, value, tone }) => (
  <div className={`stat ${tone || ""}`}>
    <b>{value}</b>
    <span>{label}</span>
  </div>
);

export const Badge = ({ tone = "gray", children }) => <span className={`badge ${tone}`}>{children}</span>;

export const Empty = ({ children }) => <div className="empty">{children}</div>;
export const Loading = ({ text = "Loading…" }) => <div className="empty" aria-live="polite">{text}</div>;
export const ErrorNote = ({ message, onRetry }) => (
  <div className="note error" role="alert">
    {message}
    {onRetry && <button className="btn small ghost" onClick={onRetry}>Try again</button>}
  </div>
);

// Shows loading / error / empty states, then the children render-prop with the data.
export function Async({ state, empty, children }) {
  if (state.loading && !state.data) return <Loading />;
  if (state.error) return <ErrorNote message={state.error} onRetry={state.reload} />;
  if (Array.isArray(state.data) && state.data.length === 0) return <Empty>{empty || "Nothing here yet."}</Empty>;
  return children(state.data);
}

// ---- forms ----------------------------------------------------------------------------------
export function Field({ label, error, hint, children, className = "" }) {
  return (
    <label className={`field ${className}`}>
      <span className="label">{label}</span>
      {children}
      {hint && !error && <span className="hint">{hint}</span>}
      {error && <span className="err">{Array.isArray(error) ? error.join(" ") : String(error)}</span>}
    </label>
  );
}

export function Modal({ title, onClose, children, wide }) {
  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);
  return (
    <div className="overlay" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className={`modal ${wide ? "wide" : ""}`} role="dialog" aria-modal="true" aria-label={title}>
        <div className="modal-head">
          <h2>{title}</h2>
          <button className="icon-btn" onClick={onClose} aria-label="Close">×</button>
        </div>
        {children}
      </div>
    </div>
  );
}

// Handy submit wrapper: tracks busy state and field errors from the API.
export function useSubmit(action, onDone) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [fields, setFields] = useState({});

  // Errors are shown inline by each form (field errors plus a note), so no toast here.
  const submit = async (e) => {
    e?.preventDefault();
    setBusy(true); setError(""); setFields({});
    try {
      const res = await action();
      onDone?.(res);
    } catch (err) {
      setError(err.message || "Could not save");
      setFields(err.fields || {});
    } finally {
      setBusy(false);
    }
  };
  return { submit, busy, error, fields };
}

// ---- images from authenticated endpoints -----------------------------------------------------
export function SecureImage({ url, alt, className = "" }) {
  const [src, setSrc] = useState(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let live = true, made = null;
    setSrc(null); setFailed(false);
    if (!url) return undefined;
    fetchFileUrl(url)
      .then((u) => { if (!live) return; made = u; setSrc(u); })
      .catch(() => live && setFailed(true));
    return () => { live = false; if (made && made.startsWith("blob:")) URL.revokeObjectURL(made); };
  }, [url]);

  if (!url || failed) return <div className={`img-ph ${className}`}>{failed ? "Could not load" : "No preview"}</div>;
  if (!src) return <div className={`img-ph ${className}`}>…</div>;
  return <img className={className} src={src} alt={alt} />;
}

// Ask for a camera photo on phones, or pick a file on desktop.
export const FileInput = ({ onChange, accept = "image/*", capture, name }) => (
  <input className="input" type="file" name={name} accept={accept} capture={capture} onChange={(e) => onChange(e.target.files?.[0] || null)} />
);

// Build a body for the API: multipart only when a file is attached, JSON otherwise.
export function buildBody(values, fileField, file) {
  if (!file) return values;
  const fd = new FormData();
  Object.entries(values).forEach(([k, v]) => { if (v !== "" && v !== null && v !== undefined) fd.append(k, v); });
  fd.append(fileField, file);
  return fd;
}

export const STATUS_TONE = {
  booked: "blue", confirmed: "teal", reschedule: "amber", in_progress: "amber", completed: "green", cancelled: "gray", no_show: "red",
  ready: "green", in_use: "amber", locked: "red",
  pending: "amber", approved: "green", redo: "red",
  planned: "blue", done: "green",
  sent: "green", dry_run: "gray", failed: "red", skipped: "gray",
};
export const label = (s) => String(s || "").replace(/_/g, " ").replace(/^./, (c) => c.toUpperCase());
