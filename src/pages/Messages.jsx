import { useState } from "react";
import { api, fmtDateTime } from "../api/client";
import { Async, Badge, Card, Field, Page, STATUS_TONE, label, useLoad, useSubmit, useToast } from "../components/ui";

export default function Messages() {
  const toast = useToast();
  const log = useLoad(() => api.list("/messages/"), []);
  const [template, setTemplate] = useState("");
  const [params, setParams] = useState("");
  const [result, setResult] = useState(null);

  const { submit, busy, fields, error } = useSubmit(
    () => api.post("/messages/broadcast/", { template: template.trim(), params: params.split(",").map((p) => p.trim()).filter(Boolean) }),
    (res) => { setResult(res); toast(`Sent to ${res.patients} patient${res.patients === 1 ? "" : "s"}`); log.reload(); }
  );

  return (
    <Page title="Messages" subtitle="WhatsApp reminders, offers and alerts. Reminders and doctor alerts go out automatically.">
      <Card title="Send an offer or camp message">
        <form onSubmit={submit} className="form" noValidate>
          <div className="grid2">
            <Field label="Approved template name" hint="Must be approved in Meta first, e.g. festive_offer" error={fields.template}>
              <input className="input" value={template} onChange={(e) => setTemplate(e.target.value)} placeholder="festive_offer" />
            </Field>
            <Field label="Template values" hint="Separate with commas, in order" error={fields.params}>
              <input className="input" value={params} onChange={(e) => setParams(e.target.value)} placeholder="Diwali, 20% off scaling" />
            </Field>
          </div>
          <p className="muted small">Only patients who agreed to WhatsApp messages receive this. Anyone who replied STOP is skipped.</p>
          {error && !Object.keys(fields).length && <div className="note error">{error}</div>}
          {result && <div className="note info">Reached {result.patients} patient(s). {Object.entries(result.results || {}).map(([k, n]) => `${label(k)}: ${n}`).join(", ")}</div>}
          <div className="actions"><button className="btn primary" disabled={busy}>{busy ? "Sending…" : "Send to consenting patients"}</button></div>
        </form>
      </Card>

      <Card title="Message log">
        <Async state={log} empty="No messages yet.">
          {(rows) => (
            <div className="table-wrap">
              <table className="table">
                <thead><tr><th>When</th><th>To</th><th>Type</th><th>Template</th><th>Status</th></tr></thead>
                <tbody>
                  {rows.map((m) => (
                    <tr key={m.id}>
                      <td>{fmtDateTime(m.created_at)}</td>
                      <td className="mono">{m.to_phone}</td>
                      <td>{label(m.kind)}</td>
                      <td className="mono">{m.template}</td>
                      <td><Badge tone={STATUS_TONE[m.status]}>{label(m.status)}</Badge>{m.error && <span className="muted small"> {m.error}</span>}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Async>
        <p className="muted small">"Dry run" means the backend has no WhatsApp credentials yet, so the message was logged but not sent.</p>
      </Card>
    </Page>
  );
}
