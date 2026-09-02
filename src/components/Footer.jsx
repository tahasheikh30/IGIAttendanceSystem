import { Link } from "react-router-dom";

// Renders at the bottom of every page's content, inside main-content --
// distinct from the sidebar's own small "Part of Packages Group" logo
// block, which stays put as a nav-adjacent brand mark. This is the page
// footer proper: copyright and a link to the About page, kept short
// since there's no public-facing legal/contact content this tool needs
// to surface (it's an internal, login-gated system, not a public site).
export default function Footer() {
  const year = new Date().getFullYear();
  return (
    <footer className="app-footer">
      <span>© {year} IGI Holdings · Part of Packages Group</span>
      <span className="app-footer-links">
        <Link to="/about">About</Link>
      </span>
    </footer>
  );
}
