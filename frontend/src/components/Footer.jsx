import { Link } from "react-router-dom";

const FOOTER_COLUMNS = [
  {
    heading: "Campus Code",
    links: [
      { to: "/", label: "Leaderboard" },
      { to: "/about", label: "About" }
    ]
  },
  {
    heading: "Account",
    links: [
      { to: "/auth", label: "Student Login" },
      { to: "/dashboard", label: "Dashboard" },
      { to: "/profile", label: "My Profile" }
    ]
  }
];

export default function Footer() {
  return (
    <footer className="footer">
      <div className="container footer-grid">
        {FOOTER_COLUMNS.map((col) => (
          <div key={col.heading} className="footer-col">
            <h4>{col.heading}</h4>
            {col.links.map((link) => (
              <Link key={link.to} to={link.to}>
                {link.label}
              </Link>
            ))}
          </div>
        ))}
        <div className="footer-col">
          <h4>About</h4>
          <p className="footer-note">Silicon University's competitive coding leaderboard.</p>
          <p className="footer-note footer-powered">Powered by SWITCH</p>
        </div>
      </div>
    </footer>
  );
}
