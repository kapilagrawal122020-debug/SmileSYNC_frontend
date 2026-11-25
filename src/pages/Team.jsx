import { useState } from "react";
import { api } from "../api/client";
import { useAuth } from "../auth/AuthContext";
import { Async, Badge, Card, Field, Modal, Page, label, useLoad, useSubmit, useToast } from "../components/ui";

const ROLE_OPTIONS = [["assistant", "Assistant"], ["consultant", "Consultant"], ["doctor", "Doctor"], ["clinic_admin", "Clinic admin"]];
const ROLE_TONE = { clinic_admin: "amber", doctor: "teal", consultant: "blue", assistant: "gray" };
const roleName = (r) => ROLE_OPTIONS.find(([k]) => k === r)?.[1] || label(r);
const BLANK = { name: "", phone: "", role: "assistant", password: "", designation: "", speciality: "", registration_number: "" };

// The clinic admin's team screen: approve people who asked to join, add people, change roles, switch accounts on or off.
export default function Team() {
  const { user: me } = useAuth();
  const toast = useToast();
  const list = useLoad(() => api.list("/users/"), []);
  const [modal, setModal] = useState(null); // {type: "add"} | {type: "edit"|"password", user}

  const run = async (fn, ok) => {
    try { await fn(); toast(ok); list.reload(); } catch (e) { toast(e.message, "bad"); }
  };
  const rows = list.data || [];
  const waiting = rows.filter((u) => u.signup_pending);
  const team = rows.filter((u) => !u.signup_pending);

  return (
    <Page title="Team" subtitle="Everyone who works at your clinic. Only clinic admins can change this."
      actions={<button className="btn primary" onClick={() => setModal({ type: "add" })}>+ Add team member</button>}>
      {waiting.length > 0 && (
        <Card title={`Waiting for your approval (${waiting.length})`} className="private">
          <p className="muted small">These people asked to join your clinic. They can only log in once you approve them.</p>
          <ul className="list">
            {waiting.map((u) => (
              <li key={u.id} className="list-row">
                <div className="grow"><b>{u.name}</b> <span className="muted mono small">{u.phone}</span>
                  <div className="muted small">{[u.designation, u.speciality, u.registration_number && `Reg. ${u.registration_number}`].filter(Boolean).join(" · ")}</div></div>
                <Badge tone={ROLE_TONE[u.role]}>{roleName(u.role)}</Badge>
                <div className="row gap">
                  <button className="btn small primary" onClick={() => run(() => api.post(`/users/${u.id}/approve/`), `${u.name || u.phone} approved. They can log in now.`)}>Approve</button>
                  <button className="btn small ghost" onClick={() => run(() => api.del(`/users/${u.id}/`), "Request declined")}>Decline</button>
                </div>
              </li>
            ))}
          </ul>
        </Card>
      )}

      <Card title="Your team">
        <Async state={{ ...list, data: list.data ? team : null }} empty="No team members yet.">
          {(people) => (
            <div className="table-wrap">
              <table className="table">
                <thead><tr><th>Person</th><th>Role</th><th>Status</th><th /></tr></thead>
                <tbody>
                  {people.map((u) => (
                    <tr key={u.id} className={u.is_active ? "" : "row-off"}>
                      <td><b>{u.name || "No name"}</b>{u.id === me.id && <span className="muted small"> (you)</span>}<div className="muted small mono">{u.phone}</div></td>
                      <td><Badge tone={ROLE_TONE[u.role]}>{roleName(u.role)}</Badge></td>
                      <td>{u.is_active ? <Badge tone="green">On</Badge> : <Badge tone="red">Turned off</Badge>}</td>
                      <td>
                        <div className="row gap wrap">
                          <button className="btn small" onClick={() => setModal({ type: "edit", user: u })}>Edit</button>
                          <button className="btn small" onClick={() => setModal({ type: "password", user: u })}>Set password</button>
                          <button className="btn small ghost" disabled={u.id === me.id} title={u.id === me.id ? "You cannot turn off your own account" : ""}
                            onClick={() => run(() => api.patch(`/users/${u.id}/`, { is_active: !u.is_active }), u.is_active ? `${u.name || u.phone} turned off and signed out` : `${u.name || u.phone} turned on`)}>
                            {u.is_active ? "Turn off" : "Turn on"}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Async>
      </Card>

      {modal?.type === "add" && <PersonModal onClose={() => setModal(null)} onSaved={() => { setModal(null); list.reload(); }} />}
      {modal?.type === "edit" && <PersonModal person={modal.user} isMe={modal.user.id === me.id} onClose={() => setModal(null)} onSaved={() => { setModal(null); list.reload(); }} />}
      {modal?.type === "password" && <PasswordModal person={modal.user} onClose={() => setModal(null)} />}
    </Page>
  );
}

function PersonModal({ person, isMe, onClose, onSaved }) {
  const toast = useToast();
  const isNew = !person;
  const [v, setV] = useState(isNew ? BLANK : { ...BLANK, ...Object.fromEntries(Object.keys(BLANK).map((k) => [k, person[k] ?? ""])) });
  const set = (k) => (e) => setV((s) => ({ ...s, [k]: e.target.value }));
  const { submit, busy, fields, error } = useSubmit(() => {
    if (isNew) return api.post("/users/", { ...v, phone: v.phone.replace(/\D/g, "").slice(-10) });
    const { phone, password, ...rest } = v; // eslint-disable-line no-unused-vars
    return api.patch(`/users/${person.id}/`, rest);
  }, () => { toast(isNew ? "Team member added" : "Saved"); onSaved(); });
  const clinical = v.role !== "assistant";
  return (
    <Modal title={isNew ? "Add team member" : `Edit ${person.name || person.phone}`} onClose={onClose}>
      <form onSubmit={submit} className="form" noValidate>
        <div className="grid2">
          <Field label="Name" error={fields.name}><input className="input" value={v.name} onChange={set("name")} autoFocus /></Field>
          {isNew
            ? <Field label="Mobile number" error={fields.phone}><input className="input" inputMode="numeric" value={v.phone} onChange={set("phone")} /></Field>
            : <Field label="Mobile number" hint="The login. It cannot be changed."><input className="input" value={person.phone} disabled /></Field>}
        </div>
        <div className="grid2">
          <Field label="Role" error={fields.role} hint={isMe ? "You cannot change your own role." : v.role === "clinic_admin" ? "Can manage the whole clinic, like you." : undefined}>
            <select className="input" value={v.role} onChange={set("role")} disabled={isMe}>{ROLE_OPTIONS.map(([k, t]) => <option key={k} value={k}>{t}</option>)}</select>
          </Field>
          {isNew && <Field label="Password" hint="At least 8 characters" error={fields.password}><input className="input" type="password" autoComplete="new-password" value={v.password} onChange={set("password")} /></Field>}
        </div>
        {clinical && (
          <div className="grid3">
            <Field label="Designation" error={fields.designation}><input className="input" placeholder="BDS, MDS" value={v.designation} onChange={set("designation")} /></Field>
            <Field label="Speciality" error={fields.speciality}><input className="input" value={v.speciality} onChange={set("speciality")} /></Field>
            <Field label="Registration no." error={fields.registration_number}><input className="input" value={v.registration_number} onChange={set("registration_number")} /></Field>
          </div>
        )}
        {error && !Object.keys(fields).length && <div className="note error">{error}</div>}
        {fields.detail && <div className="note error">{String(fields.detail)}</div>}
        <div className="actions"><button type="button" className="btn ghost" onClick={onClose}>Cancel</button><button className="btn primary" disabled={busy}>{isNew ? "Add" : "Save"}</button></div>
      </form>
    </Modal>
  );
}

function PasswordModal({ person, onClose }) {
  const toast = useToast();
  const [password, setPassword] = useState("");
  const { submit, busy, fields, error } = useSubmit(() => api.patch(`/users/${person.id}/`, { password }), () => { toast("Password changed. They must sign in again."); onClose(); });
  return (
    <Modal title={`New password for ${person.name || person.phone}`} onClose={onClose}>
      <form onSubmit={submit} className="form" noValidate>
        <p className="muted small">They are signed out and use this password next time. Share it through a safe channel.</p>
        <Field label="New password" hint="At least 6 characters" error={fields.password}><input className="input" type="password" autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} autoFocus /></Field>
        {error && !fields.password && <div className="note error">{error}</div>}
        <div className="actions"><button type="button" className="btn ghost" onClick={onClose}>Cancel</button><button className="btn primary" disabled={busy}>Change password</button></div>
      </form>
    </Modal>
  );
}
