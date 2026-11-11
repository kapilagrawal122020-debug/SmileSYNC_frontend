import { Navigate, Route, Routes } from "react-router-dom";
import { useAuth } from "./auth/AuthContext";
import Layout from "./components/Layout";
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

const STAFF = ["doctor", "consultant", "assistant"];

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
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    );
  }

  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<Dashboard />} />
        <Route path="patients" element={<Only roles={STAFF}><Patients /></Only>} />
        <Route path="patients/:id" element={<Only roles={STAFF}><PatientDetail /></Only>} />
        <Route path="appointments" element={<Only roles={STAFF}><Appointments /></Only>} />
        <Route path="hygiene" element={<Only roles={["doctor", "assistant"]}><Hygiene /></Only>} />
        <Route path="inventory" element={<Only roles={STAFF}><Inventory /></Only>} />
        <Route path="messages" element={<Only roles={["doctor"]}><Messages /></Only>} />
        <Route path="clinic" element={<Clinic />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
      <Route path="/login" element={<Navigate to="/" replace />} />
      <Route path="/signup" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
