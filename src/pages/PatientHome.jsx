import { useState } from "react";
import { api, fmtDate, fmtDateTime, rupees } from "../api/client";
import { useAuth } from "../auth/AuthContext";
import { Async, Badge, Card, Empty, Modal, Page, SecureImage, STATUS_TONE, label, useLoad, useSubmit, useToast } from "../components/ui";

export function Stars({ value, onChange }) {
  return (
    <span className="stars" role={onChange ? "radiogroup" : "img"} aria-label={`${value || 0} out of 5`}>
      {[1, 2, 3, 4, 5].map((n) => (onChange
        ? <button type="button" key={n} className={n <= value ? "on" : ""} onClick={() => onChange(n)} aria-label={`${n} star${n > 1 ? "s" : ""}`}>★</button>
        : <span key={n} className={n <= value ? "on" : ""}>★</span>))}
    </span>
  );
}

// The patient's own view: appointments, scans, invoices and a way to rate the clinic.
export default function PatientHome() {
  const { user } = useAuth();
  const data = useLoad(() => Promise.all([
    api.list("/visits/"), api.list("/images/"), api.list("/invoices/"), api.list("/clinics/"), api.list("/patients/"), api.list("/advances/"),
  ]), []);
  const [open, setOpen] = useState(null);
  const [rating, setRating] = useState(false);

  return (
    <Page title={`Hello, ${user.name?.split(" ")[0] || "there"}`} subtitle="Your visits, scans and bills in one place.">
      <Async state={data}>
        {([visits, images, invoices, clinics, patients, advances]) => {
          const now = Date.now();
          const upcoming = visits.filter((v) => new Date(v.scheduled_at).getTime() >= now - 36e5 && !["cancelled", "no_show", "completed"].includes(v.status));
          const past = visits.filter((v) => !upcoming.includes(v)).reverse();
          const due = invoices.reduce((s, i) => s + Number(i.due), 0);
          const advanceLeft = advances.reduce((s, a) => s + Number(a.balance), 0);
          const review = clinics.find((c) => c.google_review_url)?.google_review_url;
          return (
            <>
              <div className="split">
                <Card title="Upcoming appointments">
                  {upcoming.length ? (
                    <ul className="list">
                      {upcoming.map((v) => (
                        <li key={v.id} className="list-row">
                          <div className="grow"><b>{fmtDateTime(v.scheduled_at)}</b><div className="muted small">{clinics.find((c) => c.id === patients.find((p) => p.id === v.patient)?.clinic)?.name}</div></div>
                          <Badge tone={STATUS_TONE[v.status]}>{label(v.status)}</Badge>
                        </li>
                      ))}
                    </ul>
                  ) : <p className="muted">No upcoming appointments. Call your clinic to book one.</p>}
                  <p className="muted small">You get a WhatsApp reminder before each visit. Reply 1 to confirm or 2 to reschedule.</p>
                </Card>
                <Card title="Bills">
                  {advanceLeft > 0 && (
                    <div className="advance-box">
                      <b className="money">Advance paid: {rupees(advanceLeft)} available</b>
                      <span className="muted small">Your clinic adjusts this against your bill.{due > 0 ? ` After that, ${rupees(Math.max(due - advanceLeft, 0))} is left to pay.` : ""}</span>
                    </div>
                  )}
                  <p className="big">{due > 0 ? <>Due: <b>{rupees(due)}</b></> : <>All paid <Badge tone="green">Thank you</Badge></>}</p>
                  {invoices.length ? (
                    <ul className="list">
                      {invoices.map((i) => (
                        <li key={i.id} className="list-row col">
                          <div className="row gap spread"><b>Invoice #{i.id}</b><Badge tone={Number(i.due) > 0 ? "amber" : "green"}>{Number(i.due) > 0 ? `Due ${rupees(i.due)}` : "Paid"}</Badge></div>
                          <div className="muted small">{fmtDate(i.created_at)} · {i.items.map((x) => x.description).join(", ")} · Total {rupees(i.total)}</div>
                        </li>
                      ))}
                    </ul>
                  ) : <Empty>No invoices yet.</Empty>}
                </Card>
              </div>

              <Card title="My scans and photos">
                {images.length ? (
                  <div className="gallery">
                    {images.map((im) => (
                      <button key={im.id} className="tile" onClick={() => setOpen(im)}>
                        <SecureImage url={im.file_url} alt={label(im.kind)} />
                        <span><b>{label(im.kind)}</b>{im.tooth && ` · ${im.tooth}`}{im.stage && ` · ${im.stage}`}<br /><small>{fmtDate(im.taken_at)}</small></span>
                      </button>
                    ))}
                  </div>
                ) : <Empty>Your X-rays and before/after photos will appear here.</Empty>}
              </Card>

              {past.length > 0 && (
                <Card title="Past visits">
                  <ul className="list">{past.map((v) => <li key={v.id} className="list-row"><b className="grow">{fmtDate(v.scheduled_at)}</b><Badge tone={STATUS_TONE[v.status]}>{label(v.status)}</Badge></li>)}</ul>
                </Card>
              )}

              <Card title="How was your visit?">
                <div className="row gap wrap">
                  <button className="btn primary" onClick={() => setRating(true)} disabled={!patients.length}>Rate your clinic</button>
                  {review && <a className="btn" href={review} target="_blank" rel="noreferrer">Review on Google ↗</a>}
                </div>
              </Card>

              {rating && <RateModal patient={patients[0]} onClose={() => setRating(false)} />}
            </>
          );
        }}
      </Async>
      {open && (
        <Modal title={label(open.kind)} onClose={() => setOpen(null)} wide>
          <SecureImage url={open.file_url} alt="Full size" className="full" />
          <p className="muted small">{open.stage && `${label(open.stage)} treatment · `}{fmtDateTime(open.taken_at)}</p>
        </Modal>
      )}
    </Page>
  );
}

function RateModal({ patient, onClose }) {
  const toast = useToast();
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const { submit, busy, error } = useSubmit(() => {
    if (!rating) throw new Error("Tap a star to rate.");
    return api.post("/feedback/", { patient: patient.id, rating, comment });
  }, () => { toast("Thank you for your feedback"); onClose(); });
  return (
    <Modal title="Rate your visit" onClose={onClose}>
      <form onSubmit={submit} className="form" noValidate>
        <Stars value={rating} onChange={setRating} />
        <textarea className="input" rows={3} placeholder="Tell us more (private to the clinic)" value={comment} onChange={(e) => setComment(e.target.value)} />
        {error && <div className="note error">{error}</div>}
        <div className="actions"><button type="button" className="btn ghost" onClick={onClose}>Cancel</button><button className="btn primary" disabled={busy}>Send</button></div>
      </form>
    </Modal>
  );
}
