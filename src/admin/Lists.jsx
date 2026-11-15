import { useMemo, useState } from "react";
import { api, downloadFile } from "../api/client";
import { Async, Badge, Card, Field, Modal, Page, label, useLoad, useSubmit, useToast } from "../components/ui";

const LANGS = [["hi", "Hindi"], ["mr", "Marathi"], ["gu", "Gujarati"], ["ta", "Tamil"], ["te", "Telugu"], ["kn", "Kannada"], ["ml", "Malayalam"], ["bn", "Bengali"], ["pa", "Punjabi"]];
const KIND = {
  locked: ["amber", "Locked: the app's logic depends on these values. You can relabel and translate, not remove."],
  bound: ["blue", "Bound: the app stores the code and checks it. Adding values is safe."],
  clinic: ["teal", "Open: clinics may add their own values on top of these."],
};

export default function Lists() {
  const index = useLoad(() => api.get("/platform/lists/"), []);
  const [key, setKey] = useState(null);
  const [q, setQ] = useState("");
  const [importing, setImporting] = useState(false);

  const groups = useMemo(() => {
    const out = {};
    (index.data || []).filter((l) => !q || `${l.title} ${l.key}`.toLowerCase().includes(q.toLowerCase())).forEach((l) => { (out[l.group || "Other"] ||= []).push(l); });
    return out;
  }, [index.data, q]);
  const current = key || index.data?.[0]?.key;

  return (
    <Page title="Master lists" subtitle="Every dropdown and checklist in the app. Values are never deleted, only turned off, so old records keep making sense."
      actions={<button className="btn" onClick={() => setImporting(true)}>Import from file</button>}>
      <div className="admin-split">
        <nav className="admin-index" aria-label="Lists">
          <input className="input" placeholder="Find a list" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Find a list" />
          {index.loading && !index.data && <div className="muted small">Loading…</div>}
          {index.error && <div className="note error">{index.error}</div>}
          {Object.entries(groups).map(([g, items]) => (
            <div key={g}>
              <div className="gh">{g}</div>
              {items.map((l) => (
                <button key={l.key} aria-current={l.key === current} onClick={() => setKey(l.key)}>
                  <span>{l.title}</span><small>{l.active_count}/{l.value_count}</small>
                </button>
              ))}
            </div>
          ))}
        </nav>
        <div>{current ? <ListEditor listKey={current} onChanged={index.reload} /> : <div className="empty">Pick a list on the left.</div>}</div>
      </div>
      {importing && <ImportModal onClose={() => setImporting(false)} onDone={() => { setImporting(false); index.reload(); }} />}
    </Page>
  );
}

function ListEditor({ listKey, onChanged }) {
  const toast = useToast();
  const detail = useLoad(() => api.get(`/platform/lists/${listKey}/`), [listKey]);
  const [modal, setModal] = useState(null); // {type:"value", value} | {type:"add"} | {type:"def"}
  const refresh = () => { detail.reload(); onChanged(); };

  const run = async (fn, ok) => {
    try { await fn(); if (ok) toast(ok); refresh(); } catch (e) { toast(e.message, "bad"); }
  };
  const move = (values, i, d) => {
    const ids = values.map((v) => v.id);
    const j = i + d;
    if (j < 0 || j >= ids.length) return;
    [ids[i], ids[j]] = [ids[j], ids[i]];
    run(() => api.post(`/platform/lists/${listKey}/reorder/`, { order: ids }));
  };
  const download = (type) => downloadFile(`/platform/lists/${listKey}/export/`, `${listKey}.${type}`, { type }).catch((e) => toast(e.message, "bad"));

  return (
    <Async state={detail}>
      {(d) => (
        <>
          <Card title={d.title} actions={<>
            <button className="btn small" onClick={() => download("json")}>Export JSON</button>
            <button className="btn small" onClick={() => download("csv")}>Export CSV</button>
            <button className="btn small" onClick={() => setModal({ type: "def" })}>Edit details</button>
          </>}>
            <div className="row gap wrap">
              <span className="mono">{d.key}</span>
              <Badge tone={(KIND[d.kind] || KIND.bound)[0]}>{label(d.kind)}</Badge>
            </div>
            <p className="muted small">{(KIND[d.kind] || KIND.bound)[1]}</p>
            {d.about && <p>{d.about}</p>}
            <div className="kv">
              {d.used_in && <div><div className="muted small">Used in</div>{d.used_in}</div>}
              {d.stored_today && <div><div className="muted small">Stored today as</div>{d.stored_today}</div>}
              {d.scope && <div><div className="muted small">Scope</div>{d.scope}</div>}
            </div>
            {d.admin_note && <div className="note info">{d.admin_note}</div>}
          </Card>
          <Card title={`Values (${d.values.length})`} actions={<button className="btn primary small" onClick={() => setModal({ type: "add" })}>+ Add value</button>}>
            {d.values.length === 0 ? <div className="empty">No values yet.</div> : (
              <div className="table-wrap">
                <table className="table">
                  <thead><tr><th>Order</th><th>Label</th><th>Code</th><th>Group</th><th>Translations</th><th>On</th><th /></tr></thead>
                  <tbody>
                    {d.values.map((v, i) => (
                      <tr key={v.id} className={v.is_active ? "" : "row-off"}>
                        <td>
                          <div className="row gap">
                            <button className="btn small ghost" aria-label={`Move ${v.label} up`} disabled={i === 0} onClick={() => move(d.values, i, -1)}>↑</button>
                            <button className="btn small ghost" aria-label={`Move ${v.label} down`} disabled={i === d.values.length - 1} onClick={() => move(d.values, i, 1)}>↓</button>
                          </div>
                        </td>
                        <td><b>{v.label}</b>{v.is_system && <span className="lock"> · locked</span>}{v.description && <div className="muted small">{v.description}</div>}</td>
                        <td className="mono">{v.code}</td>
                        <td>{v.group || "–"}</td>
                        <td className="small">{Object.values(v.labels || {}).filter(Boolean).length}/{LANGS.length}</td>
                        <td>
                          <input type="checkbox" checked={v.is_active} disabled={v.is_system && v.is_active} aria-label={`${v.label} is on`}
                            title={v.is_system ? "The app depends on this value" : ""}
                            onChange={(e) => run(() => api.patch(`/platform/list-values/${v.id}/`, { is_active: e.target.checked }), e.target.checked ? "Turned on" : "Turned off")} />
                        </td>
                        <td><button className="btn small" onClick={() => setModal({ type: "value", value: v })}>Edit</button></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
          {modal?.type === "value" && <ValueModal listKey={listKey} value={modal.value} onClose={() => setModal(null)} onSaved={() => { setModal(null); refresh(); }} />}
          {modal?.type === "add" && <ValueModal listKey={listKey} onClose={() => setModal(null)} onSaved={() => { setModal(null); refresh(); }} />}
          {modal?.type === "def" && <DefinitionModal def={d} onClose={() => setModal(null)} onSaved={() => { setModal(null); refresh(); }} />}
        </>
      )}
    </Async>
  );
}

function ValueModal({ listKey, value, onClose, onSaved }) {
  const toast = useToast();
  const isNew = !value;
  const [v, setV] = useState({
    code: value?.code || "", label: value?.label || "", description: value?.description || "", group: value?.group || "",
    labels: { ...(value?.labels || {}) },
  });
  const set = (k) => (e) => setV((s) => ({ ...s, [k]: e.target.value }));
  const setLang = (l) => (e) => setV((s) => ({ ...s, labels: { ...s.labels, [l]: e.target.value } }));
  const { submit, busy, fields, error } = useSubmit(() => {
    const labels = Object.fromEntries(Object.entries(v.labels).filter(([, t]) => t.trim()));
    const body = { label: v.label, description: v.description, group: v.group, labels };
    return isNew ? api.post(`/platform/lists/${listKey}/values/`, { ...body, code: v.code }) : api.patch(`/platform/list-values/${value.id}/`, body);
  }, () => { toast(isNew ? "Value added" : "Value saved"); onSaved(); });
  return (
    <Modal title={isNew ? "Add a value" : `Edit ${value.label}`} onClose={onClose} wide>
      <form className="form" onSubmit={submit} noValidate>
        <div className="grid2">
          <Field label="Label" hint="What people see in English" error={fields.label}><input className="input" value={v.label} onChange={set("label")} autoFocus /></Field>
          <Field label="Code" hint={isNew ? "Saved in records. Letters, digits . _ + - only. Never changes." : "A code never changes."} error={fields.code}>
            <input className="input mono" value={v.code} onChange={set("code")} disabled={!isNew} />
          </Field>
        </div>
        <div className="grid2">
          <Field label="Group (optional)" hint="Used to cluster values on screen" error={fields.group}><input className="input" value={v.group} onChange={set("group")} /></Field>
          <Field label="Description (optional)" error={fields.description}><input className="input" value={v.description} onChange={set("description")} /></Field>
        </div>
        <h3 className="hsub">Translations</h3>
        <div className="grid2">
          {LANGS.map(([l, name]) => (
            <Field key={l} label={name}><input className="input" lang={l} value={v.labels[l] || ""} onChange={setLang(l)} /></Field>
          ))}
        </div>
        {fields.labels && <div className="note error">{String(fields.labels)}</div>}
        {error && !Object.keys(fields).length && <div className="note error">{error}</div>}
        <div className="actions"><button type="button" className="btn ghost" onClick={onClose}>Cancel</button><button className="btn primary" disabled={busy}>{isNew ? "Add value" : "Save"}</button></div>
      </form>
    </Modal>
  );
}

function DefinitionModal({ def, onClose, onSaved }) {
  const toast = useToast();
  const [v, setV] = useState({ title: def.title, group: def.group || "", about: def.about || "", admin_note: def.admin_note || "" });
  const set = (k) => (e) => setV((s) => ({ ...s, [k]: e.target.value }));
  const { submit, busy, fields, error } = useSubmit(() => api.patch(`/platform/lists/${def.key}/`, v), () => { toast("List details saved"); onSaved(); });
  return (
    <Modal title={`Edit ${def.title}`} onClose={onClose}>
      <form className="form" onSubmit={submit} noValidate>
        <Field label="Title" error={fields.title}><input className="input" value={v.title} onChange={set("title")} autoFocus /></Field>
        <Field label="Section" error={fields.group}><input className="input" value={v.group} onChange={set("group")} /></Field>
        <Field label="What this list is for" error={fields.about}><textarea className="input" rows={3} value={v.about} onChange={set("about")} /></Field>
        <Field label="Note for admins" error={fields.admin_note}><textarea className="input" rows={2} value={v.admin_note} onChange={set("admin_note")} /></Field>
        {error && !Object.keys(fields).length && <div className="note error">{error}</div>}
        <div className="actions"><button type="button" className="btn ghost" onClick={onClose}>Cancel</button><button className="btn primary" disabled={busy}>Save</button></div>
      </form>
    </Modal>
  );
}

function ImportModal({ onClose, onDone }) {
  const toast = useToast();
  const [text, setText] = useState("");
  const [result, setResult] = useState(null); // {ok, counts} or {problems}
  const [busy, setBusy] = useState(false);

  const readFile = async (e) => {
    const f = e.target.files?.[0];
    if (f) { setText(await f.text()); setResult(null); }
  };
  const send = async (dry) => {
    let payload;
    try { payload = JSON.parse(text); } catch { setResult({ problems: ["This is not valid JSON. Use a file exported from this page."] }); return; }
    setBusy(true);
    try {
      const res = await api.post(`/platform/lists/import/${dry ? "?dry_run=1" : ""}`, payload);
      if (dry) setResult({ counts: res });
      else { toast("Import complete"); onDone(); }
    } catch (e) {
      setResult({ problems: e.data?.problems || [e.message] });
    } finally { setBusy(false); }
  };
  const c = result?.counts;
  return (
    <Modal title="Import lists" onClose={onClose} wide>
      <div className="form">
        <p className="muted small">Use a file exported from this page (JSON). New lists and values are added, and existing ones are updated by code. Nothing is deleted, and nothing is saved if any row is invalid.</p>
        <input type="file" accept=".json,application/json" onChange={readFile} aria-label="Choose a JSON file" />
        <textarea className="input json-box" placeholder='Or paste JSON here' value={text} onChange={(e) => { setText(e.target.value); setResult(null); }} aria-label="JSON to import" />
        {c && (
          <div className="note info">
            Would create {c.lists_created} list{c.lists_created === 1 ? "" : "s"} and {c.values_created} value{c.values_created === 1 ? "" : "s"}, and update {c.lists_updated} list{c.lists_updated === 1 ? "" : "s"} and {c.values_updated} value{c.values_updated === 1 ? "" : "s"}.
          </div>
        )}
        {result?.problems && (
          <div className="note error" role="alert">
            <b>Nothing was imported.</b>
            <ul>{result.problems.slice(0, 12).map((p, i) => <li key={i}>{p}</li>)}</ul>
            {result.problems.length > 12 && <div>…and {result.problems.length - 12} more.</div>}
          </div>
        )}
        <div className="actions">
          <button type="button" className="btn ghost" onClick={onClose}>Cancel</button>
          <button type="button" className="btn" disabled={busy || !text.trim()} onClick={() => send(true)}>Check first</button>
          <button type="button" className="btn primary" disabled={busy || !c} onClick={() => send(false)}>Import</button>
        </div>
      </div>
    </Modal>
  );
}
