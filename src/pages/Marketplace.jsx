import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Async, Card } from "../components/ui";
import { useClinics } from "./ClinicPicker";

const place = (c) => [c.city, c.state].filter(Boolean).join(", ");

// The home page for everyone who is not signed in: find a clinic, open its page, sign in or join.
export default function Marketplace() {
  const clinics = useClinics();
  const [q, setQ] = useState("");
  const [city, setCity] = useState("");

  const all = clinics.data || [];
  const cities = useMemo(() => [...new Set(all.map((c) => c.city).filter(Boolean))].sort(), [all]);
  const needle = q.trim().toLowerCase();
  const shown = all.filter((c) => (!city || c.city === city) && (!needle || `${c.name} ${c.city} ${c.state} ${c.about}`.toLowerCase().includes(needle)));

  return (
    <div className="page">
      <section className="hero">
        <h1>Find a dental clinic</h1>
        <p className="muted">Browse clinics, see who treats there, then register or sign in to your own clinic.</p>
        <div className="row gap wrap">
          <input className="input search" placeholder="Search by clinic name or city" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search clinics" />
          {cities.length > 1 && (
            <select className="input date" value={city} onChange={(e) => setCity(e.target.value)} aria-label="Filter by city">
              <option value="">All cities</option>
              {cities.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          )}
        </div>
      </section>

      <Async state={clinics} empty="No clinic is listed yet. Please check back soon.">
        {() => (shown.length ? (
          <div className="clinic-grid">
            {shown.map((c) => (
              <Link key={c.id} to={`/c/${c.slug}`} className="clinic-card">
                <b>{c.name}</b>
                <span className="muted small">{place(c) || "Clinic"}</span>
                {c.about && <p>{c.about.length > 140 ? `${c.about.slice(0, 140)}…` : c.about}</p>}
                <span className="small muted">{c.timings}</span>
                <span className="small">{c.doctors.length ? `${c.doctors.length} ${c.doctors.length === 1 ? "doctor" : "doctors"}` : ""}</span>
              </Link>
            ))}
          </div>
        ) : (
          <Card><p className="muted">No clinic matches your search.</p></Card>
        ))}
      </Async>
    </div>
  );
}
