import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { api, setUnauthorizedHandler, storage } from "../api/client";
import { clearLists } from "../lists/useLists";

const AuthContext = createContext(null);
export const useAuth = () => useContext(AuthContext);

export const ROLES = [
  { id: "clinic_admin", label: "Clinic admin", hint: "Runs the clinic: team, billing, stock, documents" },
  { id: "doctor", label: "Doctor", hint: "Treats patients, private notes, hygiene review" },
  { id: "consultant", label: "Consultant", hint: "Treats patients, sees appointments" },
  { id: "assistant", label: "Assistant", hint: "Registers patients, images, hygiene, stock in" },
  { id: "patient", label: "Patient", hint: "Your records, scans, invoices, visits" },
];
// Who can ask to join a clinic. Clinic admins are created by the SmileSYNC team, so they are not on this list.
export const SIGNUP_ROLES = ROLES.filter((r) => r.id !== "clinic_admin");
export const isStaff = (role) => role && role !== "patient";

const readUser = () => {
  try { return JSON.parse(storage.get("ss_user") || "null"); } catch { return null; }
};

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => (storage.get("ss_token") ? readUser() : null));

  const finish = useCallback(({ token, user: u }) => {
    clearLists();
    if (u?.clinic_id) storage.set("ss_clinic", String(u.clinic_id)); // so the next sign in starts at the same clinic
    storage.set("ss_token", token);
    storage.set("ss_user", JSON.stringify(u));
    setUser(u);
  }, []);

  const clear = useCallback(() => {
    clearLists();
    storage.del("ss_token");
    storage.del("ss_user");
    setUser(null);
  }, []);

  // Staff: phone + password.
  // Staff sign in to one clinic. The platform admin signs in without one.
  const loginStaff = useCallback(async (phone, password, clinic) => finish(await api.post("/auth/login/", { phone, password, ...(clinic ? { clinic } : {}) })), [finish]);
  // Patients: ask for a code on WhatsApp, then verify it.
  const requestOtp = useCallback((phone, clinic) => api.post("/auth/otp/request/", { phone, clinic }), []);
  const verifyOtp = useCallback(async (phone, code, clinic) => finish(await api.post("/auth/otp/verify/", { phone, code, clinic })), [finish]);

  const register = useCallback(async (payload) => {
    let res;
    try {
      res = await api.post("/auth/register/", payload);
    } catch (err) {
      // The current backend has no sign-up route yet (see README). Say so plainly.
      if (err.status === 404 || err.status === 405) {
        throw new Error("Sign-up is not available on this server yet. Ask your clinic to add you (Clinic → Staff for staff, Register patient for patients), or switch on Demo mode to try it.");
      }
      throw err;
    }
    if (res?.token) finish(res); // staff are logged in straight away; patients continue with the code step
    return res;
  }, [finish]);

  const logout = useCallback(async () => {
    try { await api.post("/auth/logout/"); } catch { /* token may already be gone */ }
    clear();
  }, [clear]);

  useEffect(() => { setUnauthorizedHandler(clear); }, [clear]);

  // Refresh the profile once on load so a stale saved user does not linger.
  useEffect(() => {
    if (!storage.get("ss_token")) return;
    api.get("/auth/me/").then((u) => { storage.set("ss_user", JSON.stringify(u)); setUser(u); }).catch(() => {});
  }, []);

  const value = useMemo(() => ({ user, loginStaff, requestOtp, verifyOtp, register, logout }), [user, loginStaff, requestOtp, verifyOtp, register, logout]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
