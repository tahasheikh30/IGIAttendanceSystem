import { useState } from "react";

// IGI Holdings' operating companies and their current leadership. Update
// this list (and drop matching images into /public/assets) whenever
// leadership changes - everything else on the page is driven from here.
const LEADERSHIP = [
  { name: "Faisal Khan", role: "CEO, IGI General Insurance", img: "/assets/faisal-khan.jpg" },
  { name: "Ali Nadeem", role: "CEO, IGI Life", img: "/assets/ali-nadeem.jpg" },
  { name: "Raza Hussain Rizvi", role: "CEO, IGI Securities", img: "/assets/raza-hussain-rizvi.jpg" },
  { name: "Hadia Tariq", role: "HOD, Human Resources", img: "/assets/hadia-tariq.jpg" },
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
function LeadershipCard({ name, role, img }) {
  const [imgFailed, setImgFailed] = useState(false);
  const showPhoto = img && !imgFailed;

  return (
    <div className="leadership-card">
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
      <div>
        <div className="leadership-name">{name}</div>
        <div className="leadership-role">{role}</div>
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
        <div className="section-label">IGI Holdings</div>
        <p className="hint">
          IGI Holdings is the listed holding company behind four independently
          licensed and regulated businesses - General insurance, Life insurance,
          Investments, and Securities - each run by its own leadership team
          under a shared standard of governance and service.
        </p>
        <div className="leadership-grid">
          {LEADERSHIP.map(p => (
            <LeadershipCard key={p.name} name={p.name} role={p.role} img={p.img} />
          ))}
        </div>
      </div>

      <div className="card">
        <div className="section-label">Part of Packages Group</div>
        <p className="hint">
          IGI Holdings and its subsidiaries - Insurance, Investments,
          Securities, FSI, and Life - operate under the Packages Group umbrella.
        </p>
        <img
          src="/assets/packages-about.jpg"
          alt="Packages Group companies"
          className="group-banner"
        />
      </div>
    </div>
  );
}
