import { Link } from "react-router-dom";
import { api, fmtTime, fmtDate } from "../api/client";
import { Badge, STATUS_TONE, label, useToast } from "./ui";

// A list of appointments with one-tap Start / Complete / No-show buttons.
// `chairs` is an optional [{id, name, status}] list used to show the chair name.
export default function VisitList({ visits, chairs = [], onChange, showDate = false, canEdit = true }) {
  const toast = useToast();
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

  return (
    <ul className="list">
      {visits.map((v) => {
        const open = ["booked", "confirmed", "reschedule"].includes(v.status);
        return (
          <li key={v.id} className="list-row">
            <div className="time">
              <b>{fmtTime(v.scheduled_at)}</b>
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
              <div className="row gap">
                {open && <button className="btn small primary" onClick={() => setStatus(v, "in_progress")}>Start</button>}
                {v.status === "in_progress" && <button className="btn small primary" onClick={() => setStatus(v, "completed")}>Complete</button>}
                {open && <button className="btn small ghost" onClick={() => setStatus(v, "no_show")}>No-show</button>}
              </div>
            )}
          </li>
        );
      })}
    </ul>
  );
}
