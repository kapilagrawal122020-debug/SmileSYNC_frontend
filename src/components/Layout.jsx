import { NavLink, Outlet } from "react-router-dom";
import { useAuth, ROLES } from "../auth/AuthContext";
import { isMock } from "../api/client";

// Which screens each role sees (follows the "who can see and do what" table in the brief).
const NAV = {
  doctor: [["/", "Today"], ["/patients", "Patients"], ["/appointments", "Appointments"], ["/hygiene", "Hygiene"], ["/inventory", "Inventory"], ["/messages", "Messages"], ["/clinic", "Clinic"]],
  consultant: [["/", "Today"], ["/patients", "Patients"], ["/appointments", "Appointments"], ["/inventory", "Inventory"], ["/clinic", "Clinic"]],
  assistant: [["/", "Today"], ["/patients", "Patients"], ["/appointments", "Appointments"], ["/hygiene", "Hygiene"], ["/inventory", "Inventory"], ["/clinic", "Clinic"]],
  patient: [["/", "My health"], ["/clinic", "My clinic"]],
};

export default function Layout() {
  const { user, logout } = useAuth();
  const links = NAV[user.role] || NAV.patient;
  const roleLabel = ROLES.find((r) => r.id === user.role)?.label;

  return (
    <div className="shell">
      <header className="topbar">
        <div className="topbar-in">
          <div className="brand"><span className="logo">S</span> SmileSYNC</div>
          <nav className="nav" aria-label="Main">
            {links.map(([to, text]) => (
              <NavLink key={to} to={to} end={to === "/"} className={({ isActive }) => `nav-link ${isActive ? "active" : ""}`}>{text}</NavLink>
            ))}
          </nav>
          <div className="who">
            {isMock() && <span className="demo-pill" title="Running on sample data in your browser">Demo</span>}
            <div className="who-text">
              <b>{user.name || user.phone}</b>
              <span>{roleLabel}</span>
            </div>
            <button className="btn small ghost-light" onClick={logout}>Log out</button>
          </div>
        </div>
      </header>
      <main className="content"><Outlet /></main>
    </div>
  );
}
