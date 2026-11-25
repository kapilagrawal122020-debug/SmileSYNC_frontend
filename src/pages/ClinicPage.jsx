import { Link, useParams } from "react-router-dom";
import { api } from "../api/client";
import { Async, Card, Page, useLoad } from "../components/ui";

// A clinic's public page: what it publishes about itself, and the doors in (patients and team sign in or join here).
export default function ClinicPage() {
  const { slug } = useParams();
  const clinic = useLoad(() => api.get(`/public/clinics/${slug}/`), [slug]);

  return (
    <Page title={clinic.data?.name || "Clinic"} subtitle={clinic.data ? [clinic.data.city, clinic.data.state].filter(Boolean).join(", ") : undefined}
      actions={<Link className="btn ghost" to="/">← All clinics</Link>}>
      <Async state={clinic}>
        {(c) => {
          const links = [["Map", c.location_url], ["Website", c.website_url], ["Google reviews", c.google_review_url], ["Social", c.social_url]].filter(([, u]) => u);
          return (
            <>
              <Card title="About">
                {c.about ? <p>{c.about}</p> : <p className="muted">This clinic has not added a description yet.</p>}
                <dl className="dl">
                  {c.timings && <div><dt>Timings</dt><dd>{c.timings}</dd></div>}
                  {(c.address || c.pincode) && <div><dt>Address</dt><dd>{[c.address, c.city, c.pincode].filter(Boolean).join(", ")}</dd></div>}
                  {c.phone && <div><dt>Phone</dt><dd><a href={`tel:${c.phone}`} className="mono">{c.phone}</a></dd></div>}
                  {c.email && <div><dt>Email</dt><dd><a href={`mailto:${c.email}`}>{c.email}</a></dd></div>}
                </dl>
                {links.length > 0 && <p className="row gap wrap">{links.map(([n, u]) => <a key={n} className="btn small" href={u} target="_blank" rel="noreferrer">{n} ↗</a>)}</p>}
              </Card>

              {c.doctors.length > 0 && (
                <Card title="Doctors">
                  <ul className="list">
                    {c.doctors.map((d, i) => (
                      <li key={i} className="list-row"><div className="grow"><b>{d.name}</b> <span className="muted">{[d.designation, d.speciality].filter(Boolean).join(" · ")}</span></div></li>
                    ))}
                  </ul>
                </Card>
              )}

              <div className="split">
                <Card title="Patients">
                  <p className="muted">See your records, scans, invoices and visits at {c.name}.</p>
                  <div className="row gap wrap">
                    <Link className="btn primary" to={`/login?clinic=${c.id}&as=patient`}>Patient sign in</Link>
                    <Link className="btn" to={`/signup?clinic=${c.id}&role=patient`}>Register as a patient</Link>
                  </div>
                </Card>
                <Card title="Clinic team">
                  <p className="muted">Doctors, consultants and assistants of {c.name}.</p>
                  <div className="row gap wrap">
                    <Link className="btn primary" to={`/login?clinic=${c.id}`}>Team sign in</Link>
                    <Link className="btn" to={`/signup?clinic=${c.id}&role=doctor`}>Ask to join the team</Link>
                  </div>
                </Card>
              </div>
            </>
          );
        }}
      </Async>
    </Page>
  );
}
