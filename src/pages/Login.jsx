import { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import { isMock, storage } from "../api/client";
import { Field, useSubmit } from "../components/ui";
import { AuthShell, cleanPhone } from "./AuthShell";
import ClinicPicker from "./ClinicPicker";

// Sample accounts for demo mode. All of them belong to clinic 1.
const DEMO_STAFF = [
  ["Clinic admin", "9000000001", "doctor123"],
  ["Doctor", "9000000004", "doctor123"],
  ["Consultant", "9000000003", "consult123"],
  ["Assistant", "9000000002", "assist123"],
];

// Everything starts from a clinic: you choose it, then sign in as its team or as one of its patients.
// The platform admin is the one exception and has its own entrance (?admin=1).
export default function Login() {
  const { loginStaff, requestOtp, verifyOtp } = useAuth();
  const [params, setParams] = useSearchParams();
  const adminMode = params.get("admin") === "1";
  const [clinic, setClinicState] = useState(() => Number(params.get("clinic")) || Number(storage.get("ss_clinic")) || null);
  const [who, setWho] = useState(params.get("as") === "patient" ? "patient" : "staff");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [codeSent, setCodeSent] = useState(false);
  const [devCode, setDevCode] = useState("");
  const isPatient = who === "patient" && !adminMode;

  const setClinic = (id) => { setClinicState(id); setCodeSent(false); setCode(""); setDevCode(""); };
  const pickWho = (w) => { setWho(w); setCodeSent(false); setCode(""); setDevCode(""); };
  const needClinic = () => { if (!clinic) throw new Error("Choose your clinic first."); };

  const staff = useSubmit(() => { if (!adminMode) needClinic(); return loginStaff(cleanPhone(phone), password, adminMode ? undefined : clinic); });
  const send = useSubmit(() => { needClinic(); return requestOtp(cleanPhone(phone), clinic); }, (res) => { setCodeSent(true); setDevCode(res?.dev_otp || ""); });
  const verify = useSubmit(() => { needClinic(); return verifyOtp(cleanPhone(phone), code, clinic); });
  const active = !isPatient ? staff : codeSent ? verify : send;

  const fill = (p, pw = "") => { setClinic(1); setPhone(p); setPassword(pw); };
  const toggleAdmin = () => setParams(adminMode ? {} : { admin: "1" });

  return (
    <AuthShell
      title={adminMode ? "Platform admin" : "Welcome back"}
      subtitle={adminMode ? "For the SmileSYNC team. Clinics sign in from the clinic page." : "Choose your clinic, then sign in."}
    >
      {!adminMode && <ClinicPicker value={clinic} onChange={setClinic} />}

      {!adminMode && (
        <div className="seg" role="radiogroup" aria-label="I am">
          <button type="button" role="radio" aria-checked={who === "staff"} className={who === "staff" ? "on" : ""} onClick={() => pickWho("staff")}>Clinic team</button>
          <button type="button" role="radio" aria-checked={who === "patient"} className={who === "patient" ? "on" : ""} onClick={() => pickWho("patient")}>Patient</button>
        </div>
      )}

      <form onSubmit={active.submit} className="form" noValidate>
        <Field label="Mobile number" error={active.fields.phone}>
          <input
            className="input" inputMode="numeric" autoComplete="tel" placeholder="10-digit mobile number"
            value={phone} onChange={(e) => setPhone(e.target.value)} disabled={isPatient && codeSent} required
          />
        </Field>

        {!isPatient && (
          <Field label="Password" error={active.fields.password}>
            <input className="input" type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} required />
          </Field>
        )}

        {isPatient && codeSent && (
          <Field label="6-digit code" hint="Sent to your WhatsApp. It is valid for 10 minutes." error={verify.fields.code}>
            <input className="input" inputMode="numeric" maxLength={6} autoComplete="one-time-code" value={code} onChange={(e) => setCode(e.target.value)} autoFocus required />
          </Field>
        )}
        {isPatient && codeSent && devCode && <div className="note info">Test code: <b>{devCode}</b> (only shown while the backend is in debug mode)</div>}

        {active.error && <div className="note error" role="alert">{active.error}</div>}
        {!active.error && active.fields.clinic && <div className="note error" role="alert">{String(active.fields.clinic)}</div>}

        <button className="btn primary block" disabled={active.busy}>
          {active.busy ? "Please wait…" : !isPatient ? "Log in" : codeSent ? "Verify and log in" : "Send code on WhatsApp"}
        </button>

        {isPatient && codeSent && (
          <button type="button" className="link center" onClick={() => { setCodeSent(false); setCode(""); }}>Use a different number</button>
        )}
      </form>

      {isMock() && !adminMode && (
        <div className="demo-fill">
          <span className="muted small">Demo accounts:</span>
          {!isPatient
            ? DEMO_STAFF.map(([label, p, pw]) => <button type="button" key={p} className="btn small ghost" onClick={() => fill(p, pw)}>{label}</button>)
            : <button type="button" className="btn small ghost" onClick={() => fill("9111111111")}>Patient</button>}
        </div>
      )}

      <p className="switch">New here? <Link to={clinic ? `/signup?clinic=${clinic}` : "/signup"}>Create an account</Link> · <Link to="/">Find a clinic</Link></p>
      <p className="switch"><button type="button" className="link" onClick={toggleAdmin}>{adminMode ? "← Back to clinic sign in" : "Platform admin? Sign in here"}</button></p>
    </AuthShell>
  );
}
