import { useState } from "react";
import { api, fmtDate, rupees, todayStr } from "../api/client";
import { useAuth } from "../auth/AuthContext";
import { Async, Badge, Card, Field, Modal, Stat, useLoad, useSubmit, useToast } from "../components/ui";

const METHODS = { cash: "Cash", upi: "UPI", card: "Card", other: "Other", advance: "From advance" };
const methodOptions = ["cash", "upi", "card", "other"].map((m) => <option key={m} value={m}>{METHODS[m]}</option>);
const num = (x) => Number(x || 0);

// The Billing tab of a patient: money summary, advance payments (taken before billing), invoices and payments.
export default function Billing({ patientId }) {
  const { user } = useAuth();
  const toast = useToast();
  const isDoctor = user.role === "doctor"; // only the doctor refunds money or removes a wrong entry
  const summary = useLoad(() => api.get(`/patients/${patientId}/billing/`), [patientId]);
  const advances = useLoad(() => api.list("/advances/", { patient: patientId }), [patientId]);
  const invoices = useLoad(() => api.list("/invoices/", { patient: patientId }), [patientId]);
  const [modal, setModal] = useState(null); // { type: "advance" | "refund" | "invoice" | "pay" | "use", ... }

  const available = num(summary.data?.advance_balance);
  const reload = () => { summary.reload(); advances.reload(); invoices.reload(); };
  const close = () => setModal(null);
  const saved = () => { close(); reload(); };

  const removeAdvance = async (a) => {
    if (!window.confirm("Delete this advance entry? Only do this for a mistake. Use Refund to give money back.")) return;
    try {
      await api.del(`/advances/${a.id}/`);
      toast("Entry deleted");
      reload();
    } catch (e) { toast(e.message, "bad"); }
  };

  return (
    <>
      {summary.data && (
        <div className="stats small four">
          <Stat label="Billed" value={rupees(summary.data.billed)} />
          <Stat label="Paid" value={rupees(summary.data.paid)} />
          <Stat label="Due" value={rupees(summary.data.due)} tone={num(summary.data.due) > 0 ? "warn" : ""} />
          <Stat label="Advance available" value={rupees(available)} tone={available > 0 ? "credit" : ""} />
        </div>
      )}

      {summary.data && available > 0 && num(summary.data.due) > 0 && (
        <div className="advance-box">
          <b className="money">{rupees(available)} advance is not used on any invoice yet.</b>
          <span className="small">If you use it, {rupees(summary.data.due_after_advance)} is left to pay.</span>
        </div>
      )}

      <Card title="Advance payments" actions={<button className="btn small primary" onClick={() => setModal({ type: "advance" })}>+ Take advance</button>}>
        <Async state={advances} empty="No advance taken. Use “Take advance” when a patient pays before the treatment is billed.">
          {(rows) => (
            <ul className="list">
              {rows.map((a) => (
                <AdvanceRow key={a.id} a={a} isDoctor={isDoctor} onRefund={() => setModal({ type: "refund", advance: a })} onDelete={() => removeAdvance(a)} />
              ))}
            </ul>
          )}
        </Async>
      </Card>

      <Card title="Invoices and payments" actions={<button className="btn small primary" onClick={() => setModal({ type: "invoice" })}>+ New invoice</button>}>
        <Async state={invoices} empty="No invoices yet.">
          {(rows) => (
            <ul className="list">
              {rows.map((inv) => {
                const due = num(inv.due);
                const fromAdvance = num(inv.advance_applied);
                const percent = num(inv.total) > 0 ? Math.min(100, Math.round((num(inv.paid) / num(inv.total)) * 100)) : 0;
                return (
                  <li key={inv.id} className="list-row col">
                    <div className="row gap spread wrap">
                      <b>Invoice #{inv.id} <span className="muted small">· {fmtDate(inv.created_at)}</span></b>
                      <div className="row gap wrap">
                        <Badge tone={due > 0 ? "amber" : "green"}>{due > 0 ? `Due ${rupees(due)}` : "Paid"}</Badge>
                        {due > 0 && available > 0 && <button className="btn small" onClick={() => setModal({ type: "use", invoice: inv })}>Use advance</button>}
                        {due > 0 && <button className="btn small" onClick={() => setModal({ type: "pay", invoice: inv })}>Record payment</button>}
                      </div>
                    </div>
                    <div className="muted small">{inv.items.map((i) => `${i.description} ${rupees(i.amount)}`).join(" · ")}</div>
                    <div className="meter" role="img" aria-label={`Paid ${rupees(inv.paid)} of ${rupees(inv.total)}`}><span style={{ width: `${percent}%` }} /></div>
                    <div className="row spread wrap gap small money">
                      <span>Total <b>{rupees(inv.total)}</b></span>
                      <span>Paid <b>{rupees(inv.paid)}</b>{fromAdvance > 0 && <span className="muted"> (advance {rupees(fromAdvance)})</span>}</span>
                      <span className={due > 0 ? "text-due" : ""}>Due <b>{rupees(due)}</b></span>
                    </div>
                    {inv.payments?.length > 0 && (
                      <ul className="pay-lines muted small">
                        {inv.payments.map((p) => (
                          <li key={p.id} className="money">
                            {fmtDate(p.paid_at)} · {rupees(p.amount)} · {p.method === "advance" ? p.reference || "Advance" : METHODS[p.method] || p.method}
                            {p.method !== "advance" && p.reference ? ` (${p.reference})` : ""}
                          </li>
                        ))}
                      </ul>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </Async>
      </Card>

      {modal?.type === "advance" && <AdvanceModal patientId={patientId} onClose={close} onSaved={saved} />}
      {modal?.type === "refund" && <RefundModal advance={modal.advance} onClose={close} onSaved={saved} />}
      {modal?.type === "invoice" && <InvoiceModal patientId={patientId} available={available} onClose={close} onSaved={saved} />}
      {modal?.type === "use" && <UseAdvanceModal invoice={modal.invoice} available={available} onClose={close} onSaved={saved} />}
      {modal?.type === "pay" && <PaymentModal invoice={modal.invoice} onClose={close} onSaved={saved} />}
    </>
  );
}

// ---- one advance in the list ---------------------------------------------------------------
function AdvanceRow({ a, isDoctor, onRefund, onDelete }) {
  const left = num(a.balance);
  const used = num(a.used);
  const refunded = num(a.refunded);
  const untouched = used === 0 && refunded === 0;
  const status = left > 0
    ? <Badge tone="blue">{rupees(left)} left</Badge>
    : used > 0 ? <Badge tone="green">Fully used</Badge> : <Badge>Refunded</Badge>;

  return (
    <li className="list-row col">
      <div className="row gap spread wrap">
        <b className="money">{rupees(a.amount)} <span className="muted small">· {METHODS[a.method] || a.method}</span></b>
        {status}
      </div>
      <div className="muted small">
        {a.note || "No note"} · {fmtDate(a.received_at)}
        {a.received_by_name ? ` · taken by ${a.received_by_name}` : ""}{a.reference ? ` · ${a.reference}` : ""}
      </div>
      {!untouched && <div className="small money">Used {rupees(used)}{refunded > 0 ? ` · Refunded ${rupees(refunded)}` : ""}</div>}
      {a.refunds?.map((r) => (
        <div key={r.id} className="muted small money">Refunded {rupees(r.amount)} on {fmtDate(r.refunded_at)}{r.note ? ` · ${r.note}` : ""}</div>
      ))}
      {isDoctor && (left > 0 || untouched) && (
        <div className="row gap end wrap">
          {left > 0 && <button className="btn small" onClick={onRefund}>Refund</button>}
          {untouched && <button className="link text-bad" onClick={onDelete}>Delete entry</button>}
        </div>
      )}
    </li>
  );
}

// ---- take an advance ---------------------------------------------------------------------------
function AdvanceModal({ patientId, onClose, onSaved }) {
  const toast = useToast();
  const [v, setV] = useState({ amount: "", method: "cash", reference: "", note: "", date: todayStr() });
  const set = (k) => (e) => setV((s) => ({ ...s, [k]: e.target.value }));
  const { submit, busy, fields, error } = useSubmit(() => {
    if (!(num(v.amount) > 0)) throw new Error("Enter the advance amount.");
    const body = { patient: patientId, amount: num(v.amount), method: v.method, reference: v.reference.trim(), note: v.note.trim() };
    // Money taken on an earlier day keeps its real date. Today's advance just uses the server time.
    if (v.date && v.date !== todayStr()) body.received_at = new Date(`${v.date}T12:00:00`).toISOString();
    return api.post("/advances/", body);
  }, () => { toast("Advance recorded"); onSaved(); });

  return (
    <Modal title="Take advance" onClose={onClose}>
      <form onSubmit={submit} className="form" noValidate>
        <div className="grid2">
          <Field label="Amount (₹)" error={fields.amount}><input className="input" type="number" min="0" inputMode="decimal" value={v.amount} onChange={set("amount")} autoFocus /></Field>
          <Field label="Method"><select className="input" value={v.method} onChange={set("method")}>{methodOptions}</select></Field>
        </div>
        {v.method === "upi" && <Field label="UTR / reference" error={fields.reference}><input className="input" value={v.reference} onChange={set("reference")} /></Field>}
        <Field label="What is it for?" hint="For example: Braces, Root canal, Implant" error={fields.note}>
          <input className="input" maxLength={200} value={v.note} onChange={set("note")} />
        </Field>
        <Field label="Received on" hint="Change this if the money was taken on an earlier day." error={fields.received_at}>
          <input className="input date" type="date" max={todayStr()} value={v.date} onChange={set("date")} />
        </Field>
        {error && !fields.amount && !fields.received_at && <div className="note error" role="alert">{error}</div>}
        <div className="actions"><button type="button" className="btn ghost" onClick={onClose}>Cancel</button><button className="btn primary" disabled={busy}>Save advance</button></div>
      </form>
    </Modal>
  );
}

// ---- refund what is left (doctor) ----------------------------------------------------------
function RefundModal({ advance, onClose, onSaved }) {
  const toast = useToast();
  const [v, setV] = useState({ amount: String(advance.balance), note: "" });
  const set = (k) => (e) => setV((s) => ({ ...s, [k]: e.target.value }));
  const { submit, busy, fields, error } = useSubmit(
    () => api.post(`/advances/${advance.id}/refund/`, { amount: num(v.amount), note: v.note.trim() }),
    () => { toast("Refund recorded"); onSaved(); }
  );
  return (
    <Modal title="Refund advance" onClose={onClose}>
      <form onSubmit={submit} className="form" noValidate>
        <p className="muted">Advance of <b>{rupees(advance.amount)}</b>{advance.note ? ` (${advance.note})` : ""}. <b>{rupees(advance.balance)}</b> is left to refund.</p>
        <Field label="Refund amount (₹)" error={fields.amount}><input className="input" type="number" min="0" inputMode="decimal" value={v.amount} onChange={set("amount")} autoFocus /></Field>
        <Field label="Reason" hint="For example: Treatment cancelled" error={fields.note}><input className="input" maxLength={200} value={v.note} onChange={set("note")} /></Field>
        {error && !fields.amount && <div className="note error" role="alert">{error}</div>}
        <div className="actions"><button type="button" className="btn ghost" onClick={onClose}>Cancel</button><button className="btn primary" disabled={busy}>Record refund</button></div>
      </form>
    </Modal>
  );
}

// ---- new invoice (can use the advance straight away) ---------------------------------------
function InvoiceModal({ patientId, available, onClose, onSaved }) {
  const toast = useToast();
  const [items, setItems] = useState([{ description: "", amount: "" }]);
  const [useAdvance, setUseAdvance] = useState(available > 0);
  const [paid, setPaid] = useState({ amount: "", method: "cash", reference: "" });
  const change = (i, k) => (e) => setItems((rows) => rows.map((r, j) => (j === i ? { ...r, [k]: e.target.value } : r)));
  const total = items.reduce((s, i) => s + (num(i.amount)), 0);
  const fromAdvance = useAdvance ? Math.min(total, available) : 0;
  const afterAdvance = total - fromAdvance;
  const paidNow = num(paid.amount);
  const stillDue = afterAdvance - paidNow;
  const setPaidField = (k) => (e) => setPaid((p) => ({ ...p, [k]: e.target.value }));

  const { submit, busy, fields, error } = useSubmit(() => {
    if (paidNow > afterAdvance) throw new Error(`Paid now is more than the amount due (${rupees(afterAdvance)}).`);
    const clean = items.filter((i) => i.description.trim() && num(i.amount) > 0).map((i) => ({ description: i.description.trim(), amount: num(i.amount) }));
    if (!clean.length) throw new Error("Add at least one line with a description and amount.");
    return api.post("/invoices/", {
      patient: patientId, items: clean,
      ...(available > 0 ? { apply_advance: useAdvance } : {}),
      ...(paidNow > 0 ? { paid_now: paidNow, paid_method: paid.method, paid_reference: paid.reference.trim() } : {}),
    });
  }, (inv) => {
    toast(num(inv?.due) > 0 ? `Invoice created. ${rupees(inv.due)} is due.` : "Invoice created and fully paid.");
    onSaved();
  });

  return (
    <Modal title="New invoice" onClose={onClose}>
      <form onSubmit={submit} className="form" noValidate>
        {items.map((it, i) => (
          <div className="grid-line" key={i}>
            <input className="input" placeholder="Description" value={it.description} onChange={change(i, "description")} aria-label={`Line ${i + 1} description`} />
            <input className="input" type="number" min="0" placeholder="₹" value={it.amount} onChange={change(i, "amount")} aria-label={`Line ${i + 1} amount`} />
            {items.length > 1 && <button type="button" className="icon-btn" onClick={() => setItems((r) => r.filter((_, j) => j !== i))} aria-label="Remove line">×</button>}
          </div>
        ))}
        <button type="button" className="btn small ghost" onClick={() => setItems((r) => [...r, { description: "", amount: "" }])}>+ Add line</button>
        <p className="money"><b>Total {rupees(total)}</b></p>

        {available > 0 && (
          <div className="advance-box">
            <label className="check">
              <input type="checkbox" checked={useAdvance} onChange={(e) => setUseAdvance(e.target.checked)} />
              <span>Use the patient's advance ({rupees(available)} available)</span>
            </label>
            {useAdvance && total > 0 && (
              <span className="small money">{rupees(fromAdvance)} will be paid from advance. {rupees(total - fromAdvance)} left to pay.</span>
            )}
          </div>
        )}

        <div className="stack">
          <div className="grid2">
            <Field label="Paid now (₹)" hint="Money the patient has already paid for this invoice" error={fields.paid_now}>
              <input className="input" type="number" min="0" inputMode="decimal" value={paid.amount} onChange={setPaidField("amount")} />
            </Field>
            <Field label="Method"><select className="input" value={paid.method} onChange={setPaidField("method")}>{methodOptions}</select></Field>
          </div>
          {paid.method === "upi" && paidNow > 0 && <Field label="UTR / reference"><input className="input" value={paid.reference} onChange={setPaidField("reference")} /></Field>}
          {afterAdvance > 0 && <button type="button" className="link" onClick={() => setPaid((p) => ({ ...p, amount: String(afterAdvance) }))}>Paid in full ({rupees(afterAdvance)})</button>}
        </div>

        {total > 0 && (
          <div className="sum-lines money" aria-label="Summary">
            <div className="row spread"><span>Total</span><span>{rupees(total)}</span></div>
            {fromAdvance > 0 && <div className="row spread"><span>Advance used</span><span>− {rupees(fromAdvance)}</span></div>}
            {paidNow > 0 && <div className="row spread"><span>Paid now</span><span>− {rupees(paidNow)}</span></div>}
            <div className={`row spread total ${stillDue > 0 ? "text-due" : ""}`}><span>{stillDue > 0 ? "Still due" : "Fully paid"}</span><span>{rupees(Math.max(stillDue, 0))}</span></div>
          </div>
        )}

        {error && !fields.paid_now && <div className="note error" role="alert">{error}</div>}
        <div className="actions"><button type="button" className="btn ghost" onClick={onClose}>Cancel</button><button className="btn primary" disabled={busy}>Create invoice</button></div>
      </form>
    </Modal>
  );
}

// ---- pay an existing invoice from the advance --------------------------------------------
function UseAdvanceModal({ invoice, available, onClose, onSaved }) {
  const toast = useToast();
  const most = Math.min(num(invoice.due), available);
  const [amount, setAmount] = useState(String(most));
  const { submit, busy, fields, error } = useSubmit(
    () => api.post(`/invoices/${invoice.id}/apply-advance/`, { amount: num(amount) }),
    () => { toast(`${rupees(amount)} paid from advance`); onSaved(); }
  );
  return (
    <Modal title={`Use advance on invoice #${invoice.id}`} onClose={onClose}>
      <form onSubmit={submit} className="form" noValidate>
        <div className="advance-box">
          <span className="money">Invoice due: <b>{rupees(invoice.due)}</b></span>
          <span className="money">Advance available: <b>{rupees(available)}</b></span>
        </div>
        <Field label="Amount from advance (₹)" hint={`Up to ${rupees(most)}`} error={fields.amount}>
          <input className="input" type="number" min="0" inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} autoFocus />
        </Field>
        {error && !fields.amount && <div className="note error" role="alert">{error}</div>}
        <div className="actions"><button type="button" className="btn ghost" onClick={onClose}>Cancel</button><button className="btn primary" disabled={busy}>Use advance</button></div>
      </form>
    </Modal>
  );
}

// ---- record a normal payment --------------------------------------------------------------
function PaymentModal({ invoice, onClose, onSaved }) {
  const toast = useToast();
  const [v, setV] = useState({ amount: String(invoice.due), method: "cash", reference: "" });
  const set = (k) => (e) => setV((s) => ({ ...s, [k]: e.target.value }));
  const { submit, busy, fields, error } = useSubmit(() => api.post("/payments/", { invoice: invoice.id, ...v, amount: num(v.amount) }), () => { toast("Payment recorded"); onSaved(); });
  return (
    <Modal title={`Payment for invoice #${invoice.id}`} onClose={onClose}>
      <form onSubmit={submit} className="form" noValidate>
        <p className="muted">Amount due: <b>{rupees(invoice.due)}</b></p>
        <div className="grid2">
          <Field label="Amount (₹)" error={fields.amount} hint={`Still due after this: ${rupees(Math.max(num(invoice.due) - num(v.amount), 0))}`}><input className="input" type="number" min="0" value={v.amount} onChange={set("amount")} autoFocus /></Field>
          <Field label="Method"><select className="input" value={v.method} onChange={set("method")}>{methodOptions}</select></Field>
        </div>
        {v.method === "upi" && <Field label="UTR / reference"><input className="input" value={v.reference} onChange={set("reference")} /></Field>}
        {error && !fields.amount && <div className="note error" role="alert">{error}</div>}
        <div className="actions"><button type="button" className="btn ghost" onClick={onClose}>Cancel</button><button className="btn primary" disabled={busy}>Record payment</button></div>
      </form>
    </Modal>
  );
}
