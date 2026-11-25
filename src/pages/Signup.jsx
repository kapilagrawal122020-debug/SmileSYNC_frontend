import { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import { storage } from "../api/client";
import { Field, useSubmit } from "../components/ui";
import { AuthShell, RolePicker, cleanPhone } from "./AuthShell";
import ClinicPicker, { useClinics } from "./ClinicPicker";

const empty = {
  name: "", phone: "", password: "", confirm: "",
  registration_number: "", designation: "", speciality: "",
  consent_data: false, consent_whatsapp: false,
};

// You join ONE clinic. Staff wait for that clinic's admin to approve them; patients sign in with a WhatsApp code.
// Clinics themselves (and their first admin) are added by the SmileSYNC team, so there is no "create a clinic" here.
export default function Signup() {
  const { register, requestOtp, verifyOtp } = useAuth();
  const [params] = useSearchParams();
  const [clinic, setClinic] = useState(() => Number(params.get("clinic")) || Number(storage.get("ss_clinic")) || null);
  const [role, setRole] = useState(["doctor", "consultant", "assistant", "patient"].includes(params.get("role")) ? params.get("role") : "patient");
  const [v, setV] = useState(empty);
  const [step, setStep] = useState("form"); // form -> pending (staff) | code (patients)
  const [code, setCode] = useState("");
  const [devCode, setDevCode] = useState("");
  const clinics = useClinics();
  const clinicName = (clinics.data || []).find((c) => c.id === clinic)?.name || "your clinic";

  const set = (k) => (e) => setV((s) => ({ ...s, [k]: e.target.type === "checkbox" ? e.target.checked : e.target.value }));
  const isPatient = role === "patient";
  const hasLicence = role === "doctor" || role === "consultant";

  const create = useSubmit(async () => {
    if (!clinic) throw new Error("Choose your clinic from the list.");
    if (!isPatient) {
      if (v.password.length < 8) throw new Error("Use at least 8 characters for the password.");
      if (v.password !== v.confirm) throw new Error("The two passwords do not match.");
    } else if (!v.consent_data) {
      throw new Error("Please accept the data consent to continue.");
    }
    const payload = { role, clinic, name: v.name.trim(), phone: cleanPhone(v.phone) };
    if (!isPatient) payload.password = v.password;
    if (hasLicence) Object.assign(payload, { registration_number: v.registration_number.trim(), designation: v.designation.trim(), speciality: v.speciality.trim() });
    if (isPatient) Object.assign(payload, { consent_data: v.consent_data, consent_whatsapp: v.consent_whatsapp });

    const res = await register(payload);
    storage.set("ss_clinic", String(clinic));
    if (res?.pending) { setStep("pending"); return res; }
    const otp = await requestOtp(payload.phone, clinic); // patients: straight on to the code
    setDevCode(otp?.dev_otp || "");
    setStep("code");
    return res;
  });

  const verify = useSubmit(() => verifyOtp(cleanPhone(v.phone), code, clinic));

  if (step === "pending") {
    return (
      <AuthShell title="Request received" subtitle={`The admin of ${clinicName} will switch your account on.`}>
        <div className="note info" role="status">
          Your account is waiting for approval. Once the clinic admin approves it, log in at {clinicName} with {cleanPhone(v.phone)} and the password you just chose.
        </div>
        <Link className="btn primary block" to={`/login?clinic=${clinic}`}>Go to log in</Link>
      </AuthShell>
    );
  }

  if (step === "code") {
    return (
      <AuthShell title="Check WhatsApp" subtitle={`We sent a 6-digit code to ${cleanPhone(v.phone)}.`}>
        <form onSubmit={verify.submit} className="form" noValidate>
          <Field label="6-digit code" error={verify.fields.code}>
            <input className="input" inputMode="numeric" maxLength={6} autoComplete="one-time-code" value={code} onChange={(e) => setCode(e.target.value)} autoFocus required />
          </Field>
          {devCode && <div className="note info">Test code: <b>{devCode}</b> (only shown while the backend is in debug mode)</div>}
          {verify.error && <div className="note error" role="alert">{verify.error}</div>}
          <button className="btn primary block" disabled={verify.busy}>{verify.busy ? "Please wait…" : "Verify and continue"}</button>
        </form>
      </AuthShell>
    );
  }

  const err = (k) => create.fields[k];

  return (
    <AuthShell title="Create your account" subtitle="Choose your clinic, then tell us who you are.">
      <ClinicPicker value={clinic} onChange={setClinic} error={err("clinic")} />
      <RolePicker value={role} onChange={setRole} />

      <form onSubmit={create.submit} className="form" noValidate>
        <Field label="Full name" error={err("name")}>
          <input className="input" autoComplete="name" value={v.name} onChange={set("name")} required />
        </Field>
        <Field label="Mobile number" hint={isPatient ? "10 digits. We send your login code here." : "10 digits. This is your login."} error={err("phone")}>
          <input className="input" inputMode="numeric" autoComplete="tel" value={v.phone} onChange={set("phone")} required />
        </Field>

        {hasLicence && (
          <>
            <Field label="Dental council registration number" error={err("registration_number")}>
              <input className="input" value={v.registration_number} onChange={set("registration_number")} />
            </Field>
            <div className="grid2">
              <Field label="Designation" error={err("designation")}>
                <input className="input" placeholder="BDS, MDS" value={v.designation} onChange={set("designation")} />
              </Field>
              <Field label="Speciality" error={err("speciality")}>
                <input className="input" placeholder="Orthodontics" value={v.speciality} onChange={set("speciality")} />
              </Field>
            </div>
          </>
        )}

        {!isPatient && (
          <div className="grid2">
            <Field label="Password" hint="At least 8 characters" error={err("password")}>
              <input className="input" type="password" autoComplete="new-password" value={v.password} onChange={set("password")} required />
            </Field>
            <Field label="Confirm password">
              <input className="input" type="password" autoComplete="new-password" value={v.confirm} onChange={set("confirm")} required />
            </Field>
          </div>
        )}

        {isPatient && (
          <div className="stack">
            <label className="check">
              <input type="checkbox" checked={v.consent_data} onChange={set("consent_data")} />
              <span>I agree to the clinic storing my health records and photos (DPDP Act 2023). <em>Required</em></span>
            </label>
            {err("consent_data") && <span className="err">{String(err("consent_data"))}</span>}
            <label className="check">
              <input type="checkbox" checked={v.consent_whatsapp} onChange={set("consent_whatsapp")} />
              <span>Send me appointment reminders and offers on WhatsApp. I can say STOP any time.</span>
            </label>
            <p className="hint">You log in with a code sent to WhatsApp. No password needed.</p>
          </div>
        )}
        {!isPatient && <p className="hint">The clinic admin approves new team members before they can log in.</p>}

        {create.error && <div className="note error" role="alert">{create.error}</div>}

        <button className="btn primary block" disabled={create.busy}>{create.busy ? "Please wait…" : isPatient ? "Register and get my code" : "Ask to join"}</button>
      </form>

      <p className="switch">Already registered? <Link to={clinic ? `/login?clinic=${clinic}` : "/login"}>Log in</Link> · <Link to="/">Find a clinic</Link></p>
    </AuthShell>
  );
}
