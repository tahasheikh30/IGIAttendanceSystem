import { useState } from "react";

// IGI Holdings' operating companies and their current leadership. Update
// this list (and drop matching images into /public/assets) whenever
// leadership changes - everything else on the page is driven from here.
const LEADERSHIP = [
  {
    name: "Faisal Khan",
    role: "CEO, IGI General Insurance",
    tag: "General Insurance",
    tagColor: "var(--accent)",
    blurb: "Property, motor, marine and other non-life cover for individuals and businesses.",
    img: "/assets/faisal-khan.jpg",
  },
  {
    name: "Ali Nadeem",
    role: "CEO, IGI Life",
    tag: "Life Insurance",
    tagColor: "var(--success)",
    blurb: "Life and health protection, savings and retirement plans.",
    img: "/assets/ali-nadeem.jpg",
  },
  {
    name: "Raza Hussain Rizvi",
    role: "CEO, IGI Securities",
    tag: "Securities",
    tagColor: "var(--warn)",
    blurb: "Brokerage and equity market access for retail and institutional clients.",
    img: "/assets/raza-hussain-rizvi.jpg",
  },
  {
    name: "Hadia Tariq",
    role: "HOD, Human Resources",
    tag: "Human Resources",
    tagColor: "var(--accent-dark)",
    blurb: "People, culture and talent across every IGI Holdings company.",
    img: "/assets/hadia-tariq.jpg",
  },
];

// Businesses operating under the wider Packages Group umbrella.
const GROUP_COMPANIES = [
  { name: "IGI Insurance", color: "var(--accent)" },
  { name: "IGI Investments", color: "var(--success)" },
  { name: "IGI Securities", color: "var(--warn)" },
  { name: "IGI FSI", color: "var(--danger)" },
  { name: "IGI Life", color: "var(--accent-dark)" },
];

function initials(name) {
  const parts = name.trim().split(/\s+/);
  const first = parts[0]?.[0] || "";
  const last = parts.length > 1 ? parts[parts.length - 1][0] : "";
  return (first + last).toUpperCase();
}

// Renders the given photo; if it's missing or fails to load (no file yet
// placed under /public/assets), falls back to an initials avatar instead
// of a broken image icon.
function LeadershipCard({ name, role, tag, tagColor, blurb, img }) {
  const [imgFailed, setImgFailed] = useState(false);
  const showPhoto = img && !imgFailed;

  return (
    <div className="leadership-card">
      <div className="leadership-photo-wrap">
        {showPhoto ? (
          <img
            src={img}
            alt={name}
            className="leadership-photo"
            onError={() => setImgFailed(true)}
          />
        ) : (
          <div className="leadership-avatar">{initials(name)}</div>
        )}
        {tag && (
          <span className="leadership-tag" style={{ background: tagColor || "var(--accent)" }}>
            {tag}
          </span>
        )}
      </div>
      <div className="leadership-body">
        <div className="leadership-name">{name}</div>
        <div className="leadership-role">{role}</div>
        {blurb && <p className="leadership-blurb">{blurb}</p>}
      </div>
    </div>
  );
}

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
        <div className="leadership-intro">
          <div>
            <div className="section-label">IGI Holdings</div>
            <p className="hint">
              IGI Holdings is the listed holding company behind four independently
              licensed and regulated businesses - General insurance, Life insurance,
              Investments, and Securities - each run by its own leadership team
              under a shared standard of governance and service.
            </p>
          </div>
          <div className="leadership-stat">
            <div className="leadership-stat-num">{LEADERSHIP.length}</div>
            <div className="leadership-stat-label">Leaders shown</div>
          </div>
        </div>
        <div className="leadership-grid">
          {LEADERSHIP.map(p => (
            <LeadershipCard
              key={p.name}
              name={p.name}
              role={p.role}
              tag={p.tag}
              tagColor={p.tagColor}
              blurb={p.blurb}
              img={p.img}
            />
          ))}
        </div>
      </div>

      <div className="card">
        <div className="section-label">Part of Packages Group</div>
        <div className="group-section">
          <div className="group-copy">
            <p className="hint">
              IGI Holdings and its subsidiaries operate under the Packages Group
              umbrella - a diversified group with roots in manufacturing that has
              grown into financial services, food, and paper packaging, built on
              the same founding principles of discipline and integrity.
            </p>
            <div className="group-chip-list">
              {GROUP_COMPANIES.map(c => (
                <span className="group-chip" key={c.name}>
                  <span className="group-chip-dot" style={{ background: c.color }} />
                  {c.name}
                </span>
              ))}
            </div>
          </div>
          <div className="group-banner-wrap">
            <img
              src="/assets/packages-about.jpg"
              alt="Packages Group companies"
              className="group-banner"
            />
            <div className="group-banner-caption">Packages Group companies</div>
          </div>
        </div>
      </div>
    </div>
  );
}
