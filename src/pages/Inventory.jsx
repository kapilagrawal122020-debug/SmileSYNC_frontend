import { useState } from "react";
import { api, fmtDate } from "../api/client";
import { useAuth } from "../auth/AuthContext";
import { Async, Badge, Card, Field, Modal, Page, useLoad, useSubmit, useToast } from "../components/ui";

const soon = (d) => d && new Date(d) <= new Date(Date.now() + 30 * 864e5);

export default function Inventory() {
  const { user } = useAuth();
  const isDoctor = user.role === "doctor";
  const items = useLoad(() => api.list("/inventory/items/"), []);
  const rules = useLoad(() => api.list("/inventory/rules/"), []);
  const [modal, setModal] = useState(null); // {type, item}

  const close = () => setModal(null);
  const done = () => { close(); items.reload(); rules.reload(); };
  const low = (items.data || []).filter((i) => i.is_low);
  const expiring = (items.data || []).filter((i) => soon(i.expiry_date));

  return (
    <Page title="Inventory" subtitle="Treatment recorded means stock deducted. Log deliveries here." actions={isDoctor && <button className="btn primary" onClick={() => setModal({ type: "item" })}>+ Add item</button>}>
      {(low.length > 0 || expiring.length > 0) && (
        <div className="note warn" role="status">
          {low.length > 0 && <div><b>Low stock:</b> {low.map((i) => i.name).join(", ")}</div>}
          {expiring.length > 0 && <div><b>Expiring within 30 days:</b> {expiring.map((i) => `${i.name} (${fmtDate(i.expiry_date)})`).join(", ")}</div>}
        </div>
      )}

      <Card title="Stock">
        <Async state={items} empty={isDoctor ? "No items yet. Add your first item." : "No items yet. Ask the doctor to add them."}>
          {(rows) => (
            <div className="table-wrap">
              <table className="table">
                <thead><tr><th>Item</th><th className="num">In stock</th><th className="num">Reorder at</th><th>Batch</th><th>Expiry</th><th></th></tr></thead>
                <tbody>
                  {rows.map((i) => (
                    <tr key={i.id}>
                      <td><b>{i.name}</b>{i.shade_or_size && <span className="muted"> · {i.shade_or_size}</span>}<div className="muted small">Pack: {Number(i.pack_size)} {i.unit}</div></td>
                      <td className="num"><b>{Number(i.quantity)}</b> {i.unit} {i.is_low && <Badge tone="red">Low</Badge>}</td>
                      <td className="num">{Number(i.reorder_level)} {i.unit}</td>
                      <td>{i.batch || "–"}</td>
                      <td>{i.expiry_date ? fmtDate(i.expiry_date) : "–"} {soon(i.expiry_date) && <Badge tone="amber">Soon</Badge>}</td>
                      <td className="row gap">
                        <button className="btn small primary" onClick={() => setModal({ type: "stockin", item: i })}>Stock in</button>
                        {isDoctor && <button className="btn small" onClick={() => setModal({ type: "count", item: i })}>Count</button>}
                        {isDoctor && <button className="btn small ghost" onClick={() => setModal({ type: "item", item: i })}>Edit</button>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Async>
      </Card>

      <Card title="Usage rules" actions={isDoctor && <button className="btn small" onClick={() => setModal({ type: "rule" })}>+ Add rule</button>}>
        <p className="muted small">When a treatment is marked done, these amounts are taken off the shelf. Example: Composite Class 1 × 3 at 0.2 g uses 0.6 g.</p>
        <Async state={rules} empty="No rules yet.">
          {(rows) => (
            <ul className="list">
              {rows.map((r) => (
                <li key={r.id} className="list-row">
                  <b className="grow">{r.procedure}</b>
                  <span>{Number(r.quantity)} × {r.item_name}</span>
                  {isDoctor && <RuleDelete id={r.id} onDone={rules.reload} />}
                </li>
              ))}
            </ul>
          )}
        </Async>
      </Card>

      {modal?.type === "stockin" && <StockIn item={modal.item} onClose={close} onSaved={done} />}
      {modal?.type === "count" && <Count item={modal.item} onClose={close} onSaved={done} />}
      {modal?.type === "item" && <ItemForm item={modal.item} onClose={close} onSaved={done} />}
      {modal?.type === "rule" && <RuleForm items={items.data || []} onClose={close} onSaved={done} />}
    </Page>
  );
}

function RuleDelete({ id, onDone }) {
  const toast = useToast();
  return <button className="btn small ghost" onClick={async () => { try { await api.del(`/inventory/rules/${id}/`); onDone(); } catch (e) { toast(e.message, "bad"); } }}>Remove</button>;
}

function StockIn({ item, onClose, onSaved }) {
  const toast = useToast();
  const [v, setV] = useState({ packs: "1", batch: "", expiry_date: "" });
  const set = (k) => (e) => setV((s) => ({ ...s, [k]: e.target.value }));
  const { submit, busy, fields, error } = useSubmit(() => {
    const body = { packs: Number(v.packs) };
    if (v.batch) body.batch = v.batch;
    if (v.expiry_date) body.expiry_date = v.expiry_date;
    return api.post(`/inventory/items/${item.id}/stock-in/`, body);
  }, () => { toast(`Added ${Number(v.packs) * Number(item.pack_size)} ${item.unit} to ${item.name}`); onSaved(); });
  return (
    <Modal title={`Stock in: ${item.name}`} onClose={onClose}>
      <form onSubmit={submit} className="form" noValidate>
        <Field label="Packs received" hint={`Each pack is ${Number(item.pack_size)} ${item.unit}. This adds ${(Number(v.packs) || 0) * Number(item.pack_size)} ${item.unit}.`} error={fields.packs}>
          <input className="input" type="number" min="0" step="any" value={v.packs} onChange={set("packs")} autoFocus />
        </Field>
        <div className="grid2">
          <Field label="Batch (optional)" error={fields.batch}><input className="input" value={v.batch} onChange={set("batch")} /></Field>
          <Field label="Expiry (optional)" error={fields.expiry_date}><input className="input" type="date" value={v.expiry_date} onChange={set("expiry_date")} /></Field>
        </div>
        {error && !Object.keys(fields).length && <div className="note error">{error}</div>}
        <div className="actions"><button type="button" className="btn ghost" onClick={onClose}>Cancel</button><button className="btn primary" disabled={busy}>Add stock</button></div>
      </form>
    </Modal>
  );
}

function Count({ item, onClose, onSaved }) {
  const toast = useToast();
  const [counted, setCounted] = useState(String(Number(item.quantity)));
  const [note, setNote] = useState("");
  const { submit, busy, fields, error } = useSubmit(() => api.post(`/inventory/items/${item.id}/count/`, { counted: Number(counted), note }), (r) => { toast(`Count saved. Variance ${r?.variance ?? 0} ${item.unit}`); onSaved(); });
  return (
    <Modal title={`Monthly count: ${item.name}`} onClose={onClose}>
      <form onSubmit={submit} className="form" noValidate>
        <p className="muted">System says <b>{Number(item.quantity)} {item.unit}</b>. Enter what you actually counted; the difference is logged.</p>
        <Field label={`Counted (${item.unit})`} error={fields.counted}><input className="input" type="number" min="0" step="any" value={counted} onChange={(e) => setCounted(e.target.value)} autoFocus /></Field>
        <Field label="Note"><input className="input" value={note} onChange={(e) => setNote(e.target.value)} /></Field>
        {error && !Object.keys(fields).length && <div className="note error">{error}</div>}
        <div className="actions"><button type="button" className="btn ghost" onClick={onClose}>Cancel</button><button className="btn primary" disabled={busy}>Save count</button></div>
      </form>
    </Modal>
  );
}

function ItemForm({ item, onClose, onSaved }) {
  const toast = useToast();
  const [v, setV] = useState({
    name: item?.name || "", unit: item?.unit || "pcs", pack_size: item?.pack_size ?? 1, shade_or_size: item?.shade_or_size || "",
    batch: item?.batch || "", expiry_date: item?.expiry_date || "", reorder_level: item?.reorder_level ?? 0,
  });
  const set = (k) => (e) => setV((s) => ({ ...s, [k]: e.target.value }));
  const { submit, busy, fields, error } = useSubmit(() => {
    const body = { ...v, pack_size: Number(v.pack_size), reorder_level: Number(v.reorder_level), expiry_date: v.expiry_date || null };
    return item ? api.patch(`/inventory/items/${item.id}/`, body) : api.post("/inventory/items/", body);
  }, () => { toast(item ? "Item updated" : "Item added"); onSaved(); });
  return (
    <Modal title={item ? "Edit item" : "Add item"} onClose={onClose}>
      <form onSubmit={submit} className="form" noValidate>
        <div className="grid2">
          <Field label="Name" error={fields.name}><input className="input" placeholder="Composite A2" value={v.name} onChange={set("name")} autoFocus /></Field>
          <Field label="Shade or size" error={fields.shade_or_size}><input className="input" value={v.shade_or_size} onChange={set("shade_or_size")} /></Field>
        </div>
        <div className="grid3">
          <Field label="Unit" error={fields.unit}><select className="input" value={v.unit} onChange={set("unit")}><option value="g">grams</option><option value="ml">millilitres</option><option value="pcs">pieces</option></select></Field>
          <Field label="Pack size" hint="e.g. 3 for a 3 g tube" error={fields.pack_size}><input className="input" type="number" min="0" step="any" value={v.pack_size} onChange={set("pack_size")} /></Field>
          <Field label="Reorder level" error={fields.reorder_level}><input className="input" type="number" min="0" step="any" value={v.reorder_level} onChange={set("reorder_level")} /></Field>
        </div>
        <div className="grid2">
          <Field label="Batch" error={fields.batch}><input className="input" value={v.batch} onChange={set("batch")} /></Field>
          <Field label="Expiry" error={fields.expiry_date}><input className="input" type="date" value={v.expiry_date} onChange={set("expiry_date")} /></Field>
        </div>
        {item && <p className="muted small">Quantity changes only through Stock in, treatments or the monthly count.</p>}
        {error && !Object.keys(fields).length && <div className="note error">{error}</div>}
        <div className="actions"><button type="button" className="btn ghost" onClick={onClose}>Cancel</button><button className="btn primary" disabled={busy}>Save</button></div>
      </form>
    </Modal>
  );
}

function RuleForm({ items, onClose, onSaved }) {
  const toast = useToast();
  const [v, setV] = useState({ procedure: "", item: items[0]?.id || "", quantity: "" });
  const set = (k) => (e) => setV((s) => ({ ...s, [k]: e.target.value }));
  const { submit, busy, fields, error } = useSubmit(() => api.post("/inventory/rules/", { procedure: v.procedure, item: Number(v.item), quantity: Number(v.quantity) }), () => { toast("Rule added"); onSaved(); });
  return (
    <Modal title="Add usage rule" onClose={onClose}>
      <form onSubmit={submit} className="form" noValidate>
        <Field label="Treatment name" hint="Must match the procedure name you use (not case sensitive)" error={fields.procedure}><input className="input" placeholder="Composite Class 1" value={v.procedure} onChange={set("procedure")} autoFocus /></Field>
        <div className="grid2">
          <Field label="Material" error={fields.item}><select className="input" value={v.item} onChange={set("item")}>{items.map((i) => <option key={i.id} value={i.id}>{i.name}</option>)}</select></Field>
          <Field label="Quantity per unit" error={fields.quantity}><input className="input" type="number" min="0" step="any" value={v.quantity} onChange={set("quantity")} /></Field>
        </div>
        {error && !Object.keys(fields).length && <div className="note error">{error}</div>}
        <div className="actions"><button type="button" className="btn ghost" onClick={onClose}>Cancel</button><button className="btn primary" disabled={busy}>Add rule</button></div>
      </form>
    </Modal>
  );
}
