import { useState } from "react";
import { api, fmtDateTime } from "../api/client";
import { Async, Badge, Card, Page, label, useLoad } from "../components/ui";

const GROUPS = [["", "Everything"], ["login", "Sign-ins"], ["list", "List changes"], ["user", "Account changes"], ["admin", "Admin created"], ["clinic", "Clinics"], ["visit", "Appointments"], ["history", "Medical history"]];
const tone = (a) => (a === "login.failed" ? "red" : a.startsWith("login") ? "blue" : a.startsWith("list") ? "teal" : "amber");

function detailText(d) {
  if (!d || !Object.keys(d).length) return "";
  return Object.entries(d).map(([k, v]) => `${label(k)}: ${Array.isArray(v) ? v.join(", ") : v}`).join(" · ");
}

export default function Audit() {
  const [f, setF] = useState({ action: "", q: "" });
  const [page, setPage] = useState(1);
  const set = (k) => (e) => { setF((s) => ({ ...s, [k]: e.target.value })); setPage(1); };
  const res = useLoad(() => api.get("/platform/audit/", { ...f, page: page > 1 ? page : "" }), [f.action, f.q, page]);
  return (
    <Page title="Audit log" subtitle="Who did what and when. Entries cannot be edited or deleted from the app.">
      <div className="row gap wrap">
        <select className="input date" value={f.action} onChange={set("action")} aria-label="Filter by kind of event">{GROUPS.map(([v, t]) => <option key={v} value={v}>{t}</option>)}</select>
        <input className="input search" placeholder="Search a person or action" value={f.q} onChange={set("q")} aria-label="Search the audit log" />
      </div>
      <Card>
        <Async state={{ ...res, data: res.data ? res.data.results : null }} empty="No events match.">
          {(rows) => (
            <>
              <div className="table-wrap">
                <table className="table">
                  <thead><tr><th>When</th><th>Who</th><th>What</th><th>Details</th><th>From</th></tr></thead>
                  <tbody>
                    {rows.map((e) => (
                      <tr key={e.id}>
                        <td className="small">{fmtDateTime(e.created_at)}</td>
                        <td><b>{e.user_label || "Unknown"}</b><div className="muted small">{e.role ? label(e.role) : ""}{e.clinic_name ? ` · ${e.clinic_name}` : ""}</div></td>
                        <td><Badge tone={tone(e.action)}>{e.action}</Badge>{e.object_type && <div className="muted small">{e.object_type} {e.object_id}</div>}</td>
                        <td className="small">{detailText(e.detail)}</td>
                        <td className="small mono">{e.ip || ""}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="row gap spread">
                <span className="muted small">{res.data.count} events</span>
                <div className="row gap">
                  <button className="btn small" disabled={!res.data.previous} onClick={() => setPage((p) => p - 1)}>← Newer</button>
                  <button className="btn small" disabled={!res.data.next} onClick={() => setPage((p) => p + 1)}>Older →</button>
                </div>
              </div>
            </>
          )}
        </Async>
      </Card>
    </Page>
  );
}
