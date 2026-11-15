import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { api, fmtDateTime } from "../api/client";
import { useAuth } from "../auth/AuthContext";
import { Async, Badge, Card, Field, Modal, Page, label, useLoad, useSubmit, useToast } from "../components/ui";

const ROLE_OPTIONS = ["doctor", "consultant", "assistant", "super_admin"];

export default function Users() {
  const { user: me } = useAuth();
  const toast = useToast();
  const [params] = useSearchParams();
  const [f, setF] = useState({ role: "", status: params.get("status") || "", search: "" });
  const [modal, setModal] = useState(null); // { type: "password", user } | { type: "admin" }
  const query = { role: f.role, search: f.search, ...(f.status === "pending" ? { pending: "true" } : f.status ? { active: f.status } : {}) };
  const list = useLoad(() => api.list("/platform/users/", query), [f.role, f.status, f.search]);
  const set = (k) => (e) => setF((s) => ({ ...s, [k]: e.target.value }));

  const toggle = async (u) => {
    try {
      await api.patch(`/platform/users/${u.id}/`, { is_active: !u.is_active });
      toast(u.is_active ? `${u.name || u.phone} turned off and signed out` : `${u.name || u.phone} turned on`);
      list.reload();
    } catch (e) { toast(e.message, "bad"); }
  };

  const approve = async (u) => {
    try {
      await api.post(`/platform/users/${u.id}/approve/`);
      toast(`${u.name || u.phone} approved. They can log in now.`);
      list.reload();
    } catch (e) { toast(e.message, "bad"); }
  };

  return (
    <Page title="Accounts" subtitle="Staff and admin accounts across all clinics. Patients are not listed."
      actions={<button className="btn primary" onClick={() => setModal({ type: "admin" })}>+ Add platform admin</button>}>
      <div className="row gap wrap">
        <input className="input search" placeholder="Search name or phone" value={f.search} onChange={set("search")} aria-label="Search accounts" />
        <select className="input date" value={f.role} onChange={set("role")} aria-label="Filter by role">
          <option value="">All roles</option>{ROLE_OPTIONS.map((r) => <option key={r} value={r}>{r === "super_admin" ? "Platform admin" : label(r)}</option>)}
        </select>
        <select className="input date" value={f.status} onChange={set("status")} aria-label="Filter by status">
          <option value="">All accounts</option><option value="pending">Waiting for approval</option><option value="true">On</option><option value="false">Turned off</option>
        </select>
      </div>
      <Card>
        <Async state={list} empty={f.status === "pending" ? "Nobody is waiting for approval." : "No account matches."}>
          {(rows) => (
            <div className="table-wrap">
              <table className="table">
                <thead><tr><th>Person</th><th>Role</th><th>Clinic</th><th>Status</th><th>Last sign-in</th><th /></tr></thead>
                <tbody>
                  {rows.map((u) => (
                    <tr key={u.id} className={u.is_active || u.signup_pending ? "" : "row-off"}>
                      <td><b>{u.name || "No name"}</b><div className="muted small mono">{u.phone}</div></td>
                      <td>{u.is_super_admin ? <Badge tone="amber">Platform admin</Badge> : <Badge tone="teal">{label(u.role)}</Badge>}</td>
                      <td>{u.clinic_name || "–"}</td>
                      <td>{u.signup_pending ? <Badge tone="amber">Waiting for approval</Badge> : u.is_active ? <Badge tone="green">On</Badge> : <Badge tone="red">Turned off</Badge>}</td>
                      <td className="small">{u.last_login ? fmtDateTime(u.last_login) : "Never"}</td>
                      <td>
                        <div className="row gap">
                          {u.signup_pending && <button className="btn small primary" onClick={() => approve(u)}>Approve</button>}
                          <button className="btn small" onClick={() => setModal({ type: "password", user: u })}>Set password</button>
                          {!u.signup_pending && <button className="btn small ghost" disabled={u.id === me.id} title={u.id === me.id ? "You cannot turn off your own account" : ""} onClick={() => toggle(u)}>{u.is_active ? "Turn off" : "Turn on"}</button>}
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
      {modal?.type === "password" && <PasswordModal user={modal.user} onClose={() => setModal(null)} />}
      {modal?.type === "admin" && <AdminModal onClose={() => setModal(null)} onSaved={() => { setModal(null); list.reload(); }} />}
    </Page>
  );
}

function PasswordModal({ user, onClose }) {
  const toast = useToast();
  const [password, setPassword] = useState("");
  const { submit, busy, fields, error } = useSubmit(() => api.post(`/platform/users/${user.id}/set-password/`, { password }), () => { toast("Password changed and the person signed out"); onClose(); });
  return (
    <Modal title={`New password for ${user.name || user.phone}`} onClose={onClose}>
      <form className="form" onSubmit={submit} noValidate>
        <p className="muted small">They will be signed out everywhere and must use this password next time. Share it through a safe channel.</p>
        <Field label="New password" hint="At least 8 characters, not a common password" error={fields.password}><input className="input" type="password" autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} autoFocus /></Field>
        {error && !fields.password && <div className="note error">{error}</div>}
        <div className="actions"><button type="button" className="btn ghost" onClick={onClose}>Cancel</button><button className="btn primary" disabled={busy}>Change password</button></div>
      </form>
    </Modal>
  );
}

function AdminModal({ onClose, onSaved }) {
  const toast = useToast();
  const [v, setV] = useState({ name: "", phone: "", password: "" });
  const set = (k) => (e) => setV((s) => ({ ...s, [k]: e.target.value }));
  const { submit, busy, fields, error } = useSubmit(() => api.post("/platform/admins/", v), () => { toast("Platform admin added"); onSaved(); });
  return (
    <Modal title="Add platform admin" onClose={onClose}>
      <form className="form" onSubmit={submit} noValidate>
        <div className="note info">A platform admin can see every clinic's account details and edit the master lists. They cannot open patient records.</div>
        <Field label="Full name" error={fields.name}><input className="input" value={v.name} onChange={set("name")} autoFocus /></Field>
        <Field label="Mobile number" error={fields.phone}><input className="input" inputMode="numeric" value={v.phone} onChange={set("phone")} /></Field>
        <Field label="Password" hint="At least 8 characters, not a common password" error={fields.password}><input className="input" type="password" autoComplete="new-password" value={v.password} onChange={set("password")} /></Field>
        {error && !Object.keys(fields).length && <div className="note error">{error}</div>}
        <div className="actions"><button type="button" className="btn ghost" onClick={onClose}>Cancel</button><button className="btn primary" disabled={busy}>Add admin</button></div>
      </form>
    </Modal>
  );
}
