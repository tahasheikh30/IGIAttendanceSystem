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
        <img
          src="/assets/syed-babar-ali.png"
          alt="Syed Babar Ali"
          className="tribute-portrait"
        />
        <div className="tribute-content">
          <div className="tribute-eyebrow">In tribute to</div>
          <h2 className="tribute-heading">Syed Babar Ali</h2>
          <div className="tribute-subheading">Founder, Packages Group</div>
          <p className="tribute-body">
            Syed Babar Ali was born in Lahore in 1926 and trained as a chemical
            engineer before joining the family business in 1953, building it
            into Packages Limited. He went on to found or co-found Milkpak (now
            Nestlé Pakistan), IGI Insurance, IGI Investment Bank, and Tri Pack
            Films, often through joint ventures with major multinationals.
            Beyond business, he founded the Lahore University of Management
            Sciences in 1985 and remained a lifelong advocate for education and
            philanthropy in Pakistan. IGI Holdings grew out of that same
            founding vision, institutions built to last, run with discipline and
            integrity.
          </p>
          <p className="tribute-body">
            This system is a small, practical extension of that principle -
            using accurate, well-organized data to help the people who keep the
            company running do their work a little better.
          </p>
        </div>
      </div>

      <div className="card">
        <div className="section-label">Part of Packages Group</div>
        <p className="hint">
          IGI Holdings and its subsidiaries - Insurance, Investments,
          Securities, FSI, and Life - operate under the Packages Group umbrella.
        </p>
        <img
          src="/assets/packages-group.jpg"
          alt="Packages Group companies"
          className="group-banner"
        />
      </div>
    </div>
  );
}
