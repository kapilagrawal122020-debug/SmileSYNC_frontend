import { useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import { Field, useSubmit } from "../components/ui";
import { AuthShell, RolePicker, cleanPhone } from "./AuthShell";

const empty = {
  name: "", phone: "", password: "", confirm: "",
  clinic_name: "", city: "", clinic_code: "",
  registration_number: "", designation: "", speciality: "",
  consent_data: false, consent_whatsapp: false,
};

export default function Signup() {
  const { register, requestOtp, verifyOtp } = useAuth();
  const [role, setRole] = useState("doctor");
  const [v, setV] = useState(empty);
  const [step, setStep] = useState("form"); // form -> code (patients only)
  const [code, setCode] = useState("");
  const [devCode, setDevCode] = useState("");
  const [localError, setLocalError] = useState("");

  const set = (k) => (e) => setV((s) => ({ ...s, [k]: e.target.type === "checkbox" ? e.target.checked : e.target.value }));
  const isPatient = role === "patient";
  const isDoctor = role === "doctor";
  const hasLicence = role === "doctor" || role === "consultant";

  const create = useSubmit(async () => {
    setLocalError("");
    if (!isPatient) {
      if (v.password.length < 6) throw new Error("Use at least 6 characters for the password.");
      if (v.password !== v.confirm) throw new Error("The two passwords do not match.");
    } else if (!v.consent_data) {
      throw new Error("Please accept the data consent to continue.");
    }
    const payload = { role, name: v.name.trim(), phone: cleanPhone(v.phone) };
    if (!isPatient) payload.password = v.password;
    if (isDoctor) Object.assign(payload, { clinic_name: v.clinic_name.trim(), city: v.city.trim() });
    else payload.clinic_code = v.clinic_code.trim();
    if (hasLicence) Object.assign(payload, { registration_number: v.registration_number.trim(), designation: v.designation.trim(), speciality: v.speciality.trim() });
    if (isPatient) Object.assign(payload, { consent_data: v.consent_data, consent_whatsapp: v.consent_whatsapp });

    const res = await register(payload);
    if (isPatient) {
      const otp = await requestOtp(payload.phone);
      setDevCode(otp?.dev_otp || res?.dev_otp || "");
      setStep("code");
    }
    return res; // staff are logged in by register() and routed to the app automatically
  });

  const verify = useSubmit(() => verifyOtp(cleanPhone(v.phone), code));

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
  const shown = create.error || localError;

  return (
    <AuthShell title="Create your account" subtitle="Pick your role first. The form changes to match.">
      <RolePicker value={role} onChange={(r) => { setRole(r); setLocalError(""); }} />

      <form onSubmit={create.submit} className="form" noValidate>
        <Field label="Full name" error={err("name")}>
          <input className="input" autoComplete="name" value={v.name} onChange={set("name")} required />
        </Field>
        <Field label="Mobile number" hint="10 digits. This is your login." error={err("phone")}>
          <input className="input" inputMode="numeric" autoComplete="tel" value={v.phone} onChange={set("phone")} required />
        </Field>

        {isDoctor ? (
          <div className="grid2">
            <Field label="Clinic name" error={err("clinic_name")}>
              <input className="input" value={v.clinic_name} onChange={set("clinic_name")} required />
            </Field>
            <Field label="City" error={err("city")}>
              <input className="input" value={v.city} onChange={set("city")} />
            </Field>
          </div>
        ) : (
          <Field label="Clinic code" hint="Ask your clinic for this code. The doctor can find it under Clinic." error={err("clinic_code")}>
            <input className="input" value={v.clinic_code} onChange={set("clinic_code")} required />
          </Field>
        )}

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
            <Field label="Password" error={err("password")}>
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

        {shown && <div className="note error" role="alert">{shown}</div>}

        <button className="btn primary block" disabled={create.busy}>{create.busy ? "Please wait…" : "Create account"}</button>
      </form>

      <p className="switch">Already registered? <Link to="/login">Log in</Link></p>
    </AuthShell>
  );
}
