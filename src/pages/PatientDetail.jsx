import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { api, fmtDate, fmtDateTime, rupees } from "../api/client";
import { useAuth } from "../auth/AuthContext";
import {
  Async, Badge, Card, Empty, ErrorNote, Field, FileInput, Loading, Modal, Page, SecureImage, STATUS_TONE,
  buildBody, label, useLoad, useSubmit, useToast,
} from "../components/ui";
import VisitList from "../components/VisitList";
import Billing from "./Billing";
import { PatientForm } from "./Patients";

const TABS = ["Overview", "Treatments", "Images", "Billing", "Visits"];

export default function PatientDetail() {
  const { id } = useParams();
  const [tab, setTab] = useState("Overview");
  const patient = useLoad(() => api.get(`/patients/${id}/`), [id]);

  if (patient.loading && !patient.data) return <Page title="Patient"><Loading /></Page>;
  if (patient.error) return <Page title="Patient"><ErrorNote message={patient.error} onRetry={patient.reload} /></Page>;
  const p = patient.data;

  return (
    <Page
      title={p.name}
      subtitle={`${p.phone}${p.locality ? ` · ${p.locality}` : ""}`}
      actions={<Link className="btn ghost" to="/patients">← All patients</Link>}
    >
      <div className="tabs" role="tablist">
        {TABS.map((t) => (
          <button key={t} role="tab" aria-selected={tab === t} className={`tab ${tab === t ? "on" : ""}`} onClick={() => setTab(t)}>{t}</button>
        ))}
      </div>
      {tab === "Overview" && <Overview p={p} reload={patient.reload} />}
      {tab === "Treatments" && <Treatments patientId={p.id} />}
      {tab === "Images" && <Images patientId={p.id} />}
      {tab === "Billing" && <Billing patientId={p.id} />}
      {tab === "Visits" && <PatientVisits patientId={p.id} />}
    </Page>
  );
}

// ---- Overview ----------------------------------------------------------------------------
function Overview({ p, reload }) {
  const { user } = useAuth();
  const [editing, setEditing] = useState(false);
  const rows = [
    ["Chief complaint", p.chief_complaint], ["Medical history", p.medical_history], ["Dental history", p.dental_history],
    ["Language", p.language], ["Registered", fmtDate(p.created_at)],
  ];
  return (
    <>
      <Card title="Details" actions={<button className="btn small" onClick={() => setEditing(true)}>Edit</button>}>
        <div className="detail-grid">
          {p.selfie_url && <SecureImage url={p.selfie_url} alt={`${p.name} selfie`} className="selfie" />}
          <dl className="dl">
            {rows.map(([k, val]) => (<div key={k}><dt>{k}</dt><dd>{val || "–"}</dd></div>))}
            <div><dt>Consent</dt><dd>
              <Badge tone={p.consent_data ? "green" : "red"}>Data</Badge>{" "}
              <Badge tone={p.consent_whatsapp ? "green" : "gray"}>WhatsApp</Badge>
            </dd></div>
          </dl>
        </div>
      </Card>
      {user.role === "doctor" && (
        <Card title="Private notes" className="private">
          <p>{p.private_notes || <span className="muted">No private notes. Only the doctor can see this.</span>}</p>
        </Card>
      )}
      {editing && (
        <Modal title="Edit patient" onClose={() => setEditing(false)} wide>
          <PatientForm initial={p} onCancel={() => setEditing(false)} onSaved={() => { setEditing(false); reload(); }} />
        </Modal>
      )}
    </>
  );
}

// ---- Treatments --------------------------------------------------------------------------
function Treatments({ patientId }) {
  const { user } = useAuth();
  const toast = useToast();
  const canEdit = user.role === "doctor" || user.role === "consultant";
  const list = useLoad(() => api.list("/treatments/", { patient: patientId }), [patientId]);
  const [adding, setAdding] = useState(false);

  const complete = async (t) => {
    try {
      const res = await api.post(`/treatments/${t.id}/complete/`);
      const used = res?.stock_used || [];
      toast(used.length ? `Done. Stock used: ${used.map((u) => `${u.item} −${u.used} (${u.left} left)`).join(", ")}` : "Marked as done");
      list.reload();
    } catch (e) { toast(e.message, "bad"); }
  };

  return (
    <Card title="Treatment plan and notes" actions={canEdit && <button className="btn small primary" onClick={() => setAdding(true)}>+ Add procedure</button>}>
      <Async state={list} empty="No treatments planned yet.">
        {(rows) => (
          <ul className="list">
            {rows.map((t) => (
              <li key={t.id} className="list-row">
                <div className="grow">
                  <b>{t.procedure}</b>{t.tooth && <span className="muted"> · tooth {t.tooth}</span>}{t.units > 1 && <span className="muted"> · ×{t.units}</span>}
                  <div className="muted small">{t.notes || "No notes"} · {rupees(t.cost)}{t.done_at ? ` · done ${fmtDate(t.done_at)}` : ""}</div>
                </div>
                <Badge tone={STATUS_TONE[t.status]}>{label(t.status)}</Badge>
                {canEdit && t.status === "planned" && <button className="btn small" onClick={() => complete(t)}>Mark done</button>}
              </li>
            ))}
          </ul>
        )}
      </Async>
      {adding && <TreatmentModal patientId={patientId} onClose={() => setAdding(false)} onSaved={() => { setAdding(false); list.reload(); }} />}
    </Card>
  );
}

function TreatmentModal({ patientId, onClose, onSaved }) {
  const toast = useToast();
  const rules = useLoad(() => api.list("/inventory/rules/").catch(() => []), []);
  const [v, setV] = useState({ procedure: "", tooth: "", units: 1, cost: "", notes: "" });
  const set = (k) => (e) => setV((s) => ({ ...s, [k]: e.target.value }));
  const { submit, busy, fields, error } = useSubmit(
    () => api.post("/treatments/", { ...v, patient: patientId, units: Number(v.units) || 1, cost: v.cost === "" ? 0 : v.cost }),
    () => { toast("Procedure added"); onSaved(); }
  );
  const names = [...new Set((rules.data || []).map((r) => r.procedure))];
  return (
    <Modal title="Add procedure" onClose={onClose}>
      <form onSubmit={submit} className="form" noValidate>
        <Field label="Procedure" error={fields.procedure} hint="Pick a saved name so stock is deducted automatically when it is done.">
          <input className="input" list="procs" value={v.procedure} onChange={set("procedure")} autoFocus required />
          <datalist id="procs">{names.map((n) => <option key={n} value={n} />)}</datalist>
        </Field>
        <div className="grid3">
          <Field label="Tooth" hint="One tooth or a list, e.g. 26 or 12, 14, 16" error={fields.tooth}><input className="input" maxLength={100} value={v.tooth} onChange={set("tooth")} /></Field>
          <Field label="Units" error={fields.units} hint="Fillings or teeth"><input className="input" type="number" min="1" value={v.units} onChange={set("units")} /></Field>
          <Field label="Cost (₹)" error={fields.cost}><input className="input" type="number" min="0" value={v.cost} onChange={set("cost")} /></Field>
        </div>
        <Field label="Notes" error={fields.notes}><textarea className="input" rows={2} value={v.notes} onChange={set("notes")} /></Field>
        {error && !Object.keys(fields).length && <div className="note error">{error}</div>}
        <div className="actions"><button type="button" className="btn ghost" onClick={onClose}>Cancel</button><button className="btn primary" disabled={busy}>Add</button></div>
      </form>
    </Modal>
  );
}

// ---- Images ------------------------------------------------------------------------------
function Images({ patientId }) {
  const list = useLoad(() => api.list("/images/", { patient: patientId }), [patientId]);
  const [adding, setAdding] = useState(false);
  const [open, setOpen] = useState(null);
  return (
    <Card title="X-rays, scans and photos" actions={<button className="btn small primary" onClick={() => setAdding(true)}>+ Upload</button>}>
      <Async state={list} empty="No images yet. Upload an X-ray or intraoral photo.">
        {(rows) => (
          <div className="gallery">
            {rows.map((im) => (
              <button key={im.id} className="tile" onClick={() => setOpen(im)}>
                <SecureImage url={im.file_url} alt={`${im.kind} ${im.tooth}`} />
                <span><b>{label(im.kind)}</b>{im.tooth && ` · ${im.tooth}`}{im.stage && ` · ${im.stage}`}<br /><small>{fmtDate(im.taken_at)}</small></span>
              </button>
            ))}
          </div>
        )}
      </Async>
      {adding && <ImageModal patientId={patientId} onClose={() => setAdding(false)} onSaved={() => { setAdding(false); list.reload(); }} />}
      {open && (
        <Modal title={`${label(open.kind)}${open.tooth ? ` · tooth ${open.tooth}` : ""}`} onClose={() => setOpen(null)} wide>
          <SecureImage url={open.file_url} alt="Full size" className="full" />
          <p className="muted small">{open.stage && `${label(open.stage)} treatment · `}{fmtDateTime(open.taken_at)}</p>
        </Modal>
      )}
    </Card>
  );
}

function ImageModal({ patientId, onClose, onSaved }) {
  const toast = useToast();
  const [v, setV] = useState({ kind: "intraoral", tooth: "", stage: "" });
  const [file, setFile] = useState(null);
  const set = (k) => (e) => setV((s) => ({ ...s, [k]: e.target.value }));
  const { submit, busy, fields, error } = useSubmit(() => {
    if (!file) throw new Error("Choose a photo or file first.");
    return api.post("/images/", buildBody({ ...v, patient: patientId }, "file", file));
  }, () => { toast("Image uploaded"); onSaved(); });
  return (
    <Modal title="Upload image" onClose={onClose}>
      <form onSubmit={submit} className="form" noValidate>
        <Field label="File" hint="jpg, png, webp, dcm or pdf up to 15 MB" error={fields.file}><FileInput accept="image/*,.dcm,.pdf" capture="environment" onChange={setFile} /></Field>
        <div className="grid3">
          <Field label="Type"><select className="input" value={v.kind} onChange={set("kind")}><option value="intraoral">Intraoral photo</option><option value="xray">X-ray (RVG)</option><option value="scan">Scan</option><option value="other">Other</option></select></Field>
          <Field label="Tooth"><input className="input" placeholder="e.g. 26" value={v.tooth} onChange={set("tooth")} /></Field>
          <Field label="Stage"><select className="input" value={v.stage} onChange={set("stage")}><option value="">–</option><option value="before">Before</option><option value="after">After</option></select></Field>
        </div>
        {error && <div className="note error">{error}</div>}
        <div className="actions"><button type="button" className="btn ghost" onClick={onClose}>Cancel</button><button className="btn primary" disabled={busy}>{busy ? "Uploading…" : "Upload"}</button></div>
      </form>
    </Modal>
  );
}

// ---- Visits ------------------------------------------------------------------------------
function PatientVisits({ patientId }) {
  const list = useLoad(() => Promise.all([api.list("/visits/", { patient: patientId }), api.list("/chairs/")]), [patientId]);
  return (
    <Card title="Appointments" actions={<Link className="btn small primary" to={`/appointments?new=1&patient=${patientId}`}>+ Book visit</Link>}>
      <Async state={list} empty="No visits yet.">
        {([visits, chairs]) => (visits.length ? <VisitList visits={[...visits].reverse()} chairs={chairs} showDate onChange={list.reload} /> : <Empty>No visits yet.</Empty>)}
      </Async>
    </Card>
  );
}
