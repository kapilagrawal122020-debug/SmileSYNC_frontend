import { lazy, Suspense } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { useAuth } from "./auth/AuthContext";
import Layout from "./components/Layout";
import PublicLayout from "./components/PublicLayout";
import Marketplace from "./pages/Marketplace";
import ClinicPage from "./pages/ClinicPage";
import Team from "./pages/Team";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import Dashboard from "./pages/Dashboard";
import Patients from "./pages/Patients";
import PatientDetail from "./pages/PatientDetail";
import Appointments from "./pages/Appointments";
import Hygiene from "./pages/Hygiene";
import Inventory from "./pages/Inventory";
import Messages from "./pages/Messages";
import Clinic from "./pages/Clinic";

// Admin pages are loaded on demand, so a doctor's or patient's browser never even downloads them.
const AdminOverview = lazy(() => import("./admin/Overview"));
const AdminLists = lazy(() => import("./admin/Lists"));
const AdminClinics = lazy(() => import("./admin/Clinics"));
const AdminUsers = lazy(() => import("./admin/Users"));
const AdminAudit = lazy(() => import("./admin/Audit"));

const STAFF = ["clinic_admin", "doctor", "consultant", "assistant"];
const ADMIN = ["clinic_admin"];

// Wrap a page so only some roles can open it. Others go back to the home screen.
function Only({ roles, children }) {
  const { user } = useAuth();
  return roles.includes(user.role) ? children : <Navigate to="/" replace />;
}

export default function App() {
  const { user } = useAuth();

  if (!user) {
    return (
      <Routes>
        {/* The marketplace: anyone can browse clinics. Sign in and sign up both start from a clinic. */}
        <Route element={<PublicLayout />}>
          <Route index element={<Marketplace />} />
          <Route path="c/:slug" element={<ClinicPage />} />
        </Route>
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    );
  }

  if (user.is_super_admin) {
    return (
      <Suspense fallback={<div className="empty">Loading…</div>}>
        <Routes>
          <Route element={<Layout />}>
            <Route path="admin" element={<AdminOverview />} />
            <Route path="admin/lists" element={<AdminLists />} />
            <Route path="admin/clinics" element={<AdminClinics />} />
            <Route path="admin/users" element={<AdminUsers />} />
            <Route path="admin/audit" element={<AdminAudit />} />
            <Route path="*" element={<Navigate to="/admin" replace />} />
          </Route>
          <Route path="/login" element={<Navigate to="/admin" replace />} />
          <Route path="/signup" element={<Navigate to="/admin" replace />} />
        </Routes>
      </Suspense>
    );
  }

  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<Dashboard />} />
        <Route path="patients" element={<Only roles={STAFF}><Patients /></Only>} />
        <Route path="patients/:id" element={<Only roles={STAFF}><PatientDetail /></Only>} />
        <Route path="appointments" element={<Only roles={STAFF}><Appointments /></Only>} />
        <Route path="hygiene" element={<Only roles={["clinic_admin", "doctor", "assistant"]}><Hygiene /></Only>} />
        <Route path="inventory" element={<Only roles={STAFF}><Inventory /></Only>} />
        <Route path="messages" element={<Only roles={ADMIN}><Messages /></Only>} />
        <Route path="team" element={<Only roles={ADMIN}><Team /></Only>} />
        <Route path="clinic" element={<Clinic />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
      <Route path="/login" element={<Navigate to="/" replace />} />
      <Route path="/signup" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
