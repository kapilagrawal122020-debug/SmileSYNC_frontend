import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { api, todayStr } from "../api/client";
import { Async, Card, Field, Modal, Page, useLoad, useSubmit, useToast } from "../components/ui";
import VisitList from "../components/VisitList";

const shiftDay = (str, n) => { const d = new Date(`${str}T00:00:00`); d.setDate(d.getDate() + n); return d.toLocaleDateString("en-CA"); };

export default function Appointments() {
  const [params, setParams] = useSearchParams();
  const [date, setDate] = useState(todayStr());
  const [booking, setBooking] = useState(params.get("new") === "1");
  const list = useLoad(() => Promise.all([api.list("/visits/", { date }), api.list("/chairs/")]), [date]);

  const closeBooking = () => { setBooking(false); if (params.get("new")) setParams({}); };
  const pretty = new Date(`${date}T00:00:00`).toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long" });

  return (
    <Page title="Appointments" subtitle={pretty} actions={<button className="btn primary" onClick={() => setBooking(true)}>+ Book visit</button>}>
      <div className="row gap wrap">
        <button className="btn small" onClick={() => setDate(shiftDay(date, -1))}>← Previous</button>
        <input className="input date" type="date" value={date} onChange={(e) => e.target.value && setDate(e.target.value)} aria-label="Pick a date" />
        <button className="btn small" onClick={() => setDate(shiftDay(date, 1))}>Next →</button>
        {date !== todayStr() && <button className="btn small ghost" onClick={() => setDate(todayStr())}>Today</button>}
      </div>
      <Card>
        <Async state={list} empty="No appointments on this day.">
          {([visits, chairs]) => (visits.length
            ? <VisitList visits={visits} chairs={chairs} onChange={list.reload} />
            : <p className="muted">No appointments on this day.</p>)}
        </Async>
      </Card>
      {booking && <BookModal presetPatient={params.get("patient")} defaultDate={date} onClose={closeBooking} onSaved={(v) => { closeBooking(); setDate(new Date(v.scheduled_at).toLocaleDateString("en-CA")); list.reload(); }} />}
    </Page>
  );
}

function BookModal({ presetPatient, defaultDate, onClose, onSaved }) {
  const toast = useToast();
  const refs = useLoad(() => Promise.all([api.list("/patients/"), api.list("/users/"), api.list("/chairs/")]), []);
  const [v, setV] = useState({ patient: presetPatient || "", doctor: "", chair: "", when: `${defaultDate}T10:00`, notes: "" });
  const set = (k) => (e) => setV((s) => ({ ...s, [k]: e.target.value }));

  const { submit, busy, fields, error } = useSubmit(() => {
    if (!v.patient) throw new Error("Choose a patient.");
    if (!v.when) throw new Error("Choose a date and time.");
    return api.post("/visits/", {
      patient: Number(v.patient), doctor: v.doctor ? Number(v.doctor) : null, chair: v.chair ? Number(v.chair) : null,
      scheduled_at: new Date(v.when).toISOString(), notes: v.notes,
    });
  }, (visit) => { toast("Visit booked"); onSaved(visit); });

  const [patients, users, chairs] = refs.data || [[], [], []];
  const doctors = users.filter((u) => ["doctor", "consultant"].includes(u.role));

  return (
    <Modal title="Book a visit" onClose={onClose}>
      <Async state={refs}>
        {() => (
          <form onSubmit={submit} className="form" noValidate>
            <Field label="Patient" error={fields.patient}>
              <select className="input" value={v.patient} onChange={set("patient")} autoFocus>
                <option value="">Choose a patient…</option>
                {patients.map((p) => <option key={p.id} value={p.id}>{p.name} · {p.phone}</option>)}
              </select>
            </Field>
            <Field label="Date and time" error={fields.scheduled_at}><input className="input" type="datetime-local" value={v.when} onChange={set("when")} /></Field>
            <div className="grid2">
              <Field label="Doctor" error={fields.doctor}>
                <select className="input" value={v.doctor} onChange={set("doctor")}><option value="">Any</option>{doctors.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}</select>
              </Field>
              <Field label="Chair" error={fields.chair}>
                <select className="input" value={v.chair} onChange={set("chair")}><option value="">Any</option>{chairs.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select>
              </Field>
            </div>
            <Field label="Notes" error={fields.notes}><input className="input" value={v.notes} onChange={set("notes")} /></Field>
            {error && !Object.keys(fields).length && <div className="note error">{error}</div>}
            <div className="actions"><button type="button" className="btn ghost" onClick={onClose}>Cancel</button><button className="btn primary" disabled={busy}>{busy ? "Booking…" : "Book visit"}</button></div>
          </form>
        )}
      </Async>
    </Modal>
  );
}
