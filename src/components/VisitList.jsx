import { useState } from "react";
import { Link } from "react-router-dom";
import { api, fmtTime, fmtDate } from "../api/client";
import { useLists } from "../lists/useLists";
import { Badge, Field, Modal, STATUS_TONE, label, useSubmit, useToast } from "./ui";

const toLocalInput = (iso) => {
  const d = new Date(iso);
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().slice(0, 16);
};

// A list of appointments with one-tap Start / Complete / No-show, plus Cancel (with a reason) and Reschedule.
// `chairs` is an optional [{id, name, status}] list used to show the chair name.
export default function VisitList({ visits, chairs = [], onChange, showDate = false, canEdit = true }) {
  const toast = useToast();
  const [modal, setModal] = useState(null); // { type: "cancel" | "move", visit }
  const chairName = (id) => chairs.find((c) => c.id === id)?.name;

  const setStatus = async (v, status) => {
    try {
      await api.patch(`/visits/${v.id}/`, { status });
      toast(status === "in_progress" ? "Visit started" : status === "completed" ? "Visit completed. Chair is locked until hygiene photos are in." : "Updated");
      onChange?.();
    } catch (e) {
      toast(e.message, "bad");
    }
  };
  const done = () => { setModal(null); onChange?.(); };

  return (
    <>
      <ul className="list">
        {visits.map((v) => {
          const open = ["booked", "confirmed", "reschedule"].includes(v.status);
          return (
            <li key={v.id} className="list-row">
              <div className="time">
                <b>{fmtTime(v.scheduled_at)}</b>
                {v.end_at && <span>to {fmtTime(v.end_at)}</span>}
                {showDate && <span>{fmtDate(v.scheduled_at)}</span>}
              </div>
              <div className="grow">
                {v.patient_name ? <Link to={`/patients/${v.patient}`}><b>{v.patient_name}</b></Link> : <b>Visit #{v.id}</b>}
                <div className="muted small">
                  {chairName(v.chair) || "No chair"}{v.notes ? ` · ${v.notes}` : ""}
                </div>
              </div>
              <Badge tone={STATUS_TONE[v.status]}>{label(v.status)}</Badge>
              {canEdit && (
                <div className="row gap wrap">
                  {open && <button className="btn small primary" onClick={() => setStatus(v, "in_progress")}>Start</button>}
                  {v.status === "in_progress" && <button className="btn small primary" onClick={() => setStatus(v, "completed")}>Complete</button>}
                  {open && <button className="btn small" onClick={() => setModal({ type: "move", visit: v })}>Reschedule</button>}
                  {open && <button className="btn small ghost" onClick={() => setStatus(v, "no_show")}>No-show</button>}
                  {open && <button className="btn small ghost" onClick={() => setModal({ type: "cancel", visit: v })}>Cancel</button>}
                </div>
              )}
            </li>
          );
        })}
      </ul>
      {modal?.type === "cancel" && <CancelModal visit={modal.visit} onClose={() => setModal(null)} onDone={done} />}
      {modal?.type === "move" && <MoveModal visit={modal.visit} onClose={() => setModal(null)} onDone={done} />}
    </>
  );
}

function CancelModal({ visit, onClose, onDone }) {
  const toast = useToast();
  const lists = useLists();
  const [reason, setReason] = useState("");
  const { submit, busy, fields, error } = useSubmit(() => {
    if (!reason) throw new Error("Choose a reason so the clinic can see why visits are lost.");
    return api.patch(`/visits/${visit.id}/`, { status: "cancelled", cancel_reason: reason });
  }, () => { toast("Visit cancelled"); onDone(); });
  return (
    <Modal title="Cancel this visit" onClose={onClose}>
      <form className="form" onSubmit={submit} noValidate>
        <Field label="Why is it cancelled?" error={fields.cancel_reason}>
          <select className="input" value={reason} onChange={(e) => setReason(e.target.value)} autoFocus>
            <option value="">Choose a reason…</option>
            {lists.get("cancellation-reasons").map((o) => <option key={o.code} value={o.code}>{o.label}</option>)}
          </select>
        </Field>
        {error && !fields.cancel_reason && <div className="note error">{error}</div>}
        <div className="actions"><button type="button" className="btn ghost" onClick={onClose}>Keep visit</button><button className="btn primary" disabled={busy}>Cancel visit</button></div>
      </form>
    </Modal>
  );
}

function MoveModal({ visit, onClose, onDone }) {
  const toast = useToast();
  const [when, setWhen] = useState(toLocalInput(visit.scheduled_at));
  const { submit, busy, fields, error } = useSubmit(() => {
    if (!when) throw new Error("Choose a new date and time.");
    return api.post(`/visits/${visit.id}/reschedule/`, { scheduled_at: new Date(when).toISOString() });
  }, () => { toast("Visit moved"); onDone(); });
  return (
    <Modal title="Reschedule visit" onClose={onClose}>
      <form className="form" onSubmit={submit} noValidate>
        <Field label="New date and time" error={fields.scheduled_at}><input className="input" type="datetime-local" value={when} onChange={(e) => setWhen(e.target.value)} autoFocus /></Field>
        {error && !fields.scheduled_at && <div className="note error">{error}</div>}
        <div className="actions"><button type="button" className="btn ghost" onClick={onClose}>Cancel</button><button className="btn primary" disabled={busy}>Move visit</button></div>
      </form>
    </Modal>
  );
}
