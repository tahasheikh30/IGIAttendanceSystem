export default function AboutPage() {
  return (
    <div>
      <div className="page-header">
        <div>
          <h1>About</h1>
          <p className="page-sub">The company behind this system</p>
        </div>
      </div>

      <div className="tribute-card">
        <img src="/assets/syed-babar-ali.png" alt="Syed Babar Ali" className="tribute-portrait" />
        <div className="tribute-content">
          <div className="tribute-eyebrow">In tribute to</div>
          <h2 className="tribute-heading">Syed Babar Ali</h2>
          <div className="tribute-subheading">Founder, Packages Group</div>
          <p className="tribute-body">
            Syed Babar Ali founded Packages Limited in 1957 and, over the decades that
            followed, built it into one of Pakistan's most respected business groups —
            spanning packaging, insurance, investments, and education. IGI Holdings,
            the company this attendance system serves, traces its roots to that same
            founding vision: building institutions meant to last, run with discipline
            and integrity.
          </p>
          <p className="tribute-body">
            This system is a small, practical extension of that principle — using
            accurate, well-organized data to help the people who keep the company
            running do their work a little better.
          </p>
        </div>
      </div>

      <div className="card">
        <div className="section-label">Part of Packages Group</div>
        <p className="hint">IGI Holdings and its subsidiaries — Insurance, Investments, Securities, FSI, and Life — operate under the Packages Group umbrella.</p>
        <img src="/assets/packages-group.jpg" alt="Packages Group companies" className="group-banner" />
      </div>
    </div>
  );
}
