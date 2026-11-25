import { useState } from "react";
import { api } from "../api/client";
import { Field, useLoad } from "../components/ui";

// Every screen that starts from a clinic (sign in, sign up) uses this to choose one from the marketplace.
export const useClinics = () => useLoad(() => api.get("/public/clinics/"), []);

const place = (c) => [c.city, c.state].filter(Boolean).join(", ");

export default function ClinicPicker({ value, onChange, error, label = "Your clinic" }) {
  const clinics = useClinics();
  const [q, setQ] = useState("");
  const all = clinics.data || [];
  const chosen = all.find((c) => c.id === Number(value));
  const needle = q.trim().toLowerCase();
  const shown = needle ? all.filter((c) => `${c.name} ${c.city} ${c.state}`.toLowerCase().includes(needle)) : all;

  if (chosen) {
    return (
      <Field label={label} error={error}>
        <div className="clinic-chosen">
          <div><b>{chosen.name}</b><div className="muted small">{place(chosen) || "Clinic"}</div></div>
          <button type="button" className="link" onClick={() => onChange(null)}>Change</button>
        </div>
      </Field>
    );
  }
  return (
    <Field label={label} error={error} hint={!clinics.loading && !clinics.error && !all.length ? "No clinic is listed yet." : "Clinics are added by the SmileSYNC team. Not listed? Ask us to add yours."}>
      <div className="clinic-find">
        {all.length > 6 && <input className="input" placeholder="Search by clinic name or city" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search clinics" />}
        {clinics.loading && <div className="muted small">Loading clinics…</div>}
        {clinics.error && <div className="note error" role="alert">{clinics.error}</div>}
        <div className="clinic-options" role="listbox" aria-label="Clinics">
          {shown.map((c) => (
            <button type="button" key={c.id} role="option" aria-selected="false" className="clinic-option" onClick={() => onChange(c.id)}>
              <b>{c.name}</b><span className="muted small">{place(c) || " "}</span>
            </button>
          ))}
          {!clinics.loading && all.length > 0 && shown.length === 0 && <div className="muted small">No clinic matches.</div>}
        </div>
      </div>
    </Field>
  );
}
