import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { api, fmtDate } from "../api/client";
import { useAuth } from "../auth/AuthContext";
import { Async, Badge, Card, Field, FileInput, Modal, Page, buildBody, useLoad, useSubmit, useToast } from "../components/ui";

export const LANGUAGES = [
  ["en", "English"], ["hi", "Hindi"], ["mr", "Marathi"], ["gu", "Gujarati"], ["ta", "Tamil"],
  ["te", "Telugu"], ["kn", "Kannada"], ["ml", "Malayalam"], ["bn", "Bengali"], ["pa", "Punjabi"],
];

export default function Patients() {
  const [params, setParams] = useSearchParams();
  const [q, setQ] = useState("");
  const [creating, setCreating] = useState(params.get("new") === "1");
  const nav = useNavigate();
  const list = useLoad(() => api.list("/patients/", { search: q }), [q]);

  const close = () => { setCreating(false); if (params.get("new")) setParams({}); };

  return (
    <Page title="Patients" subtitle="Search by name or phone number." actions={<button className="btn primary" onClick={() => setCreating(true)}>+ Register patient</button>}>
      <input className="input search" type="search" placeholder="Search name or phone…" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search patients" />
      <Card>
        <Async state={list} empty={q ? "No patient matches that search." : "No patients yet. Register the first one."}>
          {(rows) => (
            <div className="table-wrap">
              <table className="table">
                <thead><tr><th>Name</th><th>Phone</th><th>Locality</th><th>Complaint</th><th>Registered</th></tr></thead>
                <tbody>
                  {rows.map((p) => (
                    <tr key={p.id} className="click" onClick={() => nav(`/patients/${p.id}`)}>
                      <td><Link to={`/patients/${p.id}`}><b>{p.name}</b></Link></td>
                      <td className="mono">{p.phone}</td>
                      <td>{p.locality || "–"}</td>
                      <td className="clip">{p.chief_complaint || "–"}</td>
                      <td>{fmtDate(p.created_at)} {p.consent_whatsapp && <Badge tone="teal">WhatsApp</Badge>}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Async>
      </Card>
      {creating && (
        <Modal title="Register patient" onClose={close} wide>
          <PatientForm onCancel={close} onSaved={(p) => { close(); nav(`/patients/${p.id}`); }} />
        </Modal>
      )}
    </Page>
  );
}

// Used for both registering (no `initial`) and editing (`initial` is the patient).
export function PatientForm({ initial, onSaved, onCancel }) {
  const { user } = useAuth();
  const toast = useToast();
  const editing = !!initial;
  const [v, setV] = useState({
    name: initial?.name || "", phone: initial?.phone || "", locality: initial?.locality || "",
    chief_complaint: initial?.chief_complaint || "", medical_history: initial?.medical_history || "", dental_history: initial?.dental_history || "",
    language: initial?.language || "en", consent_data: initial?.consent_data || false, consent_whatsapp: initial?.consent_whatsapp || false,
    private_notes: initial?.private_notes || "",
  });
  const [selfie, setSelfie] = useState(null);
  const set = (k) => (e) => setV((s) => ({ ...s, [k]: e.target.type === "checkbox" ? e.target.checked : e.target.value }));

  const { submit, busy, error, fields } = useSubmit(() => {
    const values = { ...v, phone: v.phone.replace(/\D/g, "").slice(-10) };
    if (user.role !== "doctor") delete values.private_notes;
    if (editing) delete values.phone;
    const body = buildBody(values, "selfie", selfie);
    return editing ? api.patch(`/patients/${initial.id}/`, body) : api.post("/patients/", body);
  }, (p) => { toast(editing ? "Patient updated" : "Patient registered"); onSaved(p); });

  return (
    <form onSubmit={submit} className="form" noValidate>
      <div className="grid2">
        <Field label="Full name" error={fields.name}><input className="input" value={v.name} onChange={set("name")} required autoFocus /></Field>
        <Field label="Mobile number" error={fields.phone} hint={editing ? "Cannot be changed" : "Used as the patient's ID"}>
          <input className="input" inputMode="numeric" value={v.phone} onChange={set("phone")} disabled={editing} required />
        </Field>
      </div>
      <div className="grid2">
        <Field label="Locality" error={fields.locality}><input className="input" value={v.locality} onChange={set("locality")} /></Field>
        <Field label="Preferred language" error={fields.language}>
          <select className="input" value={v.language} onChange={set("language")}>{LANGUAGES.map(([c, n]) => <option key={c} value={c}>{n}</option>)}</select>
        </Field>
      </div>
      <Field label="Chief complaint" error={fields.chief_complaint}><textarea className="input" rows={2} value={v.chief_complaint} onChange={set("chief_complaint")} /></Field>
      <div className="grid2">
        <Field label="Medical history" error={fields.medical_history}><textarea className="input" rows={2} value={v.medical_history} onChange={set("medical_history")} /></Field>
        <Field label="Dental history" error={fields.dental_history}><textarea className="input" rows={2} value={v.dental_history} onChange={set("dental_history")} /></Field>
      </div>
      {!editing && (
        <Field label="Selfie (optional)" error={fields.selfie}><FileInput capture="user" onChange={setSelfie} /></Field>
      )}
      {user.role === "doctor" && (
        <Field label="Private notes" hint="Only you can see these (discount, behaviour…)" error={fields.private_notes}>
          <textarea className="input" rows={2} value={v.private_notes} onChange={set("private_notes")} />
        </Field>
      )}

      <div className="stack">
        <label className="check">
          <input type="checkbox" checked={v.consent_data} onChange={set("consent_data")} disabled={editing && initial.consent_data} />
          <span>Patient consents to storing their health data (DPDP Act). <em>Required</em></span>
        </label>
        {fields.consent_data && <span className="err">{String(fields.consent_data)}</span>}
        <label className="check">
          <input type="checkbox" checked={v.consent_whatsapp} onChange={set("consent_whatsapp")} />
          <span>Patient agrees to WhatsApp reminders and offers (can opt out any time)</span>
        </label>
      </div>

      {error && !Object.keys(fields).length && <div className="note error" role="alert">{error}</div>}
      <div className="actions">
        <button type="button" className="btn ghost" onClick={onCancel}>Cancel</button>
        <button className="btn primary" disabled={busy}>{busy ? "Saving…" : editing ? "Save changes" : "Register patient"}</button>
      </div>
    </form>
  );
}
