import { Link } from "react-router-dom";

export default function Footer() {
  return (
    <footer className="footer">
      <div className="container footer-inner">
        <div className="footer-brand">
          <span className="brand" style={{ fontSize: 16 }}>
            CAMPUS CODE
          </span>
          <span className="footer-tagline">Powered by Switch</span>
        </div>
        <nav className="footer-links">
          <Link to="/">Leaderboard</Link>
          <Link to="/about">About</Link>
        </nav>
      </div>
    </footer>
  );
}
