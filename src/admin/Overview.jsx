import { Link } from "react-router-dom";
import { api, fmtDate } from "../api/client";
import { Async, Card, Page, Stat, label, useLoad } from "../components/ui";

export default function Overview() {
  const ov = useLoad(() => api.get("/platform/overview/"), []);
  return (
    <Page title="Platform overview" subtitle="Clinics, accounts and lists across SmileSYNC. Patient records are never shown here.">
      <Async state={ov}>
        {(d) => (
          <>
            <div className="stats">
              <Stat label="Clinics" value={d.clinics} />
              <Stat label="Patients (count only)" value={d.patients} />
              <Stat label="Visits, last 30 days" value={d.visits_30_days} />
              <Stat label="Master lists" value={d.lists.count} />
              <Stat label="List values" value={d.lists.values} />
              <Stat label="Audit events, 7 days" value={d.audit_events_7_days} />
            </div>
            <div className="split">
              <Card title="Newest clinics" actions={<Link to="/admin/clinics">All clinics</Link>}>
                {d.recent_clinics.length ? (
                  <div className="table-wrap">
                    <table className="table">
                      <thead><tr><th>Clinic</th><th>City</th><th className="num">Staff</th><th className="num">Patients</th><th>Joined</th></tr></thead>
                      <tbody>
                        {d.recent_clinics.map((c) => (
                          <tr key={c.id}><td><b>{c.name}</b></td><td>{c.city || "–"}</td><td className="num">{c.staff_count}</td><td className="num">{c.patient_count}</td><td>{fmtDate(c.created_at)}</td></tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : <p className="muted">No clinics yet. A doctor signs up from the sign-up screen.</p>}
              </Card>
              <Card title="Accounts by role" actions={<Link to="/admin/users">Manage</Link>}>
                <ul className="list">
                  {Object.entries(d.staff_by_role).map(([role, n]) => (
                    <li key={role} className="list-row"><span className="grow">{label(role)}</span><b>{n}</b></li>
                  ))}
                  <li className="list-row"><span className="grow">Platform admins</span><b>{d.super_admins}</b></li>
                </ul>
              </Card>
            </div>
            <Card title="Shortcuts">
              <div className="row gap wrap">
                <Link className="btn" to="/admin/lists">Edit dropdown lists</Link>
                <Link className="btn" to="/admin/audit">Open the audit log</Link>
              </div>
              <p className="muted small">The platform admin manages lists, clinics and accounts. Patient and clinical records stay inside each clinic and are not available from this menu.</p>
            </Card>
          </>
        )}
      </Async>
    </Page>
  );
}
