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

// The wider Packages Group companies IGI Holdings sits alongside. IGI's own
// entities (Insurance, Life, Securities) are already covered in the
// leadership grid above, so this list is the rest of the group.
const GROUP_COMPANIES = [
  {
    name: "Packages Limited",
    sector: "Packaging & Paper",
    color: "var(--accent)",
    blurb: "The group's founding company, started in 1956 as a joint venture with Sweden's Akerlund & Rausing; grew from a single carton unit into one of Pakistan's largest conglomerates.",
  },
  {
    name: "Packages Convertors Limited",
    sector: "Packaging & Paper",
    color: "var(--accent)",
    blurb: "A leading Pakistani packaging solutions provider, producing packaging materials and tissue products.",
  },
  {
    name: "Bulleh Shah Packaging",
    sector: "Packaging & Paper",
    color: "var(--accent)",
    blurb: "Produces paper & board and corrugated packaging, with a focus on responsible packaging for local brands.",
  },
  {
    name: "Packages Lanka",
    sector: "Packaging & Paper",
    color: "var(--accent)",
    blurb: "A Sri Lanka-based joint venture near Colombo, and the country's leading flexible packaging manufacturer.",
  },
  {
    name: "Chantler Packages",
    sector: "Packaging & Paper",
    color: "var(--accent)",
    blurb: "A flexible packaging manufacturer in Mississauga, Canada, serving the food industry.",
  },
  {
    name: "Tri-Pack Films Limited",
    sector: "Films & Materials",
    color: "var(--warn)",
    blurb: "Pakistan's top manufacturer of BOPP and CPP packaging films.",
  },
  {
    name: "DIC Pakistan",
    sector: "Films & Materials",
    color: "var(--warn)",
    blurb: "Pakistan's largest printing ink manufacturer, a joint venture with Japan's DIC Asia Pacific.",
  },
  {
    name: "OmyaPack",
    sector: "Films & Materials",
    color: "var(--warn)",
    blurb: "Producer of industrial minerals and specialty chemicals, a joint venture with Switzerland's Omya.",
  },
  {
    name: "StarchPack",
    sector: "Films & Materials",
    color: "var(--warn)",
    blurb: "A Kasur-based facility producing corn-derived starches used across food, paper and pharma industries.",
  },
  {
    name: "Hoechst Pakistan Limited",
    sector: "Pharmaceuticals",
    color: "var(--success)",
    blurb: "A pharmaceutical company with a 55+ year legacy of improving healthcare in Pakistan.",
  },
  {
    name: "Packages Mall",
    sector: "Real Estate & Trading",
    color: "var(--danger)",
    blurb: "A large Lahore shopping mall with retail, dining and cinema outlets, built on Packages' own site.",
  },
  {
    name: "Packages Trading FZCO",
    sector: "Real Estate & Trading",
    color: "var(--danger)",
    blurb: "Packages Limited's first UAE subsidiary, handling import, export, distribution and warehousing.",
  },
];

// The group's five core values, as published in its Code of Conduct. Colors
// match the segments of the values ribbon graphic (/assets/core-values.png).
const CORE_VALUES = [
  {
    name: "Care",
    color: "#C3D62E",
    blurb: "Fairness and consideration run through everything the group does.",
  },
  {
    name: "Respect",
    color: "#29ABE2",
    blurb: "Everyone is treated with respect and dignity.",
  },
  {
    name: "Lead",
    color: "#E63946",
    blurb: "Aspiring to lead in everything the group takes on.",
  },
  {
    name: "Honesty",
    color: "#F5A93F",
    blurb: "Truthfulness, integrity and trust underpin every activity.",
  },
  {
    name: "Courage",
    color: "#9C2D91",
    blurb: "The willingness to speak up and make bold, principled decisions.",
  },
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

function GroupCompanyCard({ name, sector, color, blurb }) {
  return (
    <div className="group-company-card">
      <span className="company-tag" style={{ background: color }}>{sector}</span>
      <div className="group-company-name">{name}</div>
      <p className="group-company-blurb">{blurb}</p>
    </div>
  );
}

function ValueRow({ name, color, blurb }) {
  return (
    <div className="value-row" style={{ borderLeftColor: color }}>
      <div className="value-row-name">{name}</div>
      <p className="value-row-blurb">{blurb}</p>
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
        <div className="leadership-intro">
          <div>
            <div className="section-label">Part of Packages Group</div>
            <p className="hint">
              IGI Holdings operates alongside {GROUP_COMPANIES.length} sister
              companies under the Packages Group umbrella - spanning packaging
              and paper, films and industrial materials, pharmaceuticals, and
              real estate, all built on the same founding principles of
              discipline and integrity.
            </p>
          </div>
          <div className="leadership-stat">
            <div className="leadership-stat-num">{GROUP_COMPANIES.length}</div>
            <div className="leadership-stat-label">Sister companies</div>
          </div>
        </div>

        <div className="group-banner-wrap group-banner-wrap-wide">
          <img
            src="/assets/packages-about.jpg"
            alt="Packages Group companies"
            className="group-banner"
          />
          <div className="group-banner-caption">Packages Group companies</div>
        </div>

        <div className="group-grid">
          {GROUP_COMPANIES.map(c => (
            <GroupCompanyCard
              key={c.name}
              name={c.name}
              sector={c.sector}
              color={c.color}
              blurb={c.blurb}
            />
          ))}
        </div>
      </div>

      <div className="card">
        <div className="section-label">Our Core Values</div>
        <p className="hint">
          Values the group holds higher than self-interest, and expects of
          every company, employee and partner acting under its name.
        </p>
        <div className="values-section">
          <img
            src="/assets/core-values.png"
            alt="Packages Group core values: Care, Respect, Lead, Honesty, Courage"
            className="values-image"
          />
          <div className="value-list">
            {CORE_VALUES.map(v => (
              <ValueRow key={v.name} name={v.name} color={v.color} blurb={v.blurb} />
            ))}
          </div>
        </div>
        <p className="mission-quote">
          Packages Group's mission is to raise the everyday quality of life
          and build sustainability on the triple bottom line of people,
          planet and prosperity.
        </p>
      </div>
    </div>
  );
}
