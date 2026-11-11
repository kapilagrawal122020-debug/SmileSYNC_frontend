// Demo backend that runs inside the browser (data lives in localStorage).
// It follows the same routes, field names and rules as the Django API, so switching
// demo mode off should need no change in the pages.
import { ApiError } from "./errors";

const KEY = "ss_mock_db_v1";
const OTP_CODE = "123456";
const PHONE_RE = /^[6-9]\d{9}$/;

const delay = (ms) => new Promise((r) => setTimeout(r, ms));
const nowIso = () => new Date().toISOString();
const at = (dayOffset, h, m = 0) => { const d = new Date(); d.setDate(d.getDate() + dayOffset); d.setHours(h, m, 0, 0); return d.toISOString(); };
const dateIn = (days) => { const d = new Date(); d.setDate(d.getDate() + days); return d.toLocaleDateString("en-CA"); };
const localDate = (iso) => new Date(iso).toLocaleDateString("en-CA");
const r2 = (x) => Math.round(x * 100) / 100;
const digits = (p) => String(p || "").replace(/\D/g, "").slice(-10);
const rand = () => Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2);

const svgPhoto = (label, color) =>
  "data:image/svg+xml;utf8," +
  encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="320" height="220"><rect width="320" height="220" fill="${color}"/><text x="160" y="116" font-family="sans-serif" font-size="18" fill="#fff" text-anchor="middle">${label}</text></svg>`
  );

function seed() {
  return {
    seq: 100,
    tokens: {},
    otps: {},
    clinics: [{
      id: 1, name: "Smile Care Dental", address: "12 FC Road, Shivajinagar", city: "Pune", phone: "9800000000",
      google_review_url: "https://g.page/r/smile-care-demo", website_url: "", social_url: "", code: "SMILE1",
    }],
    users: [
      { id: 1, phone: "9000000001", password: "doctor123", name: "Dr. Demo", role: "doctor", designation: "BDS, MDS", speciality: "Conservative Dentistry", registration_number: "MDC-12345", is_active: true, clinic: 1 },
      { id: 2, phone: "9000000002", password: "assist123", name: "Asha (assistant)", role: "assistant", designation: "", speciality: "", registration_number: "", is_active: true, clinic: 1 },
      { id: 3, phone: "9000000003", password: "consult123", name: "Dr. Meera Iyer", role: "consultant", designation: "BDS, MDS", speciality: "Orthodontics", registration_number: "MDC-67890", is_active: true, clinic: 1 },
      { id: 4, phone: "9111111111", password: "", name: "Ravi Kumar", role: "patient", designation: "", speciality: "", registration_number: "", is_active: true, clinic: null },
    ],
    chairs: [
      { id: 1, clinic: 1, name: "Chair 1", status: "ready" },
      { id: 2, clinic: 1, name: "Chair 2", status: "locked" },
    ],
    patients: [
      { id: 1, clinic: 1, name: "Ravi Kumar", phone: "9111111111", locality: "Kothrud", chief_complaint: "Toothache on the upper left side", medical_history: "None", dental_history: "Filling 2 years ago", language: "en", consent_data: true, consent_whatsapp: true, tips_subscribed: false, private_notes: "Nervous patient. Gets 10% family discount.", selfie_url: null, created_at: at(-20, 10) },
      { id: 2, clinic: 1, name: "Priya Sharma", phone: "9222222222", locality: "Baner", chief_complaint: "Cleaning and scaling", medical_history: "Diabetic", dental_history: "", language: "hi", consent_data: true, consent_whatsapp: true, tips_subscribed: true, private_notes: "", selfie_url: null, created_at: at(-10, 12) },
      { id: 3, clinic: 1, name: "Amit Patel", phone: "9333333333", locality: "Aundh", chief_complaint: "Wisdom tooth pain", medical_history: "Allergic to penicillin", dental_history: "", language: "gu", consent_data: true, consent_whatsapp: false, tips_subscribed: false, private_notes: "", selfie_url: null, created_at: at(-3, 16) },
    ],
    visits: [
      { id: 1, clinic: 1, patient: 1, doctor: 1, chair: 1, scheduled_at: at(0, 10), status: "confirmed", notes: "" },
      { id: 2, clinic: 1, patient: 2, doctor: 1, chair: 2, scheduled_at: at(0, 11, 30), status: "booked", notes: "" },
      { id: 3, clinic: 1, patient: 3, doctor: 3, chair: 1, scheduled_at: at(0, 15), status: "booked", notes: "" },
      { id: 4, clinic: 1, patient: 2, doctor: 1, chair: 2, scheduled_at: at(-1, 17), status: "completed", notes: "Scaling done" },
      { id: 5, clinic: 1, patient: 1, doctor: 1, chair: 1, scheduled_at: at(2, 11), status: "booked", notes: "" },
    ],
    treatments: [
      { id: 1, clinic: 1, patient: 1, visit: 1, doctor: 1, procedure: "Composite Class 1", tooth: "26", units: 3, cost: 4500, notes: "Upper left molars", status: "planned", done_at: null, stock_deducted: false, created_at: at(-1, 12) },
      { id: 2, clinic: 1, patient: 2, visit: 4, doctor: 1, procedure: "Scaling", tooth: "", units: 1, cost: 1200, notes: "", status: "done", done_at: at(-1, 17), stock_deducted: true, created_at: at(-1, 16) },
    ],
    images: [
      { id: 1, clinic: 1, patient: 1, visit: null, kind: "xray", tooth: "26", stage: "before", taken_at: at(-1, 11), file_url: svgPhoto("RVG X-ray · tooth 26", "#35556b") },
      { id: 2, clinic: 1, patient: 1, visit: null, kind: "intraoral", tooth: "26", stage: "before", taken_at: at(-1, 11, 10), file_url: svgPhoto("Intraoral · before", "#12808c") },
    ],
    invoices: [
      { id: 1, clinic: 1, patient: 1, visit: null, notes: "First visit", created_at: at(-1, 12), items: [{ id: 1, description: "Consultation", amount: 300 }, { id: 2, description: "RVG X-ray", amount: 200 }] },
      { id: 2, clinic: 1, patient: 2, visit: 4, notes: "", created_at: at(-1, 17, 30), items: [{ id: 3, description: "Scaling", amount: 1200 }] },
    ],
    payments: [
      { id: 1, clinic: 1, invoice: 1, amount: 300, method: "cash", reference: "", paid_at: at(-1, 12, 5) },
      { id: 2, clinic: 1, invoice: 2, amount: 1200, method: "upi", reference: "UTR4839201", paid_at: at(-1, 17, 40) },
    ],
    advances: [
      { id: 1, clinic: 1, patient: 3, amount: 5000, method: "upi", reference: "UTR5521903", note: "For wisdom tooth extraction", received_at: at(-2, 15), received_by: 2, created_at: at(-2, 15) },
    ],
    refunds: [],
    feedback: [
      { id: 1, clinic: 1, patient: 2, visit: 4, rating: 5, comment: "Very gentle and clean clinic.", source: "whatsapp", reply: "", created_at: at(-1, 20) },
      { id: 2, clinic: 1, patient: 3, visit: null, rating: 2, comment: "Waited 40 minutes past my slot.", source: "app", reply: "", created_at: at(-4, 19) },
    ],
    items: [
      { id: 1, clinic: 1, name: "Composite A2", unit: "g", pack_size: 3, shade_or_size: "A2", batch: "CMP-0921", expiry_date: dateIn(300), reorder_level: 1.5, quantity: 3 },
      { id: 2, clinic: 1, name: "Gloves", unit: "pcs", pack_size: 100, shade_or_size: "M", batch: "GLV-221", expiry_date: dateIn(500), reorder_level: 50, quantity: 200 },
      { id: 3, clinic: 1, name: "Alginate", unit: "g", pack_size: 500, shade_or_size: "", batch: "ALG-77", expiry_date: dateIn(200), reorder_level: 500, quantity: 1000 },
      { id: 4, clinic: 1, name: "Masks", unit: "pcs", pack_size: 50, shade_or_size: "", batch: "MSK-12", expiry_date: dateIn(400), reorder_level: 50, quantity: 30 },
      { id: 5, clinic: 1, name: "Etchant gel", unit: "ml", pack_size: 5, shade_or_size: "", batch: "ETG-09", expiry_date: dateIn(18), reorder_level: 2, quantity: 10 },
    ],
    rules: [
      { id: 1, clinic: 1, procedure: "Composite Class 1", item: 1, quantity: 0.2 },
      { id: 2, clinic: 1, procedure: "Composite Class 2", item: 1, quantity: 0.6 },
    ],
    movements: [],
    checks: [
      { id: 1, clinic: 1, kind: "after_patient", area: "spit_basin", visit: 4, photo_url: svgPhoto("Spit basin and tray", "#4a7c59"), taken_by: 2, taken_at: at(-1, 17, 50), status: "pending", review_note: "", reviewed_at: null, photo_hash: "seed1" },
      { id: 2, clinic: 1, kind: "after_patient", area: "chair_seat", visit: 4, photo_url: svgPhoto("Chair seating area", "#4a7c59"), taken_by: 2, taken_at: at(-1, 17, 52), status: "pending", review_note: "", reviewed_at: null, photo_hash: "seed2" },
      { id: 3, clinic: 1, kind: "morning", area: "reception", visit: null, photo_url: svgPhoto("Reception", "#5b6f8a"), taken_by: 2, taken_at: at(0, 9, 10), status: "approved", review_note: "", reviewed_at: at(0, 9, 30), photo_hash: "seed3" },
    ],
    messages: [
      { id: 1, clinic: 1, patient: 1, to_phone: "9111111111", kind: "reminder", template: "appointment_reminder", params: ["Ravi", "10:00 AM"], status: "dry_run", error: "", created_at: at(-1, 18) },
      { id: 2, clinic: 1, patient: 2, to_phone: "9222222222", kind: "feedback", template: "feedback_request", params: ["Priya"], status: "dry_run", error: "", created_at: at(-1, 19) },
      { id: 3, clinic: 1, patient: 3, to_phone: "9333333333", kind: "offer", template: "festive_offer", params: ["Diwali"], status: "skipped", error: "No WhatsApp consent", created_at: at(-5, 10) },
    ],
    documents: [
      { id: 1, clinic: 1, doc_type: "dental_council", title: "State Dental Council", number: "MDC-12345", expiry_date: dateIn(220), file_url: null },
      { id: 2, clinic: 1, doc_type: "biomedical_waste", title: "", number: "BMW/PUNE/221", expiry_date: dateIn(25), file_url: null },
      { id: 3, clinic: 1, doc_type: "aerb", title: "e-LORA", number: "AERB-9981", expiry_date: dateIn(50), file_url: null },
    ],
  };
}

function load() {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const saved = JSON.parse(raw);
      saved.advances ||= [];
      saved.refunds ||= [];
      return saved;
    }
  } catch { /* fall through to a fresh seed */ }
  const db = seed();
  save(db);
  return db;
}
function save(db) { try { localStorage.setItem(KEY, JSON.stringify(db)); } catch { /* storage full or blocked */ } }
export function resetMock() { try { localStorage.removeItem(KEY); } catch { /* ignore */ } }

// ---- request parsing -------------------------------------------------------------

const FK = ["patient", "doctor", "chair", "visit", "invoice", "item"];
const NUM = ["units", "cost", "amount", "quantity", "pack_size", "reorder_level", "rating", "packs", "counted"];
const READONLY = {
  treatments: ["status", "done_at", "stock_deducted", "doctor"],
  chairs: ["status"], items: ["quantity"], feedback: ["reply"], checks: ["status", "taken_by", "taken_at"],
};

function parse(body) {
  const data = {}, files = {};
  if (body instanceof FormData) {
    for (const [k, v] of body.entries()) { if (v instanceof File) files[k] = v; else data[k] = v; }
  } else Object.assign(data, body || {});
  for (const k of Object.keys(data)) {
    const v = data[k];
    if (v === "true") data[k] = true;
    else if (v === "false") data[k] = false;
    else if (FK.includes(k)) data[k] = v === "" || v === null || v === undefined ? null : Number(v);
    else if (NUM.includes(k) && v !== "" && v !== null) data[k] = Number(v);
  }
  return { data, files };
}

async function fileToData(file) {
  if (!file || !file.type.startsWith("image/")) return null;
  try {
    const bmp = await createImageBitmap(file);
    const scale = Math.min(1, 480 / Math.max(bmp.width, bmp.height));
    const c = document.createElement("canvas");
    c.width = Math.round(bmp.width * scale); c.height = Math.round(bmp.height * scale);
    c.getContext("2d").drawImage(bmp, 0, 0, c.width, c.height);
    return c.toDataURL("image/jpeg", 0.7);
  } catch { return null; }
}
const hashStr = (s) => { let h = 5381; for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) | 0; return `${s.length}:${h}`; };

const bad = (field, msg) => new ApiError(400, { [field]: [msg] });
const forbidden = () => new ApiError(403, { detail: "You do not have permission to perform this action." });

// ---- scoping and output ------------------------------------------------------------

const mineIds = (db, me) => db.patients.filter((p) => p.phone === me.phone).map((p) => p.id);

function visible(db, me, key, rec) {
  if (me.role === "patient") {
    const mine = mineIds(db, me);
    if (key === "patients") return mine.includes(rec.id);
    if (key === "clinics") return db.patients.some((p) => mine.includes(p.id) && p.clinic === rec.id);
    if (key === "payments") { const inv = db.invoices.find((i) => i.id === rec.invoice); return !!inv && mine.includes(inv.patient); }
    if ("patient" in rec && ["visits", "images", "invoices", "advances", "feedback", "messages"].includes(key)) return mine.includes(rec.patient);
    return false;
  }
  return key === "clinics" ? rec.id === me.clinic : rec.clinic === me.clinic;
}

const totals = (db, inv) => {
  const total = inv.items.reduce((s, i) => s + Number(i.amount), 0);
  const paid = db.payments.filter((p) => p.invoice === inv.id).reduce((s, p) => s + Number(p.amount), 0);
  return { total: r2(total), paid: r2(paid), due: r2(total - paid) };
};

// ---- advance payments: money taken before billing, used on invoices oldest first --------
const advUsed = (db, a) => r2(db.payments.filter((p) => p.advance === a.id).reduce((s, p) => s + Number(p.amount), 0));
const advRefunded = (db, a) => r2(db.refunds.filter((x) => x.advance === a.id).reduce((s, x) => s + Number(x.amount), 0));
const advBalance = (db, a) => r2(Number(a.amount) - advUsed(db, a) - advRefunded(db, a));
const openAdvances = (db, patientId) =>
  db.advances.filter((a) => a.patient === patientId && advBalance(db, a) > 0)
    .sort((a, b) => a.received_at.localeCompare(b.received_at) || a.id - b.id);

// amount undefined = "as much as possible" (the invoice due or the advance left, whichever is smaller).
function applyAdvance(db, inv, amount) {
  const advances = openAdvances(db, inv.patient);
  const available = r2(advances.reduce((s, a) => s + advBalance(db, a), 0));
  const due = totals(db, inv).due;
  if (amount === undefined || amount === null || amount === "") {
    amount = Math.min(due, available);
    if (amount <= 0) return [];
  } else {
    amount = Number(amount);
    if (!(amount > 0)) throw bad("amount", "Amount must be more than zero.");
    if (amount > due) throw bad("amount", `The invoice only has ${due} due.`);
    if (amount > available) throw bad("amount", `Only ${available} advance is available.`);
  }
  let left = r2(amount);
  const made = [];
  for (const a of advances) {
    const part = Math.min(advBalance(db, a), left);
    if (part <= 0) continue;
    const pay = { id: db.seq++, clinic: inv.clinic, invoice: inv.id, amount: r2(part), method: "advance", reference: `Advance #${a.id}`, advance: a.id, paid_at: nowIso() };
    db.payments.push(pay);
    made.push(pay);
    left = r2(left - part);
    if (left <= 0) break;
  }
  return made;
}

function out(db, me, key, r) {
  const { password, ...rec } = r; // eslint-disable-line no-unused-vars
  if (key === "patients" && me.role !== "doctor") delete rec.private_notes;
  if (key === "visits") rec.patient_name = db.patients.find((p) => p.id === r.patient)?.name || "";
  if (key === "invoices") {
    Object.assign(rec, totals(db, r));
    const pays = db.payments.filter((p) => p.invoice === r.id);
    rec.payments = pays.map((p) => ({ id: p.id, amount: p.amount, method: p.method, reference: p.reference, advance: p.advance ?? null, paid_at: p.paid_at }));
    rec.advance_applied = r2(pays.filter((p) => p.method === "advance").reduce((s, p) => s + Number(p.amount), 0));
  }
  if (key === "payments") rec.advance = r.advance ?? null;
  if (key === "advances") {
    rec.used = advUsed(db, r);
    rec.refunded = advRefunded(db, r);
    rec.balance = advBalance(db, r);
    rec.refunds = db.refunds.filter((x) => x.advance === r.id).map((x) => ({ id: x.id, amount: x.amount, note: x.note, refunded_at: x.refunded_at }));
    rec.received_by_name = db.users.find((u) => u.id === r.received_by)?.name || "";
    delete rec.received_by;
  }
  if (key === "items") rec.is_low = r.quantity <= r.reorder_level;
  if (key === "rules" || key === "movements") rec.item_name = db.items.find((i) => i.id === r.item)?.name || "";
  if (key === "documents") rec.days_left = r.expiry_date ? Math.round((new Date(r.expiry_date) - new Date(localDate(nowIso()))) / 864e5) : null;
  if (key === "clinics") {
    rec.doctors = db.users.filter((u) => u.clinic === r.id && ["doctor", "consultant"].includes(u.role))
      .map((u) => ({ name: u.name, role: u.role, designation: u.designation, speciality: u.speciality, registration_number: u.registration_number }));
    if (me.role !== "doctor") delete rec.code;
  }
  return rec;
}

const ROUTES = {
  users: "users", clinics: "clinics", chairs: "chairs", documents: "documents", patients: "patients", visits: "visits",
  treatments: "treatments", images: "images", invoices: "invoices", payments: "payments", advances: "advances", feedback: "feedback", messages: "messages",
  "inventory/items": "items", "inventory/rules": "rules", "inventory/movements": "movements", "hygiene/checks": "checks",
};

const AFTER_AREAS = ["spit_basin", "chair_seat", "suction_tips", "rotors"];
const DAILY_AREAS = ["waiting", "reception", "operatories", "washroom", "pantry", "storage"];

// ---- entry point ---------------------------------------------------------------------

export async function mockRequest(method, path, { params = {}, body, token }) {
  await delay(90);
  const db = load();
  const seg = path.split("/").filter(Boolean);
  const result = await route(db, method, seg, params, body, token);
  save(db);
  return result;
}

async function route(db, method, seg, params, body, token) {
  if (seg[0] === "auth") return auth(db, method, seg[1], seg[2], body, token);

  const me = db.users.find((u) => u.id === db.tokens[token]);
  if (!me) throw new ApiError(401, { detail: "Invalid token." });

  if (seg[0] === "dashboard") return dashboard(db, me);

  const two = `${seg[0]}/${seg[1]}`;
  const prefix = ROUTES[two] ? 2 : 1;
  const key = ROUTES[prefix === 2 ? two : seg[0]];
  if (!key) throw new ApiError(404, { detail: "Not found." });
  return collection(db, me, method, key, seg.slice(prefix), params, body);
}

// ---- auth -----------------------------------------------------------------------------

const publicUser = ({ password, ...u }) => u; // eslint-disable-line no-unused-vars
const issue = (db, user) => { const token = rand(); db.tokens[token] = user.id; return { token, user: publicUser(user) }; };

function auth(db, method, a, b, body, token) {
  const { data } = parse(body);

  if (a === "login") {
    const phone = digits(data.phone);
    const u = db.users.find((x) => x.phone === phone && x.role !== "patient" && x.password === data.password);
    if (!u) throw new ApiError(401, { detail: "Wrong phone number or password." });
    return issue(db, u);
  }

  if (a === "register") {
    const phone = digits(data.phone);
    if (!data.name?.trim()) throw bad("name", "This field is required.");
    if (!PHONE_RE.test(phone)) throw bad("phone", "Enter a 10-digit Indian mobile number.");
    if (db.users.some((u) => u.phone === phone)) throw bad("phone", "Phone already in use.");
    const role = data.role;
    if (!["doctor", "consultant", "assistant", "patient"].includes(role)) throw bad("role", "Choose a role.");
    if (role !== "patient" && String(data.password || "").length < 6) throw bad("password", "Use at least 6 characters.");

    let clinic;
    if (role === "doctor") {
      if (!data.clinic_name?.trim()) throw bad("clinic_name", "Enter your clinic name.");
      clinic = { id: db.seq++, name: data.clinic_name.trim(), address: "", city: data.city || "", phone: "", google_review_url: "", website_url: "", social_url: "", code: "" };
      clinic.code = `SMILE${clinic.id}`;
      db.clinics.push(clinic);
      db.chairs.push({ id: db.seq++, clinic: clinic.id, name: "Chair 1", status: "ready" });
    } else {
      clinic = db.clinics.find((c) => c.code.toLowerCase() === String(data.clinic_code || "").trim().toLowerCase());
      if (!clinic) throw bad("clinic_code", "No clinic found with this code. Ask your clinic for it.");
    }

    if (role === "patient") {
      if (!data.consent_data) throw bad("consent_data", "Consent is required to register.");
      db.patients.push({
        id: db.seq++, clinic: clinic.id, name: data.name.trim(), phone, locality: "", chief_complaint: "", medical_history: "", dental_history: "",
        language: "en", consent_data: true, consent_whatsapp: !!data.consent_whatsapp, tips_subscribed: false, private_notes: "", selfie_url: null, created_at: nowIso(),
      });
      return { detail: "Account created. Log in with the code sent on WhatsApp.", dev_otp: OTP_CODE };
    }

    const user = {
      id: db.seq++, phone, password: data.password, name: data.name.trim(), role, clinic: clinic.id,
      designation: data.designation || "", speciality: data.speciality || "", registration_number: data.registration_number || "", is_active: true,
    };
    db.users.push(user);
    return issue(db, user);
  }

  if (a === "otp" && b === "request") {
    const phone = digits(data.phone);
    if (!PHONE_RE.test(phone)) throw bad("phone", "Enter a 10-digit Indian mobile number.");
    const res = { detail: "If this number is registered, a code has been sent on WhatsApp." };
    if (db.patients.some((p) => p.phone === phone)) { db.otps[phone] = { code: OTP_CODE, tries: 0 }; res.dev_otp = OTP_CODE; }
    return res;
  }

  if (a === "otp" && b === "verify") {
    const phone = digits(data.phone);
    const otp = db.otps[phone];
    if (!otp || otp.tries >= 5 || String(data.code) !== otp.code) {
      if (otp) otp.tries += 1;
      throw new ApiError(400, { detail: "Invalid or expired code." });
    }
    delete db.otps[phone];
    let user = db.users.find((u) => u.phone === phone);
    if (!user) {
      const first = db.patients.find((p) => p.phone === phone);
      user = { id: db.seq++, phone, password: "", name: first?.name || "", role: "patient", clinic: null, designation: "", speciality: "", registration_number: "", is_active: true };
      db.users.push(user);
    } else if (user.role !== "patient") throw new ApiError(400, { detail: "Staff must log in with a password." });
    return issue(db, user);
  }

  const me = db.users.find((u) => u.id === db.tokens[token]);
  if (!me) throw new ApiError(401, { detail: "Invalid token." });
  if (a === "me") return publicUser(me);
  if (a === "logout") { delete db.tokens[token]; return null; }
  throw new ApiError(404, { detail: "Not found." });
}

// ---- generic collections -----------------------------------------------------------------

async function collection(db, me, method, key, rest, params, body) {
  const [first, second] = rest;
  const isId = first && /^\d+$/.test(first);

  if (me.role === "patient" && method !== "GET" && key !== "feedback") throw forbidden();
  if (key === "checks" && !["doctor", "assistant"].includes(me.role)) throw forbidden();
  if (key === "documents" && me.role !== "doctor") throw forbidden();
  if (["items", "rules", "chairs", "users", "clinics"].includes(key) && method !== "GET" && me.role !== "doctor" && !(key === "items" && second === "stock-in")) throw forbidden();
  if (key === "movements" && me.role !== "doctor") throw forbidden();
  if (key === "feedback" && method === "GET" && me.role === "assistant") throw forbidden();
  if (key === "advances" && method === "PATCH") throw new ApiError(405, { detail: 'Method "PATCH" not allowed.' }); // never edited
  if (key === "advances" && method === "DELETE" && me.role !== "doctor") throw forbidden();

  if (first && !isId) return listAction(db, me, key, first, method, params, body);
  if (!first) return method === "GET" ? list(db, me, key, params) : create(db, me, key, body);

  const id = Number(first);
  const rec = db[key].find((r) => r.id === id && visible(db, me, key, r));
  if (!rec) throw new ApiError(404, { detail: "Not found." });
  if (second) return recordAction(db, me, key, rec, second, method, body);

  if (method === "GET") return out(db, me, key, rec);
  if (method === "DELETE") {
    if (key === "advances" && (advUsed(db, rec) > 0 || advRefunded(db, rec) > 0)) {
      throw new ApiError(400, ["This advance has been used or refunded, so it cannot be deleted."]);
    }
    db[key] = db[key].filter((r) => r.id !== id);
    return null;
  }
  if (method === "PATCH") return update(db, me, key, rec, body);
  throw new ApiError(405, { detail: "Method not allowed." });
}

function list(db, me, key, params) {
  let rows = db[key].filter((r) => visible(db, me, key, r));
  const skip = ["page", "search", "date", "phone", "days"];
  for (const [k, v] of Object.entries(params)) {
    if (skip.includes(k)) continue;
    rows = rows.filter((r) => r[k] === undefined || String(r[k]) === String(v));
  }
  if (params.search) { const q = params.search.toLowerCase(); rows = rows.filter((r) => `${r.name} ${r.phone}`.toLowerCase().includes(q)); }
  if (params.phone) rows = rows.filter((r) => r.phone === digits(params.phone));
  if (params.date && key === "visits") rows = rows.filter((r) => localDate(r.scheduled_at) === params.date);

  if (key === "visits") rows.sort((a, b) => a.scheduled_at.localeCompare(b.scheduled_at));
  else if (["items", "chairs"].includes(key)) rows.sort((a, b) => a.name.localeCompare(b.name));
  else if (key === "documents") rows.sort((a, b) => String(a.expiry_date).localeCompare(String(b.expiry_date)));
  else rows.sort((a, b) => b.id - a.id);

  return { count: rows.length, next: null, previous: null, results: rows.map((r) => out(db, me, key, r)) };
}

async function create(db, me, key, body) {
  const { data, files } = parse(body);
  const rec = { id: db.seq++, ...data };
  const myClinic = me.clinic ?? db.patients.find((p) => p.phone === me.phone)?.clinic ?? null;
  rec.clinic = myClinic;

  switch (key) {
    case "patients": {
      const phone = digits(data.phone);
      if (!data.name?.trim()) throw bad("name", "This field is required.");
      if (!PHONE_RE.test(phone)) throw bad("phone", "Enter a 10-digit Indian mobile number.");
      const dup = db.patients.find((p) => p.clinic === me.clinic && p.phone === phone);
      if (dup) throw bad("phone", `Already registered as patient #${dup.id} (${dup.name}).`);
      if (!data.consent_data) throw bad("consent_data", "Patient consent is required to register.");
      Object.assign(rec, {
        phone, locality: data.locality || "", chief_complaint: data.chief_complaint || "", medical_history: data.medical_history || "",
        dental_history: data.dental_history || "", language: data.language || "en", consent_data: true, consent_whatsapp: !!data.consent_whatsapp,
        tips_subscribed: false, private_notes: me.role === "doctor" ? data.private_notes || "" : "",
        selfie_url: await fileToData(files.selfie), created_at: nowIso(),
      });
      delete rec.selfie;
      break;
    }
    case "visits":
      if (!data.patient) throw bad("patient", "This field is required.");
      if (!data.scheduled_at) throw bad("scheduled_at", "This field is required.");
      Object.assign(rec, { status: data.status || "booked", notes: data.notes || "", doctor: data.doctor ?? null, chair: data.chair ?? null });
      break;
    case "treatments":
      if (!data.patient) throw bad("patient", "This field is required.");
      if (!data.procedure?.trim()) throw bad("procedure", "This field is required.");
      Object.assign(rec, { doctor: me.id, units: data.units || 1, cost: data.cost || 0, notes: data.notes || "", tooth: data.tooth || "", status: "planned", done_at: null, stock_deducted: false, created_at: nowIso() });
      break;
    case "images":
      if (!files.file) throw bad("file", "No file was submitted.");
      Object.assign(rec, { file_url: await fileToData(files.file), kind: data.kind || "intraoral", tooth: data.tooth || "", stage: data.stage || "", taken_at: data.taken_at || nowIso(), visit: data.visit ?? null });
      delete rec.file;
      break;
    case "invoices":
      if (!data.patient) throw bad("patient", "This field is required.");
      if (!Array.isArray(data.items) || !data.items.length) throw bad("items", "Add at least one line.");
      rec.items = data.items.map((i) => ({ id: db.seq++, description: i.description, amount: Number(i.amount) }));
      Object.assign(rec, { notes: data.notes || "", visit: data.visit ?? null, created_at: nowIso() });
      delete rec.apply_advance; // a flag for this request only, not stored
      break;
    case "advances": {
      if (!db.patients.some((p) => p.id === data.patient && p.clinic === me.clinic)) throw bad("patient", "Choose a patient of this clinic.");
      if (!(data.amount > 0)) throw bad("amount", "Amount must be more than zero.");
      const when = data.received_at || nowIso();
      if (new Date(when).getTime() > Date.now() + 5 * 60000) throw bad("received_at", "The date received cannot be in the future.");
      Object.assign(rec, { method: data.method || "cash", reference: data.reference || "", note: data.note || "", received_at: when, received_by: me.id, created_at: nowIso() });
      break;
    }
    case "payments": {
      const inv = db.invoices.find((i) => i.id === data.invoice);
      if (!inv) throw bad("invoice", "Invalid invoice.");
      if (data.method === "advance") throw bad("method", "Use the apply-advance action to pay from an advance.");
      if (!(data.amount > 0)) throw bad("amount", "Amount must be more than zero.");
      if (data.amount > totals(db, inv).due) throw bad("amount", "More than the amount due on this invoice.");
      Object.assign(rec, { clinic: inv.clinic, method: data.method || "cash", reference: data.reference || "", paid_at: nowIso() });
      break;
    }
    case "feedback": {
      if (!(data.rating >= 1 && data.rating <= 5)) throw bad("rating", "Rating must be from 1 to 5.");
      if (me.role === "patient") rec.patient = db.patients.find((p) => p.phone === me.phone)?.id ?? null;
      Object.assign(rec, { comment: data.comment || "", source: "app", reply: "", visit: data.visit ?? null, created_at: nowIso() });
      break;
    }
    case "chairs":
      if (!data.name?.trim()) throw bad("name", "This field is required.");
      if (db.chairs.some((c) => c.clinic === me.clinic && c.name === data.name.trim())) throw bad("name", "A chair with this name already exists.");
      Object.assign(rec, { name: data.name.trim(), status: "ready" });
      break;
    case "documents":
      if (!data.doc_type) throw bad("doc_type", "This field is required.");
      Object.assign(rec, { title: data.title || "", number: data.number || "", expiry_date: data.expiry_date || null, file_url: null });
      delete rec.file;
      break;
    case "items":
      if (!data.name?.trim()) throw bad("name", "This field is required.");
      Object.assign(rec, { unit: data.unit || "pcs", pack_size: data.pack_size || 1, shade_or_size: data.shade_or_size || "", batch: data.batch || "", expiry_date: data.expiry_date || null, reorder_level: data.reorder_level || 0, quantity: 0 });
      break;
    case "rules":
      if (!data.procedure?.trim() || !data.item || !(data.quantity > 0)) throw bad("procedure", "Procedure, item and quantity are required.");
      break;
    case "users": {
      const phone = digits(data.phone);
      if (!PHONE_RE.test(phone)) throw bad("phone", "Enter a 10-digit Indian mobile number.");
      if (db.users.some((u) => u.phone === phone)) throw bad("phone", "Phone already in use.");
      if (!["doctor", "consultant", "assistant"].includes(data.role)) throw bad("role", "Patients register through the patient endpoint.");
      if (String(data.password || "").length < 6) throw bad("password", "Use at least 6 characters.");
      Object.assign(rec, { phone, is_active: true, designation: data.designation || "", speciality: data.speciality || "", registration_number: data.registration_number || "" });
      break;
    }
    case "checks": {
      const kind = data.kind;
      const allowed = kind === "after_patient" ? AFTER_AREAS : DAILY_AREAS;
      if (!["after_patient", "morning", "evening"].includes(kind)) throw bad("kind", "Choose a check type.");
      if (kind === "after_patient" && !data.visit) throw bad("visit", "Required for an after-patient check.");
      if (!allowed.includes(data.area)) throw bad("area", `Choose one of: ${allowed.join(", ")}.`);
      if (!files.photo) throw bad("photo", "No file was submitted.");
      const photo = (await fileToData(files.photo)) || svgPhoto(files.photo.name, "#5b6f8a");
      const hash = hashStr(`${files.photo.name}|${files.photo.size}|${files.photo.lastModified}`);
      if (db.checks.some((c) => c.clinic === me.clinic && c.photo_hash === hash)) throw bad("photo", "This photo was already submitted. Take a new one.");
      Object.assign(rec, { photo_url: photo, photo_hash: hash, taken_by: me.id, taken_at: nowIso(), status: "pending", review_note: "", reviewed_at: null, visit: data.visit ?? null });
      delete rec.photo;
      db.checks.push(rec);
      if (kind === "after_patient") unlockChair(db, rec.visit);
      return out(db, me, key, rec);
    }
    default:
      throw new ApiError(405, { detail: "Method not allowed." });
  }
  db[key].push(rec);
  if (key === "visits") syncChair(db, rec);
  if (key === "invoices" && data.apply_advance === true) applyAdvance(db, rec);
  return out(db, me, key, rec);
}

function update(db, me, key, rec, body) {
  const { data } = parse(body);
  for (const f of READONLY[key] || []) delete data[f];
  delete data.id; delete data.clinic;
  if (key === "patients") {
    if (data.phone && digits(data.phone) !== rec.phone) throw bad("phone", "Phone number cannot be changed.");
    delete data.phone; delete data.selfie;
    if (me.role !== "doctor") delete data.private_notes;
  }
  if (key === "visits" && data.status === "in_progress" && rec.status !== "in_progress") {
    const chair = db.chairs.find((c) => c.id === (data.chair ?? rec.chair));
    if (chair?.status === "locked") throw bad("chair", "Chair is locked until the 4 hygiene photos are submitted.");
  }
  if (key === "users" && !data.password) delete data.password;
  Object.assign(rec, data);
  if (key === "visits") syncChair(db, rec);
  return out(db, me, key, rec);
}

function syncChair(db, visit) {
  const status = { in_progress: "in_use", completed: "locked" }[visit.status];
  const chair = db.chairs.find((c) => c.id === visit.chair);
  if (chair && status) chair.status = status;
}

function unlockChair(db, visitId) {
  const visit = db.visits.find((v) => v.id === visitId);
  const chair = visit && db.chairs.find((c) => c.id === visit.chair);
  if (!chair) return;
  const done = new Set(db.checks.filter((c) => c.visit === visitId && c.status !== "redo").map((c) => c.area));
  if (done.size >= AFTER_AREAS.length && chair.status === "locked") chair.status = "ready";
}

// ---- custom actions -------------------------------------------------------------------

function listAction(db, me, key, name, method, params, body) {
  const { data } = parse(body);
  const clinicRows = (k) => db[k].filter((r) => r.clinic === me.clinic);

  if (key === "items" && name === "alerts") {
    const soon = dateIn(30);
    const items = clinicRows("items");
    return {
      low_stock: items.filter((i) => i.quantity <= i.reorder_level).map((i) => out(db, me, "items", i)),
      expiring: items.filter((i) => i.expiry_date && i.expiry_date <= soon).map((i) => out(db, me, "items", i)),
    };
  }
  if (key === "documents" && name === "expiring") {
    return clinicRows("documents").filter((d) => d.expiry_date && d.expiry_date <= dateIn(60)).map((d) => out(db, me, "documents", d));
  }
  if (key === "checks" && name === "score") {
    if (me.role !== "doctor") throw forbidden();
    const days = Number(params.days || 30);
    const since = Date.now() - days * 864e5;
    const rows = clinicRows("checks").filter((c) => new Date(c.taken_at).getTime() >= since);
    const count = (s) => rows.filter((c) => c.status === s).length;
    const total = rows.length;
    return { days, pending: count("pending"), approved: count("approved"), redo: count("redo"), total, score: total ? Math.round((100 * count("approved")) / total) : null };
  }
  if (key === "messages" && name === "broadcast" && method === "POST") {
    if (me.role !== "doctor") throw forbidden();
    if (!data.template?.trim()) throw bad("template", "This field is required.");
    const pats = clinicRows("patients").filter((p) => p.consent_whatsapp);
    pats.forEach((p) => db.messages.push({ id: db.seq++, clinic: me.clinic, patient: p.id, to_phone: p.phone, kind: "offer", template: data.template, params: data.params || [], status: "dry_run", error: "", created_at: nowIso() }));
    return { patients: pats.length, results: pats.length ? { dry_run: pats.length } : {} };
  }
  throw new ApiError(404, { detail: "Not found." });
}

function recordAction(db, me, key, rec, name, method, body) {
  const { data } = parse(body);

  if (key === "patients" && name === "billing" && method === "GET") {
    const invoices = db.invoices.filter((i) => i.patient === rec.id);
    const advances = db.advances.filter((a) => a.patient === rec.id);
    const sum = (rows, f) => r2(rows.reduce((s, x) => s + f(x), 0));
    const billed = sum(invoices, (i) => totals(db, i).total);
    const paid = sum(invoices, (i) => totals(db, i).paid);
    const received = sum(advances, (a) => Number(a.amount));
    const used = sum(advances, (a) => advUsed(db, a));
    const refunded = sum(advances, (a) => advRefunded(db, a));
    return { billed, paid, due: r2(billed - paid), advance_received: received, advance_used: used, advance_refunded: refunded, advance_balance: r2(received - used - refunded) };
  }
  if (key === "invoices" && name === "apply-advance" && method === "POST") {
    applyAdvance(db, rec, data.amount);
    return out(db, me, key, rec);
  }
  if (key === "advances" && name === "refund" && method === "POST") {
    if (me.role !== "doctor") throw forbidden();
    const balance = advBalance(db, rec);
    const amount = data.amount === undefined || data.amount === "" ? balance : Number(data.amount);
    if (!(amount > 0) || amount > balance) throw bad("amount", `Only ${balance} is left to refund.`);
    db.refunds.push({ id: db.seq++, advance: rec.id, amount: r2(amount), note: String(data.note || ""), refunded_at: nowIso() });
    return out(db, me, key, rec);
  }

  if (key === "treatments" && name === "complete" && method === "POST") {
    if (!["doctor", "consultant"].includes(me.role)) throw forbidden();
    rec.status = "done"; rec.done_at = rec.done_at || nowIso();
    const used = [];
    if (!rec.stock_deducted) {
      db.rules.filter((r) => r.clinic === rec.clinic && r.procedure.toLowerCase() === rec.procedure.toLowerCase()).forEach((rule) => {
        const item = db.items.find((i) => i.id === rule.item);
        const amount = r2(rule.quantity * rec.units);
        item.quantity = r2(item.quantity - amount);
        db.movements.push({ id: db.seq++, clinic: rec.clinic, item: item.id, change: -amount, reason: "treatment", note: "", created_at: nowIso() });
        used.push({ item: item.name, used: amount, left: item.quantity });
      });
      rec.stock_deducted = true;
    }
    return { treatment: out(db, me, key, rec), stock_used: used };
  }
  if (key === "treatments" && name === "use-stock" && method === "POST") {
    const item = db.items.find((i) => i.id === data.item && i.clinic === rec.clinic);
    if (!item) throw bad("item", "Invalid item.");
    if (!(data.quantity > 0)) throw bad("quantity", "Enter a quantity above zero.");
    item.quantity = r2(item.quantity - data.quantity);
    db.movements.push({ id: db.seq++, clinic: rec.clinic, item: item.id, change: -data.quantity, reason: "manual", note: `Treatment #${rec.id}`, created_at: nowIso() });
    return { item: item.name, left: item.quantity };
  }
  if (key === "checks" && name === "review" && method === "POST") {
    if (me.role !== "doctor") throw forbidden();
    if (!["approved", "redo"].includes(data.status)) throw bad("status", "Use 'approved' or 'redo'.");
    Object.assign(rec, { status: data.status, review_note: String(data.note || "").slice(0, 200), reviewed_at: nowIso() });
    if (rec.visit) unlockChair(db, rec.visit);
    return out(db, me, key, rec);
  }
  if (key === "items" && name === "stock-in" && method === "POST") {
    if (!(data.packs > 0)) throw bad("packs", "Enter at least 0.01.");
    if (data.batch !== undefined && data.batch !== "") rec.batch = data.batch;
    if (data.expiry_date) rec.expiry_date = data.expiry_date;
    const add = r2(data.packs * rec.pack_size);
    rec.quantity = r2(rec.quantity + add);
    db.movements.push({ id: db.seq++, clinic: rec.clinic, item: rec.id, change: add, reason: "stock_in", note: `${data.packs} pack(s)`, created_at: nowIso() });
    return out(db, me, key, rec);
  }
  if (key === "items" && name === "count" && method === "POST") {
    if (me.role !== "doctor") throw forbidden();
    if (!(data.counted >= 0)) throw bad("counted", "Enter the counted quantity.");
    const variance = r2(data.counted - rec.quantity);
    rec.quantity = data.counted;
    db.movements.push({ id: db.seq++, clinic: rec.clinic, item: rec.id, change: variance, reason: "count", note: data.note || "", created_at: nowIso() });
    return { item: rec.name, quantity: rec.quantity, variance };
  }
  if (key === "feedback" && name === "reply" && method === "POST") {
    if (me.role !== "doctor") throw forbidden();
    rec.reply = String(data.reply || "");
    return out(db, me, key, rec);
  }
  throw new ApiError(404, { detail: "Not found." });
}

function dashboard(db, me) {
  if (me.role !== "doctor") throw forbidden();
  const rows = (k) => db[k].filter((r) => r.clinic === me.clinic);
  const today = localDate(nowIso());
  const items = rows("items");
  const month = Date.now() - 30 * 864e5;
  const ratings = rows("feedback").filter((f) => new Date(f.created_at).getTime() >= month).map((f) => f.rating);
  const billed = rows("invoices").reduce((s, i) => s + totals(db, i).due, 0);
  return {
    visits_today: rows("visits").filter((v) => localDate(v.scheduled_at) === today).length,
    low_stock_items: items.filter((i) => i.quantity <= i.reorder_level).length,
    expiring_stock_items: items.filter((i) => i.expiry_date && i.expiry_date <= dateIn(30)).length,
    documents_expiring_in_60_days: rows("documents").filter((d) => d.expiry_date && d.expiry_date <= dateIn(60)).length,
    hygiene_photos_to_review: rows("checks").filter((c) => c.status === "pending").length,
    locked_chairs: rows("chairs").filter((c) => c.status === "locked").length,
    dues: r2(billed),
    average_rating_30_days: ratings.length ? Math.round((ratings.reduce((a, b) => a + b, 0) / ratings.length) * 10) / 10 : null,
  };
}
