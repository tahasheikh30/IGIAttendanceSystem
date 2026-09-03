import { Link } from "react-router-dom";

// Renders at the bottom of every page's content, inside main-content --
// distinct from the sidebar's own small "Part of Packages Group" logo
// block, which stays put as a nav-adjacent brand mark. This is the page
// footer proper: brand, office addresses, and a link to the About page,
// kept short since there's no public-facing legal/contact content this
// tool needs to surface (it's an internal, login-gated system, not a
// public site).
export default function Footer() {
  const year = new Date().getFullYear();
  return (
    <footer className="app-footer">
      <div className="app-footer-top">
        <div className="app-footer-brand">
          <img src="/assets/igi-logo.png" alt="IGI Holdings" className="app-footer-logo" />
          <div>
            <div className="app-footer-brand-title">IGI Holdings</div>
            <div className="app-footer-brand-sub">Attendance Intelligence</div>
          </div>
        </div>

        <div className="app-footer-col">
          <div className="app-footer-col-title">Links</div>
          <Link to="/about">About</Link>
          <a href="mailto:hadia.tariq@igi.com.pk">Contact</a>
        </div>

        <div className="app-footer-col">
          <div className="app-footer-col-title">Head Office</div>
          <span>
            7th Floor, The Forum, Suite 701-713, G-20, Block 9,
            Khayaban-e-Jami, Clifton, Karachi 75600
          </span>
        </div>

        <div className="app-footer-col">
          <div className="app-footer-col-title">Lahore Branch</div>
          <span>5-FCC, Syed Maratib Ali Road, Main Gulberg, Lahore</span>
        </div>
      </div>

      <div className="app-footer-bottom">
        <span>© {year} IGI Holdings. All rights reserved.</span>
        <span className="app-footer-tag">Part of Packages Group</span>
      </div>
    </footer>
  );
}
