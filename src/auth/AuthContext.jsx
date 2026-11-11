import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { api, setUnauthorizedHandler, storage } from "../api/client";

const AuthContext = createContext(null);
export const useAuth = () => useContext(AuthContext);

export const ROLES = [
  { id: "doctor", label: "Doctor / owner", hint: "Full clinical view, reports, inventory, documents" },
  { id: "consultant", label: "Consultant", hint: "Treats patients, sees appointments" },
  { id: "assistant", label: "Assistant", hint: "Registers patients, images, hygiene, stock in" },
  { id: "patient", label: "Patient", hint: "Your records, scans, invoices, visits" },
];
export const isStaff = (role) => role && role !== "patient";

const readUser = () => {
  try { return JSON.parse(storage.get("ss_user") || "null"); } catch { return null; }
};

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => (storage.get("ss_token") ? readUser() : null));

  const finish = useCallback(({ token, user: u }) => {
    storage.set("ss_token", token);
    storage.set("ss_user", JSON.stringify(u));
    setUser(u);
  }, []);

  const clear = useCallback(() => {
    storage.del("ss_token");
    storage.del("ss_user");
    setUser(null);
  }, []);

  // Staff: phone + password.
  const loginStaff = useCallback(async (phone, password) => finish(await api.post("/auth/login/", { phone, password })), [finish]);
  // Patients: ask for a code on WhatsApp, then verify it.
  const requestOtp = useCallback((phone) => api.post("/auth/otp/request/", { phone }), []);
  const verifyOtp = useCallback(async (phone, code) => finish(await api.post("/auth/otp/verify/", { phone, code })), [finish]);

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
