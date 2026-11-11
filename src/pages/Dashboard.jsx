import { Link } from "react-router-dom";
import { api, rupees, todayStr } from "../api/client";
import { useAuth } from "../auth/AuthContext";
import { Async, Badge, Card, Page, STATUS_TONE, Stat, label, useLoad } from "../components/ui";
import VisitList from "../components/VisitList";
import PatientHome from "./PatientHome";

export default function Dashboard() {
  const { user } = useAuth();
  if (user.role === "patient") return <PatientHome />;
  return <StaffToday user={user} />;
}

function StaffToday({ user }) {
  const isDoctor = user.role === "doctor";
  const today = useLoad(() => Promise.all([api.list("/visits/", { date: todayStr() }), api.list("/chairs/")]), []);
  const summary = useLoad(() => (isDoctor ? api.get("/dashboard/") : Promise.resolve(null)), [isDoctor]);
  const s = summary.data;

  return (
    <Page
      title={`Hello, ${/^dr\.?\s/i.test(user.name || "") ? user.name : user.name?.split(" ")[0] || "there"}`}
      subtitle={new Date().toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long" })}
      actions={<>
        <Link className="btn primary" to="/patients?new=1">+ Register patient</Link>
        <Link className="btn" to="/appointments?new=1">+ Book visit</Link>
      </>}
    >
      {isDoctor && s && (
        <div className="stats">
          <Stat label="Visits today" value={s.visits_today} />
          <Stat label="Photos to review" value={s.hygiene_photos_to_review} tone={s.hygiene_photos_to_review ? "warn" : ""} />
          <Stat label="Locked chairs" value={s.locked_chairs} tone={s.locked_chairs ? "bad" : ""} />
          <Stat label="Low stock items" value={s.low_stock_items} tone={s.low_stock_items ? "warn" : ""} />
          <Stat label="Documents expiring (60 days)" value={s.documents_expiring_in_60_days} tone={s.documents_expiring_in_60_days ? "warn" : ""} />
          <Stat label="Dues" value={rupees(s.dues)} />
          <Stat label="Rating (30 days)" value={s.average_rating_30_days ?? "–"} />
        </div>
      )}
      {isDoctor && summary.error && <p className="muted small">Summary unavailable: {summary.error}</p>}

      <div className="split">
        <Card title="Today's appointments" actions={<Link to="/appointments">All appointments</Link>}>
          <Async state={today} empty="No appointments today.">
            {([visits, chairs]) => (visits.length
              ? <VisitList visits={visits} chairs={chairs} onChange={() => { today.reload(); summary.reload(); }} canEdit />
              : <p className="muted">No appointments today.</p>)}
          </Async>
        </Card>

        <Card title="Chairs" actions={user.role !== "consultant" && <Link to="/hygiene">Hygiene</Link>}>
          <Async state={today} empty="No chairs set up.">
            {([, chairs]) => (chairs.length ? (
              <ul className="list">
                {chairs.map((c) => (
                  <li key={c.id} className="list-row">
                    <b className="grow">{c.name}</b>
                    <Badge tone={STATUS_TONE[c.status]}>{label(c.status)}</Badge>
                  </li>
                ))}
              </ul>
            ) : <p className="muted">No chairs set up yet.</p>)}
          </Async>
          <p className="muted small">A chair stays locked after a patient until all 4 hygiene photos are submitted.</p>
        </Card>
      </div>
    </Page>
  );
}
