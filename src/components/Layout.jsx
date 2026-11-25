import { NavLink, Outlet } from "react-router-dom";
import { useAuth, ROLES } from "../auth/AuthContext";
import { isMock } from "../api/client";
import { useLists } from "../lists/useLists";

// Which screens each role sees (follows the "who can see and do what" table in the brief).
const NAV = {
  clinic_admin: [["/", "Today"], ["/patients", "Patients"], ["/appointments", "Appointments"], ["/hygiene", "Hygiene"], ["/inventory", "Inventory"], ["/messages", "Messages"], ["/team", "Team"], ["/clinic", "Clinic"]],
  doctor: [["/", "Today"], ["/patients", "Patients"], ["/appointments", "Appointments"], ["/hygiene", "Hygiene"], ["/inventory", "Inventory"], ["/clinic", "Clinic"]],
  consultant: [["/", "Today"], ["/patients", "Patients"], ["/appointments", "Appointments"], ["/inventory", "Inventory"], ["/clinic", "Clinic"]],
  assistant: [["/", "Today"], ["/patients", "Patients"], ["/appointments", "Appointments"], ["/hygiene", "Hygiene"], ["/inventory", "Inventory"], ["/clinic", "Clinic"]],
  patient: [["/", "My health"], ["/clinic", "My clinic"]],
};
// Only the platform admin gets this menu. The API refuses everyone else as well.
const ADMIN_NAV = [["/admin", "Overview"], ["/admin/lists", "Lists"], ["/admin/clinics", "Clinics"], ["/admin/users", "Accounts"], ["/admin/audit", "Audit log"]];

export default function Layout() {
  const { user, logout } = useAuth();
  useLists(); // fetch the dropdown lists as soon as the app opens, so no screen waits for them
  const links = user.is_super_admin ? ADMIN_NAV : NAV[user.role] || NAV.patient;
  const roleLabel = user.is_super_admin ? "Platform admin" : ROLES.find((r) => r.id === user.role)?.label;

  return (
    <div className="shell">
      <header className="topbar">
        <div className="topbar-in">
          <div className="brand-block">
            <div className="brand"><span className="logo">S</span> SmileSYNC{user.is_super_admin && <span className="admin-tag">Admin</span>}</div>
            {!user.is_super_admin && user.clinic_name && <span className="clinic-pill" title="The clinic you are signed in to">{user.clinic_name}</span>}
          </div>
          <nav className="nav" aria-label="Main">
            {links.map(([to, text]) => (
              <NavLink key={to} to={to} end={to === "/" || to === "/admin"} className={({ isActive }) => `nav-link ${isActive ? "active" : ""}`}>{text}</NavLink>
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
