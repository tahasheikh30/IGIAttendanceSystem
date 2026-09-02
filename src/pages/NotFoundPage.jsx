import { Link } from "react-router-dom";

// Rendered for any authenticated route that doesn't match a real page
// (bad link, typo'd URL, an old bookmark to a since-removed page). Kept
// as its own route instead of the previous silent redirect-to-Overview
// so a broken link is visibly a broken link, not an unexplained jump.
export default function NotFoundPage() {
  return (
    <div className="empty-state">
      <div className="not-found-code">404</div>
      <div className="empty-title">Page not found</div>
      <p>The page you're looking for doesn't exist or may have moved.</p>
      <Link to="/" className="btn-primary not-found-link">Back to Overview</Link>
    </div>
  );
}
