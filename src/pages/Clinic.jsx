import { useState } from "react";
import { api, fmtDate } from "../api/client";
import { useAuth } from "../auth/AuthContext";
import { Async, Badge, Card, Field, FileInput, Modal, Page, buildBody, label, useLoad, useSubmit, useToast } from "../components/ui";
import { Stars } from "./PatientHome";

const DOC_TYPES = [
  ["dental_council", "State Dental Council registration"], ["clinic_registration", "Clinic registration"],
  ["biomedical_waste", "Bio-medical waste authorisation"], ["aerb", "AERB e-LORA"], ["camp_permission", "Camp permission"], ["other", "Other"],
];
const docName = (d) => d.title || DOC_TYPES.find(([k]) => k === d.doc_type)?.[1] || label(d.doc_type);

export default function Clinic() {
  const { user } = useAuth();
  const isDoctor = user.role === "doctor";
  const clinics = useLoad(() => api.list("/clinics/"), []);

  return (
    <Page title={user.role === "patient" ? "My clinic" : "Clinic"} subtitle={isDoctor ? "Profile, staff, chairs, documents and feedback." : undefined}>
      <Async state={clinics} empty="No clinic found.">
        {(rows) => rows.map((c) => <Profile key={c.id} clinic={c} editable={isDoctor} reload={clinics.reload} />)}
      </Async>
      {isDoctor && <Staff />}
      {user.role !== "patient" && <Chairs canEdit={isDoctor} />}
      {isDoctor && <Documents />}
      {(isDoctor || user.role === "consultant") && <Feedback canReply={isDoctor} />}
    </Page>
  );
}

function Profile({ clinic: c, editable, reload }) {
  const [editing, setEditing] = useState(false);
  const links = [["Google reviews", c.google_review_url], ["Website", c.website_url], ["Social", c.social_url]].filter(([, u]) => u);
  return (
    <Card title={c.name} actions={editable && <button className="btn small" onClick={() => setEditing(true)}>Edit</button>}>
      <p>{[c.address, c.city].filter(Boolean).join(", ") || <span className="muted">No address yet</span>}{c.phone && <> · <span className="mono">{c.phone}</span></>}</p>
      {links.length > 0 && <p className="row gap wrap">{links.map(([n, u]) => <a key={n} className="btn small" href={u} target="_blank" rel="noreferrer">{n} ↗</a>)}</p>}
      {c.code && editable && <div className="note info">Clinic code for your team and patients to sign up: <b className="mono">{c.code}</b></div>}
      {c.doctors?.length > 0 && (
        <>
          <h3>Doctors and consultants</h3>
          <ul className="list">
            {c.doctors.map((d, i) => (
              <li key={i} className="list-row">
                <div className="grow"><b>{d.name}</b> <span className="muted">{[d.designation, d.speciality].filter(Boolean).join(" · ")}</span></div>
                <Badge tone={d.role === "doctor" ? "teal" : "blue"}>{label(d.role)}</Badge>
                {d.registration_number && <span className="mono small">{d.registration_number}</span>}
              </li>
            ))}
          </ul>
        </>
      )}
      {editing && <ClinicForm clinic={c} onClose={() => setEditing(false)} onSaved={() => { setEditing(false); reload(); }} />}
    </Card>
  );
}

function ClinicForm({ clinic, onClose, onSaved }) {
  const toast = useToast();
  const [v, setV] = useState({ name: clinic.name, address: clinic.address || "", city: clinic.city || "", phone: clinic.phone || "", google_review_url: clinic.google_review_url || "", website_url: clinic.website_url || "", social_url: clinic.social_url || "" });
  const set = (k) => (e) => setV((s) => ({ ...s, [k]: e.target.value }));
  const { submit, busy, fields, error } = useSubmit(() => api.patch(`/clinics/${clinic.id}/`, v), () => { toast("Clinic updated"); onSaved(); });
  return (
    <Modal title="Edit clinic" onClose={onClose}>
      <form onSubmit={submit} className="form" noValidate>
        <Field label="Clinic name" error={fields.name}><input className="input" value={v.name} onChange={set("name")} /></Field>
        <Field label="Address" error={fields.address}><input className="input" value={v.address} onChange={set("address")} /></Field>
        <div className="grid2">
          <Field label="City" error={fields.city}><input className="input" value={v.city} onChange={set("city")} /></Field>
          <Field label="Phone" error={fields.phone}><input className="input" value={v.phone} onChange={set("phone")} /></Field>
        </div>
        <Field label="Google review link" error={fields.google_review_url}><input className="input" type="url" value={v.google_review_url} onChange={set("google_review_url")} /></Field>
        <div className="grid2">
          <Field label="Website" error={fields.website_url}><input className="input" type="url" value={v.website_url} onChange={set("website_url")} /></Field>
          <Field label="Social page" error={fields.social_url}><input className="input" type="url" value={v.social_url} onChange={set("social_url")} /></Field>
        </div>
        {error && !Object.keys(fields).length && <div className="note error">{error}</div>}
        <div className="actions"><button type="button" className="btn ghost" onClick={onClose}>Cancel</button><button className="btn primary" disabled={busy}>Save</button></div>
      </form>
    </Modal>
  );
}

// ---- Staff (doctor only) -----------------------------------------------------------------
function Staff() {
  const toast = useToast();
  const list = useLoad(() => api.list("/users/"), []);
  const [adding, setAdding] = useState(false);
  const [v, setV] = useState({ name: "", phone: "", role: "assistant", password: "", designation: "", speciality: "", registration_number: "" });
  const set = (k) => (e) => setV((s) => ({ ...s, [k]: e.target.value }));
  const { submit, busy, fields, error } = useSubmit(
    () => api.post("/users/", { ...v, phone: v.phone.replace(/\D/g, "").slice(-10) }),
    () => { toast("Staff member added"); setAdding(false); setV({ name: "", phone: "", role: "assistant", password: "", designation: "", speciality: "", registration_number: "" }); list.reload(); }
  );
  return (
    <Card title="Staff" actions={<button className="btn small primary" onClick={() => setAdding(true)}>+ Add staff</button>}>
      <Async state={list} empty="No staff yet.">
        {(rows) => (
          <ul className="list">
            {rows.map((u) => (
              <li key={u.id} className="list-row">
                <div className="grow"><b>{u.name}</b> <span className="muted mono small">{u.phone}</span></div>
                <Badge tone={u.role === "doctor" ? "teal" : u.role === "consultant" ? "blue" : "gray"}>{label(u.role)}</Badge>
              </li>
            ))}
          </ul>
        )}
      </Async>
      {adding && (
        <Modal title="Add staff member" onClose={() => setAdding(false)}>
          <form onSubmit={submit} className="form" noValidate>
            <div className="grid2">
              <Field label="Name" error={fields.name}><input className="input" value={v.name} onChange={set("name")} autoFocus /></Field>
              <Field label="Mobile number" error={fields.phone}><input className="input" inputMode="numeric" value={v.phone} onChange={set("phone")} /></Field>
            </div>
            <div className="grid2">
              <Field label="Role" error={fields.role}><select className="input" value={v.role} onChange={set("role")}><option value="assistant">Assistant</option><option value="consultant">Consultant</option><option value="doctor">Doctor</option></select></Field>
              <Field label="Password" hint="At least 6 characters" error={fields.password}><input className="input" type="password" value={v.password} onChange={set("password")} /></Field>
            </div>
            {v.role !== "assistant" && (
              <div className="grid3">
                <Field label="Designation" error={fields.designation}><input className="input" value={v.designation} onChange={set("designation")} /></Field>
                <Field label="Speciality" error={fields.speciality}><input className="input" value={v.speciality} onChange={set("speciality")} /></Field>
                <Field label="Registration no." error={fields.registration_number}><input className="input" value={v.registration_number} onChange={set("registration_number")} /></Field>
              </div>
            )}
            {error && !Object.keys(fields).length && <div className="note error">{error}</div>}
            <div className="actions"><button type="button" className="btn ghost" onClick={() => setAdding(false)}>Cancel</button><button className="btn primary" disabled={busy}>Add</button></div>
          </form>
        </Modal>
      )}
    </Card>
  );
}

// ---- Chairs ------------------------------------------------------------------------------
function Chairs({ canEdit }) {
  const toast = useToast();
  const list = useLoad(() => api.list("/chairs/"), []);
  const [name, setName] = useState("");
  const add = async (e) => {
    e.preventDefault();
    if (!name.trim()) return;
    try { await api.post("/chairs/", { name: name.trim() }); setName(""); list.reload(); } catch (err) { toast(err.message, "bad"); }
  };
  return (
    <Card title="Chairs">
      <Async state={list} empty="No chairs yet.">
        {(rows) => (
          <ul className="list">
            {rows.map((c) => (
              <li key={c.id} className="list-row">
                <b className="grow">{c.name}</b>
                <Badge tone={{ ready: "green", in_use: "amber", locked: "red" }[c.status]}>{label(c.status)}</Badge>
              </li>
            ))}
          </ul>
        )}
      </Async>
      {canEdit && (
        <form onSubmit={add} className="row gap">
          <input className="input" placeholder="New chair name" value={name} onChange={(e) => setName(e.target.value)} aria-label="New chair name" />
          <button className="btn small primary">Add chair</button>
        </form>
      )}
    </Card>
  );
}

// ---- Documents (doctor only) -------------------------------------------------------------
function Documents() {
  const list = useLoad(() => api.list("/documents/"), []);
  const [adding, setAdding] = useState(false);
  const tone = (d) => (d.days_left === null || d.days_left === undefined ? "gray" : d.days_left < 0 || d.days_left <= 30 ? "red" : d.days_left <= 60 ? "amber" : "green");
  const text = (d) => (d.days_left === null || d.days_left === undefined ? "No expiry" : d.days_left < 0 ? `Expired ${-d.days_left} days ago` : `${d.days_left} days left`);
  return (
    <Card title="Documents vault" actions={<button className="btn small primary" onClick={() => setAdding(true)}>+ Add document</button>}>
      <p className="muted small">You get alerts 60 and 30 days before a registration or authorisation expires.</p>
      <Async state={list} empty="No documents yet. Add your council registration, clinic registration, waste authorisation and AERB e-LORA.">
        {(rows) => (
          <ul className="list">
            {rows.map((d) => (
              <li key={d.id} className="list-row">
                <div className="grow"><b>{docName(d)}</b><div className="muted small">{d.number || "No number"}{d.expiry_date ? ` · expires ${fmtDate(d.expiry_date)}` : ""}</div></div>
                <Badge tone={tone(d)}>{text(d)}</Badge>
              </li>
            ))}
          </ul>
        )}
      </Async>
      {adding && <DocForm onClose={() => setAdding(false)} onSaved={() => { setAdding(false); list.reload(); }} />}
    </Card>
  );
}

function DocForm({ onClose, onSaved }) {
  const toast = useToast();
  const [v, setV] = useState({ doc_type: "dental_council", title: "", number: "", expiry_date: "" });
  const [file, setFile] = useState(null);
  const set = (k) => (e) => setV((s) => ({ ...s, [k]: e.target.value }));
  // JSON needs null (not "") for an empty date; buildBody() leaves empty fields out of multipart uploads.
  const { submit, busy, fields, error } = useSubmit(() => api.post("/documents/", buildBody({ ...v, expiry_date: v.expiry_date || null }, "file", file)), () => { toast("Document saved"); onSaved(); });
  return (
    <Modal title="Add document" onClose={onClose}>
      <form onSubmit={submit} className="form" noValidate>
        <Field label="Type" error={fields.doc_type}><select className="input" value={v.doc_type} onChange={set("doc_type")}>{DOC_TYPES.map(([k, n]) => <option key={k} value={k}>{n}</option>)}</select></Field>
        <div className="grid2">
          <Field label="Number" error={fields.number}><input className="input" value={v.number} onChange={set("number")} /></Field>
          <Field label="Expiry date" error={fields.expiry_date}><input className="input" type="date" value={v.expiry_date} onChange={set("expiry_date")} /></Field>
        </div>
        <Field label="Title (optional)" error={fields.title}><input className="input" value={v.title} onChange={set("title")} /></Field>
        <Field label="File (optional)" hint="PDF or photo" error={fields.file}><FileInput accept="image/*,.pdf" onChange={setFile} /></Field>
        {error && !Object.keys(fields).length && <div className="note error">{error}</div>}
        <div className="actions"><button type="button" className="btn ghost" onClick={onClose}>Cancel</button><button className="btn primary" disabled={busy}>Save</button></div>
      </form>
    </Modal>
  );
}

// ---- Feedback ----------------------------------------------------------------------------
function Feedback({ canReply }) {
  const toast = useToast();
  const list = useLoad(() => api.list("/feedback/"), []);
  const [drafts, setDrafts] = useState({});
  const reply = async (f) => {
    try { await api.post(`/feedback/${f.id}/reply/`, { reply: drafts[f.id] || "" }); toast("Reply saved"); list.reload(); } catch (e) { toast(e.message, "bad"); }
  };
  return (
    <Card title="Patient feedback">
      <Async state={list} empty="No feedback yet.">
        {(rows) => (
          <ul className="list">
            {rows.map((f) => (
              <li key={f.id} className="list-row col">
                <div className="row gap spread">
                  <Stars value={f.rating} />
                  <span className="muted small">{fmtDate(f.created_at)} · {label(f.source)}</span>
                </div>
                {f.comment && <p>{f.comment}</p>}
                {f.reply ? <p className="reply"><b>Your reply:</b> {f.reply}</p> : canReply && (
                  <div className="row gap">
                    <input className="input" placeholder="Reply to this patient…" value={drafts[f.id] || ""} onChange={(e) => setDrafts((d) => ({ ...d, [f.id]: e.target.value }))} aria-label="Reply" />
                    <button className="btn small primary" onClick={() => reply(f)}>Reply</button>
                  </div>
                )}
                {f.rating <= 3 && !f.reply && <Badge tone="red">Low rating</Badge>}
              </li>
            ))}
          </ul>
        )}
      </Async>
    </Card>
  );
}
