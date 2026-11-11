import { useRef, useState } from "react";
import { api, fmtDateTime, fmtTime, todayStr } from "../api/client";
import { useAuth } from "../auth/AuthContext";
import { Async, Badge, Card, Empty, Field, Page, SecureImage, STATUS_TONE, Stat, buildBody, label, useLoad, useToast } from "../components/ui";

// Same areas the backend accepts.
const AFTER = [["spit_basin", "Spit basin and tray"], ["chair_seat", "Chair seating area"], ["suction_tips", "Suction tips"], ["rotors", "Rotors and instruments"]];
const DAILY = [["waiting", "Waiting area"], ["reception", "Reception"], ["operatories", "Operatories"], ["washroom", "Washroom"], ["pantry", "Pantry"], ["storage", "Instrument and medicine storage"]];

export default function Hygiene() {
  const { user } = useAuth();
  const isDoctor = user.role === "doctor";
  const data = useLoad(() => Promise.all([
    api.list("/hygiene/checks/"), api.list("/chairs/"), api.list("/visits/", { status: "completed" }),
  ]), []);

  return (
    <Page title="Hygiene" subtitle="Photo-verified checks. Take the photo with the camera; each photo is time-stamped by the server.">
      <Async state={data}>
        {([checks, chairs, completed]) => (
          <>
            {isDoctor && <ReviewQueue checks={checks} reload={data.reload} />}
            <AfterPatient checks={checks} chairs={chairs} visits={completed} reload={data.reload} />
            <Rounds checks={checks} reload={data.reload} />
          </>
        )}
      </Async>
    </Page>
  );
}

// Upload one photo for one area. Used by both sections below.
function useUpload(reload) {
  const toast = useToast();
  const [busyKey, setBusyKey] = useState("");
  const upload = async (key, fields, file) => {
    setBusyKey(key);
    try {
      await api.post("/hygiene/checks/", buildBody(fields, "photo", file));
      toast("Photo submitted");
      reload();
    } catch (e) { toast(e.message, "bad"); } finally { setBusyKey(""); }
  };
  return { upload, busyKey };
}

function Slot({ name, check, busy, onFile }) {
  const input = useRef(null);
  const tone = check ? STATUS_TONE[check.status] : "gray";
  return (
    <div className="slot">
      <div className="slot-photo">{check ? <SecureImage url={check.photo_url} alt={name} /> : <div className="img-ph">No photo</div>}</div>
      <b>{name}</b>
      <div className="row gap wrap">
        <Badge tone={tone}>{check ? label(check.status) : "Missing"}</Badge>
        {check?.review_note && <span className="muted small">{check.review_note}</span>}
      </div>
      {(!check || check.status === "redo") && (
        <>
          <button className="btn small primary" disabled={busy} onClick={() => input.current.click()}>{busy ? "Uploading…" : check ? "Retake photo" : "Take photo"}</button>
          <input ref={input} type="file" accept="image/*" capture="environment" hidden onChange={(e) => { const f = e.target.files?.[0]; if (f) onFile(f); e.target.value = ""; }} />
        </>
      )}
    </div>
  );
}

function AfterPatient({ checks, chairs, visits, reload }) {
  const { upload, busyKey } = useUpload(reload);
  const [visitId, setVisitId] = useState("");
  // Visits whose chair is waiting for photos come first.
  const lockedIds = new Set(chairs.filter((c) => c.status === "locked").map((c) => c.id));
  const candidates = [...visits].filter((v) => v.chair).sort((a, b) => Number(lockedIds.has(b.chair)) - Number(lockedIds.has(a.chair)) || b.scheduled_at.localeCompare(a.scheduled_at)).slice(0, 12);
  const chosen = visitId || String(candidates[0]?.id || "");
  const visit = candidates.find((v) => String(v.id) === chosen);
  const mine = checks.filter((c) => c.kind === "after_patient" && String(c.visit) === chosen);
  const done = AFTER.filter(([k]) => mine.some((c) => c.area === k && c.status !== "redo")).length;
  const chair = chairs.find((c) => c.id === visit?.chair);

  return (
    <Card title="After every patient (4 photos)">
      <div className="stats small">
        {chairs.map((c) => <Stat key={c.id} label={c.name} value={label(c.status)} tone={c.status === "locked" ? "bad" : c.status === "in_use" ? "warn" : ""} />)}
      </div>
      {!candidates.length ? <Empty>No completed visits yet. After a visit is completed its chair locks until these photos are in.</Empty> : (
        <>
          <Field label="Visit">
            <select className="input" value={chosen} onChange={(e) => setVisitId(e.target.value)}>
              {candidates.map((v) => <option key={v.id} value={v.id}>{v.patient_name} · {fmtDateTime(v.scheduled_at)} · {chairs.find((c) => c.id === v.chair)?.name}</option>)}
            </select>
          </Field>
          <p className="muted">
            {done} of 4 photos submitted{chair && ` · ${chair.name} is ${label(chair.status).toLowerCase()}`}.
            {chair?.status === "locked" && " It unlocks when all 4 are in."}
          </p>
          <div className="slots">
            {AFTER.map(([area, name]) => {
              const check = mine.find((c) => c.area === area && c.status !== "redo") || mine.find((c) => c.area === area);
              return <Slot key={area} name={name} check={check} busy={busyKey === area} onFile={(f) => upload(area, { kind: "after_patient", area, visit: chosen }, f)} />;
            })}
          </div>
        </>
      )}
    </Card>
  );
}

function Rounds({ checks, reload }) {
  const { upload, busyKey } = useUpload(reload);
  const [kind, setKind] = useState(new Date().getHours() < 15 ? "morning" : "evening");
  const today = todayStr();
  const mine = checks.filter((c) => c.kind === kind && new Date(c.taken_at).toLocaleDateString("en-CA") === today);
  const done = DAILY.filter(([k]) => mine.some((c) => c.area === k && c.status !== "redo")).length;
  return (
    <Card title="Morning and evening rounds (6 areas)" actions={
      <div className="seg">
        {["morning", "evening"].map((k) => <button key={k} className={kind === k ? "on" : ""} onClick={() => setKind(k)}>{label(k)}</button>)}
      </div>
    }>
      <p className="muted">{done} of 6 areas done today. The doctor is alerted if a round is missed.</p>
      <div className="slots">
        {DAILY.map(([area, name]) => {
          const check = mine.find((c) => c.area === area && c.status !== "redo") || mine.find((c) => c.area === area);
          return <Slot key={area} name={name} check={check} busy={busyKey === `${kind}${area}`} onFile={(f) => upload(`${kind}${area}`, { kind, area }, f)} />;
        })}
      </div>
    </Card>
  );
}

function ReviewQueue({ checks, reload }) {
  const toast = useToast();
  const score = useLoad(() => api.get("/hygiene/checks/score/", { days: 30 }), []);
  const pending = checks.filter((c) => c.status === "pending");
  const [notes, setNotes] = useState({});

  const review = async (c, status) => {
    try {
      await api.post(`/hygiene/checks/${c.id}/review/`, { status, note: notes[c.id] || "" });
      toast(status === "approved" ? "Approved" : "Redo requested");
      reload(); score.reload();
    } catch (e) { toast(e.message, "bad"); }
  };
  const area = (c) => [...AFTER, ...DAILY].find(([k]) => k === c.area)?.[1] || label(c.area);

  return (
    <Card title="Review queue" actions={score.data && <Badge tone="teal">Compliance (30 days): {score.data.score ?? "–"}{score.data.score !== null && "%"}</Badge>}>
      {!pending.length ? <Empty>Nothing waiting for review.</Empty> : (
        <div className="slots">
          {pending.map((c) => (
            <div className="slot" key={c.id}>
              <div className="slot-photo"><SecureImage url={c.photo_url} alt={area(c)} /></div>
              <b>{area(c)}</b>
              <span className="muted small">{label(c.kind)} · {fmtTime(c.taken_at)}</span>
              <input className="input" placeholder="Note (for a redo)" value={notes[c.id] || ""} onChange={(e) => setNotes((n) => ({ ...n, [c.id]: e.target.value }))} />
              <div className="row gap">
                <button className="btn small primary" onClick={() => review(c, "approved")}>Approve</button>
                <button className="btn small" onClick={() => review(c, "redo")}>Redo</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}
