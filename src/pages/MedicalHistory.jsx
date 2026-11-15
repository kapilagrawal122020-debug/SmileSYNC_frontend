import { useState } from "react";
import { api, fmtDateTime } from "../api/client";
import { Badge, Card, Field, Modal, useSubmit, useToast } from "../components/ui";
import { useLists } from "../lists/useLists";

// The four parts of the checklist, and the master list each one draws from.
const PARTS = [
  { part: "conditions", list: "medical-conditions", title: "Medical conditions" },
  { part: "allergies", list: "allergies", title: "Allergies", warn: true },
  { part: "medicines", list: "flagged-medications", title: "Medicines that matter in dentistry", warn: true },
  { part: "habits", list: "habits", title: "Habits" },
];

// Red strip shown above the tabs on every patient screen, so an allergy is never missed.
export function HistoryBanner({ history, onOpen }) {
  if (!history) return null;
  if (!history.exists) {
    return (
      <div className="alert-banner amber" role="status">
        <b>Medical history not taken yet.</b> Ask about allergies and medicines before any treatment.
        {onOpen && <button className="btn small link" onClick={onOpen}>Record it now</button>}
      </div>
    );
  }
  if (!history.alerts.length) return null;
  return (
    <div className="alert-banner" role="alert">
      <b>Check before treating:</b>
      {history.alerts.map((a) => <span key={`${a.kind}-${a.code}`} className="tag">{a.kind === "allergy" ? "Allergy: " : a.kind === "medicine" ? "Takes: " : ""}{a.label}</span>)}
      {onOpen && <button className="btn small link" onClick={onOpen}>Open history</button>}
    </div>
  );
}

export function HistoryCard({ history, canEdit, onEdit }) {
  const lists = useLists();
  const name = (list, code) => lists.label(list, code);
  return (
    <Card title="Medical history" actions={canEdit && <button className="btn small" onClick={onEdit}>{history?.exists ? "Review and update" : "Record history"}</button>}>
      {!history?.exists ? <p className="muted">Nothing recorded yet.</p> : (
        <div className="hgroup">
          {PARTS.map(({ part, list, title, warn }) => (
            <div key={part}>
              <div className="hsub">{title}</div>
              {history[part].length
                ? <div className="row gap wrap">{history[part].map((c) => <Badge key={c} tone={warn ? "red" : "teal"}>{name(list, c)}</Badge>)}</div>
                : <span className="muted small">None reported</span>}
            </div>
          ))}
          {history.notes && <div><div className="hsub">Notes</div><p>{history.notes}</p></div>}
          <p className="muted small">Reviewed {fmtDateTime(history.reviewed_at)}{history.reviewed_by_name ? ` by ${history.reviewed_by_name}` : ""} · {history.versions} review{history.versions === 1 ? "" : "s"} on file</p>
        </div>
      )}
    </Card>
  );
}

export function HistoryModal({ patientId, history, onClose, onSaved }) {
  const toast = useToast();
  const lists = useLists();
  const [v, setV] = useState({
    conditions: history?.conditions || [], allergies: history?.allergies || [], medicines: history?.medicines || [], habits: history?.habits || [],
    notes: history?.notes || "",
  });
  const toggle = (part, code) => setV((s) => ({ ...s, [part]: s[part].includes(code) ? s[part].filter((c) => c !== code) : [...s[part], code] }));
  const { submit, busy, fields, error } = useSubmit(() => api.post(`/patients/${patientId}/history/`, v), (res) => { toast("Medical history saved"); onSaved(res); });

  return (
    <Modal title="Medical history" onClose={onClose} wide>
      <form className="form" onSubmit={submit} noValidate>
        <p className="muted small">Tap everything that applies. Saving keeps the earlier review on file and adds a new one.</p>
        {!lists.ready && <div className="muted small">Loading choices…</div>}
        {PARTS.map(({ part, list, title, warn }) => {
          const groups = {};
          lists.get(list).forEach((o) => { (groups[o.group || ""] ||= []).push(o); });
          return (
            <Field key={part} label={title} error={fields[part]} className="hgroup">
              {lists.ready && lists.get(list).length === 0 && <span className="muted small">No choices in this list yet. The platform admin can add them.</span>}
              {Object.entries(groups).map(([g, opts]) => (
                <div key={g}>
                  {g && <div className="hsub">{g}</div>}
                  <div className="chipset">
                    {opts.map((o) => (
                      <button type="button" key={o.code} className={`tchip ${warn ? "warn" : ""}`} aria-pressed={v[part].includes(o.code)} onClick={() => toggle(part, o.code)}>{o.label}</button>
                    ))}
                  </div>
                </div>
              ))}
            </Field>
          );
        })}
        <Field label="Notes" error={fields.notes}><textarea className="input" rows={2} value={v.notes} onChange={(e) => setV((s) => ({ ...s, notes: e.target.value }))} /></Field>
        {error && !Object.keys(fields).length && <div className="note error">{error}</div>}
        <div className="actions"><button type="button" className="btn ghost" onClick={onClose}>Cancel</button><button className="btn primary" disabled={busy}>{busy ? "Saving…" : "Save history"}</button></div>
      </form>
    </Modal>
  );
}
