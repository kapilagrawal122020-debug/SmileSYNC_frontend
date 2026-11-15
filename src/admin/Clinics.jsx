import { useState } from "react";
import { Link } from "react-router-dom";
import { api, fmtDate } from "../api/client";
import { useLists } from "../lists/useLists";
import { Async, Badge, Card, Field, Modal, Page, useLoad, useSubmit, useToast } from "../components/ui";

const BLANK = {
  name: "", city: "", state: "", pincode: "", address: "", location_url: "", phone: "", email: "", registration_number: "", gst_number: "",
  poc_name: "", poc_designation: "", poc_phone: "", poc_email: "", admin_notes: "", is_active: true,
};

export default function Clinics() {
  const toast = useToast();
  const [f, setF] = useState({ search: "", active: "" });
  const [modal, setModal] = useState(null); // {} to add, a clinic to edit
  const list = useLoad(() => api.list("/platform/clinics/", f), [f.search, f.active]);
  const set = (k) => (e) => setF((s) => ({ ...s, [k]: e.target.value }));

  const toggle = async (c) => {
    try {
      await api.patch(`/platform/clinics/${c.id}/`, { is_active: !c.is_active });
      toast(c.is_active ? `${c.name} turned off. It no longer appears at sign-up.` : `${c.name} turned on`);
      list.reload();
    } catch (e) { toast(e.message, "bad"); }
  };

  return (
    <Page title="Clinics" subtitle="The clinic directory. Doctors choose their clinic from the ones that are on when they sign up."
      actions={<button className="btn primary" onClick={() => setModal({})}>+ Add clinic</button>}>
      <div className="row gap wrap">
        <input className="input search" placeholder="Search clinic, city or contact person" value={f.search} onChange={set("search")} aria-label="Search clinics" />
        <select className="input date" value={f.active} onChange={set("active")} aria-label="Filter by status">
          <option value="">On and off</option><option value="true">On</option><option value="false">Turned off</option>
        </select>
      </div>
      <Card>
        <Async state={list} empty="No clinic yet. Add the first one with + Add clinic.">
          {(rows) => (
            <div className="table-wrap">
              <table className="table">
                <thead><tr><th>Clinic</th><th>Point of contact</th><th>Doctors</th><th className="num">Staff</th><th className="num">Patients</th><th>Status</th><th /></tr></thead>
                <tbody>
                  {rows.map((c) => (
                    <tr key={c.id} className={c.is_active ? "" : "row-off"}>
                      <td><b>{c.name}</b><div className="muted small">{[c.city, c.state].filter(Boolean).join(", ")}</div><div className="muted small">Added {fmtDate(c.created_at)}</div></td>
                      <td>{c.poc_name ? <><b>{c.poc_name}</b>{c.poc_designation && <span className="muted small"> · {c.poc_designation}</span>}<div className="small mono">{c.poc_phone}</div></> : <span className="muted">Not added</span>}</td>
                      <td>{c.doctors.join(", ") || "–"}</td>
                      <td className="num">{c.staff_count}</td>
                      <td className="num">{c.patient_count}</td>
                      <td>
                        {c.is_active ? <Badge tone="green">On</Badge> : <Badge tone="red">Turned off</Badge>}
                        {c.pending_count > 0 && <div><Link className="small" to="/admin/users?status=pending"><Badge tone="amber">{c.pending_count} waiting</Badge></Link></div>}
                      </td>
                      <td>
                        <div className="row gap">
                          <button className="btn small" onClick={() => setModal(c)}>Edit</button>
                          <button className="btn small ghost" onClick={() => toggle(c)}>{c.is_active ? "Turn off" : "Turn on"}</button>
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
      {modal && <ClinicModal clinic={modal.id ? modal : null} onClose={() => setModal(null)} onSaved={() => { setModal(null); list.reload(); }} />}
    </Page>
  );
}

function ClinicModal({ clinic, onClose, onSaved }) {
  const toast = useToast();
  const lists = useLists();
  const isNew = !clinic;
  const [v, setV] = useState(() => Object.fromEntries(Object.keys(BLANK).map((k) => [k, clinic ? clinic[k] ?? BLANK[k] : BLANK[k]])));
  const [edited, setEdited] = useState({}); // fields changed since the last save attempt
  const set = (k) => (e) => {
    setV((s) => ({ ...s, [k]: e.target.type === "checkbox" ? e.target.checked : e.target.value }));
    setEdited((s) => ({ ...s, [k]: true }));
  };
  const { submit, busy, fields: allFields, error } = useSubmit(
    () => { setEdited({}); return isNew ? api.post("/platform/clinics/", v) : api.patch(`/platform/clinics/${clinic.id}/`, v); },
    () => { toast(isNew ? "Clinic added" : "Clinic saved"); onSaved(); },
  );
  const fields = Object.fromEntries(Object.entries(allFields).filter(([k]) => !edited[k]));
  const states = lists.get("indian-states");
  const text = (k, label, props = {}) => (
    <Field label={label} error={fields[k]} hint={props.hint}><input className="input" value={v[k]} onChange={set(k)} {...props.input} /></Field>
  );

  return (
    <Modal title={isNew ? "Add a clinic" : `Edit ${clinic.name}`} onClose={onClose} wide>
      <form className="form" onSubmit={submit} noValidate>
        <h3 className="hsub">Clinic</h3>
        <div className="grid2">
          {text("name", "Clinic name *", { input: { autoFocus: true } })}
          {text("city", "City *")}
        </div>
        <div className="grid2">
          <Field label="State" error={fields.state}>
            {states.length ? (
              <select className="input" value={v.state} onChange={set("state")}>
                <option value="">Choose a state…</option>
                {states.map((s) => <option key={s.code} value={s.label}>{s.label}</option>)}
                {v.state && !states.some((s) => s.label === v.state) && <option value={v.state}>{v.state}</option>}
              </select>
            ) : <input className="input" value={v.state} onChange={set("state")} />}
          </Field>
          {text("pincode", "Pincode", { input: { inputMode: "numeric", maxLength: 6 } })}
        </div>
        <Field label="Address" error={fields.address}><textarea className="input" rows={2} value={v.address} onChange={set("address")} /></Field>
        {text("location_url", "Map link", { hint: "A Google Maps link to the clinic", input: { type: "url", placeholder: "https://maps.google.com/..." } })}
        <div className="grid2">
          {text("phone", "Clinic phone", { hint: "Digits only. A landline needs the area code.", input: { inputMode: "tel" } })}
          {text("email", "Clinic email", { input: { type: "email" } })}
        </div>
        <div className="grid2">
          {text("registration_number", "Clinic registration number", { hint: "Under the state Clinical Establishments Act" })}
          {text("gst_number", "GST number")}
        </div>

        <h3 className="hsub">Point of contact</h3>
        <div className="grid2">
          {text("poc_name", "Contact person *")}
          {text("poc_designation", "Role at the clinic", { input: { placeholder: "Owner, manager…" } })}
        </div>
        <div className="grid2">
          {text("poc_phone", "Contact mobile number *", { hint: "10 digits", input: { inputMode: "numeric" } })}
          {text("poc_email", "Contact email", { input: { type: "email" } })}
        </div>

        <h3 className="hsub">For the platform team</h3>
        <Field label="Internal notes" hint="Never shown to the clinic" error={fields.admin_notes}><textarea className="input" rows={2} value={v.admin_notes} onChange={set("admin_notes")} /></Field>
        <label className="check">
          <input type="checkbox" checked={v.is_active} onChange={set("is_active")} />
          <span>Show this clinic in the sign-up list</span>
        </label>

        {error && !Object.keys(fields).length && <div className="note error">{error}</div>}
        {Object.keys(fields).length > 0 && <div className="note error" role="alert">Please fix the fields marked above.</div>}
        <div className="actions"><button type="button" className="btn ghost" onClick={onClose}>Cancel</button><button className="btn primary" disabled={busy}>{isNew ? "Add clinic" : "Save"}</button></div>
      </form>
    </Modal>
  );
}
