import { ROLES } from "../auth/AuthContext";
import { isMock, setMock, resetMock, storage } from "../api/client";

export function AuthShell({ title, subtitle, children }) {
  return (
    <div className="auth">
      <aside className="auth-side">
        <div className="brand big"><span className="logo">S</span> SmileSYNC</div>
        <h2>One simple system for your dental clinic.</h2>
        <ul>
          <li>Patient records, X-rays and photos in one place</li>
          <li>Photo-verified chair hygiene</li>
          <li>Stock that deducts itself after each treatment</li>
          <li>WhatsApp reminders and reviews</li>
        </ul>
        <p className="muted-light">Built for clinics in India.</p>
      </aside>
      <main className="auth-main">
        <div className="auth-card">
          <h1>{title}</h1>
          {subtitle && <p className="muted">{subtitle}</p>}
          {children}
          <ModeSwitch />
        </div>
      </main>
    </div>
  );
}

export function RolePicker({ value, onChange }) {
  return (
    <div className="roles" role="radiogroup" aria-label="Select your role">
      {ROLES.map((r) => (
        <button
          type="button" key={r.id} role="radio" aria-checked={value === r.id}
          className={`role ${value === r.id ? "on" : ""}`} onClick={() => onChange(r.id)}
        >
          <b>{r.label}</b>
          <span>{r.hint}</span>
        </button>
      ))}
    </div>
  );
}

// Lets you flip between the built-in sample data and the real backend without a rebuild.
function ModeSwitch() {
  const mock = isMock();
  const flip = () => {
    setMock(!mock);
    storage.del("ss_token");
    storage.del("ss_user");
    window.location.reload();
  };
  return (
    <div className="mode-switch">
      <label className="check">
        <input type="checkbox" checked={mock} onChange={flip} />
        <span>Demo mode (sample data, no backend needed)</span>
      </label>
      {mock && (
        <button type="button" className="link" onClick={() => { resetMock(); window.location.reload(); }}>
          Reset demo data
        </button>
      )}
    </div>
  );
}

export const cleanPhone = (v) => String(v || "").replace(/\D/g, "").slice(-10);
