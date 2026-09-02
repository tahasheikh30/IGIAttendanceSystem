import { Link } from "react-router-dom";

// Renders at the bottom of every page's content, inside main-content --
// distinct from the sidebar's own small "Part of Packages Group" logo
// block, which stays put as a nav-adjacent brand mark. This is the page
// footer proper: copyright, office addresses, and a link to the About
// page, kept short since there's no public-facing legal/contact content
// this tool needs to surface (it's an internal, login-gated system, not
// a public site).
export default function Footer() {
  const year = new Date().getFullYear();
  return (
    <footer className="app-footer">
      <div className="app-footer-main">
        <span>© {year} IGI Holdings. Part of Packages Group.</span>
        <span className="app-footer-links">
          <Link to="/about">About</Link>
          <a href="mailto:contact.center@igi.com.pk">Contact</a>
        </span>
      </div>
      <div className="app-footer-offices">
        <span>
          Head Office, 7th Floor, The Forum, Suite 701-713, G-20, Block 9,
          Khayaban-e-Jami, Clifton, Karachi 75600
        </span>
        <span className="app-footer-offices-divider">|</span>
        <span>
          Lahore Branch, 5-FCC, Syed Maratib Ali Road, Main Gulberg, Lahore
        </span>
      </div>
    </footer>
  );
}
