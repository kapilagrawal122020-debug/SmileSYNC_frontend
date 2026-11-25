import { Link, Outlet } from "react-router-dom";
import { isMock } from "../api/client";

// The frame around the marketplace: anyone can browse clinics without an account.
export default function PublicLayout() {
  return (
    <div className="shell">
      <header className="topbar">
        <div className="topbar-in">
          <Link className="brand" to="/"><span className="logo">S</span> SmileSYNC</Link>
          <nav className="nav" aria-label="Main">
            <Link className="nav-link" to="/">Find a clinic</Link>
          </nav>
          <div className="who">
            {isMock() && <span className="demo-pill" title="Running on sample data in your browser">Demo</span>}
            <Link className="btn small ghost-light" to="/login">Log in</Link>
            <Link className="btn small" to="/signup">Create account</Link>
          </div>
        </div>
      </header>
      <main className="content"><Outlet /></main>
      <footer className="public-foot">
        <span>SmileSYNC: one place for dental clinics and their patients.</span>
        <span className="muted small">Clinics are added by the SmileSYNC team. Want yours listed? Get in touch with us.</span>
      </footer>
    </div>
  );
}
