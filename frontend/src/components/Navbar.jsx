import { useEffect, useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { Menu, X } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import Avatar from "./Avatar";

const publicLinks = [
  { to: "/", label: "Leaderboard", end: true },
  { to: "/about", label: "About" }
];

export default function Navbar() {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const { isAuthenticated, isAdmin, user, logout } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 8);
    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const handleLogout = async () => {
    setOpen(false);
    await logout();
    navigate("/");
  };

  const closeMenu = () => setOpen(false);

  return (
    <header className={`navbar ${scrolled ? "navbar-scrolled" : ""}`}>
      <div className="navbar-inner">
        <NavLink to="/" className="brand" onClick={closeMenu}>
          <span className="brand-mark" aria-hidden="true">
            C
          </span>
          Campus Code
        </NavLink>

        <nav className="nav-links">
          {publicLinks.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              end={link.end}
              className={({ isActive }) => `nav-link ${isActive ? "active" : ""}`}
            >
              {link.label}
            </NavLink>
          ))}
          {isAuthenticated && (
            <NavLink to="/dashboard" className={({ isActive }) => `nav-link ${isActive ? "active" : ""}`}>
              Dashboard
            </NavLink>
          )}
          {isAdmin && (
            <NavLink to="/admin" className={({ isActive }) => `nav-link ${isActive ? "active" : ""}`}>
              Admin
            </NavLink>
          )}
        </nav>

        <div className="nav-actions">
          {isAuthenticated ? (
            <>
              <NavLink to="/profile" className="nav-link" title="My profile" style={{ display: "flex" }}>
                <Avatar src={user?.profilePicture} name={user?.name} size={32} />
              </NavLink>
              <button className="btn btn-ghost btn-sm" onClick={handleLogout}>
                Logout
              </button>
            </>
          ) : (
            <NavLink to="/auth" className="btn btn-primary btn-sm">
              Student Login
            </NavLink>
          )}

          <button
            className="nav-toggle"
            onClick={() => setOpen((v) => !v)}
            aria-label={open ? "Close menu" : "Open menu"}
            aria-expanded={open}
          >
            {open ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </div>

      {open && (
        <div className="mobile-menu">
          {publicLinks.map((link) => (
            <NavLink key={link.to} to={link.to} end={link.end} className="nav-link" onClick={closeMenu}>
              {link.label}
            </NavLink>
          ))}
          {isAuthenticated && (
            <NavLink to="/dashboard" className="nav-link" onClick={closeMenu}>
              Dashboard
            </NavLink>
          )}
          {isAuthenticated && (
            <NavLink to="/profile" className="nav-link" onClick={closeMenu}>
              My Profile
            </NavLink>
          )}
          {isAdmin && (
            <NavLink to="/admin" className="nav-link" onClick={closeMenu}>
              Admin
            </NavLink>
          )}
          {!isAuthenticated && (
            <NavLink to="/auth" className="nav-link" onClick={closeMenu}>
              Student Login
            </NavLink>
          )}
        </div>
      )}
    </header>
  );
}
