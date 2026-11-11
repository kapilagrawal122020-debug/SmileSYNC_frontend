import { useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import { isMock } from "../api/client";
import { Field, useSubmit } from "../components/ui";
import { AuthShell, RolePicker, cleanPhone } from "./AuthShell";

const DEMO = {
  doctor: { phone: "9000000001", password: "doctor123" },
  consultant: { phone: "9000000003", password: "consult123" },
  assistant: { phone: "9000000002", password: "assist123" },
  patient: { phone: "9111111111" },
};

export default function Login() {
  const { loginStaff, requestOtp, verifyOtp } = useAuth();
  const [role, setRole] = useState("doctor");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [codeSent, setCodeSent] = useState(false);
  const [devCode, setDevCode] = useState("");
  const isPatient = role === "patient";

  const pickRole = (r) => { setRole(r); setCodeSent(false); setCode(""); setDevCode(""); };
  const fillDemo = () => { setPhone(DEMO[role].phone); setPassword(DEMO[role].password || ""); };

  const staff = useSubmit(() => loginStaff(cleanPhone(phone), password));
  const send = useSubmit(() => requestOtp(cleanPhone(phone)), (res) => { setCodeSent(true); setDevCode(res?.dev_otp || ""); });
  const verify = useSubmit(() => verifyOtp(cleanPhone(phone), code));

  const active = !isPatient ? staff : codeSent ? verify : send;

  return (
    <AuthShell title="Welcome back" subtitle="Choose your role and log in.">
      <RolePicker value={role} onChange={pickRole} />

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

        <button className="btn primary block" disabled={active.busy}>
          {active.busy ? "Please wait…" : !isPatient ? "Log in" : codeSent ? "Verify and log in" : "Send code on WhatsApp"}
        </button>

        {isPatient && codeSent && (
          <button type="button" className="link center" onClick={() => { setCodeSent(false); setCode(""); }}>Use a different number</button>
        )}
      </form>

      {isMock() && (
        <button type="button" className="btn ghost block" onClick={fillDemo}>Fill demo {role} details</button>
      )}

      <p className="switch">New here? <Link to="/signup">Create an account</Link></p>
    </AuthShell>
  );
}
