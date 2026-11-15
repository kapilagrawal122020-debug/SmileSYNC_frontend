import { useState } from "react";
import { api, fmtDate } from "../api/client";
import { Async, Card, Field, Modal, Page, useLoad, useSubmit, useToast } from "../components/ui";

export default function Clinics() {
  const [q, setQ] = useState("");
  const [editing, setEditing] = useState(null);
  const list = useLoad(() => api.list("/platform/clinics/", { search: q }), [q]);
  return (
    <Page title="Clinics" subtitle="Every clinic on the platform. You can correct its name, city, address and phone.">
      <input className="input search" placeholder="Search by clinic or city" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search clinics" />
      <Card>
        <Async state={list} empty="No clinic matches.">
          {(rows) => (
            <div className="table-wrap">
              <table className="table">
                <thead><tr><th>Clinic</th><th>City</th><th>Doctors</th><th className="num">Staff</th><th className="num">Patients</th><th>Joined</th><th /></tr></thead>
                <tbody>
                  {rows.map((c) => (
                    <tr key={c.id}>
                      <td><b>{c.name}</b><div className="muted small">{c.phone || "no phone"}</div></td>
                      <td>{c.city || "–"}</td>
                      <td>{c.doctors.join(", ") || "–"}</td>
                      <td className="num">{c.staff_count}</td>
                      <td className="num">{c.patient_count}</td>
                      <td>{fmtDate(c.created_at)}</td>
                      <td><button className="btn small" onClick={() => setEditing(c)}>Edit</button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Async>
      </Card>
      {editing && <EditClinic clinic={editing} onClose={() => setEditing(null)} onSaved={() => { setEditing(null); list.reload(); }} />}
    </Page>
  );
}

function EditClinic({ clinic, onClose, onSaved }) {
  const toast = useToast();
  const [v, setV] = useState({ name: clinic.name, city: clinic.city, address: clinic.address, phone: clinic.phone });
  const set = (k) => (e) => setV((s) => ({ ...s, [k]: e.target.value }));
  const { submit, busy, fields, error } = useSubmit(() => api.patch(`/platform/clinics/${clinic.id}/`, v), () => { toast("Clinic updated"); onSaved(); });
  return (
    <Modal title={`Edit ${clinic.name}`} onClose={onClose}>
      <form className="form" onSubmit={submit} noValidate>
        <Field label="Clinic name" error={fields.name}><input className="input" value={v.name} onChange={set("name")} autoFocus /></Field>
        <div className="grid2">
          <Field label="City" error={fields.city}><input className="input" value={v.city} onChange={set("city")} /></Field>
          <Field label="Phone" error={fields.phone}><input className="input" value={v.phone} onChange={set("phone")} /></Field>
        </div>
        <Field label="Address" error={fields.address}><textarea className="input" rows={2} value={v.address} onChange={set("address")} /></Field>
        {error && !Object.keys(fields).length && <div className="note error">{error}</div>}
        <div className="actions"><button type="button" className="btn ghost" onClick={onClose}>Cancel</button><button className="btn primary" disabled={busy}>Save</button></div>
      </form>
    </Modal>
  );
}
