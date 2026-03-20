import { useState } from "react";

// ─── Theme Data (Matching App.jsx) ───────────────────────────────────────────
const C = {
  bg:"#f5f6f8", sur:"#ffffff", bdr:"#e2e5ea", bdrM:"#c8cdd5",
  txt:"#1c1f26", txtM:"#4a5060", txtS:"#8a93a2",
  acc:"#b86b0a", accL:"#fff7ed", accB:"#f5a623",
  blue:"#2563eb", bluB:"#eff6ff", bluBdr:"#bfdbfe",
  grn:"#16a34a", grnB:"#f0fdf4", grnBdr:"#bbf7d0",
  red:"#dc2626", redB:"#fef2f2", redBdr:"#fecaca",
  ora:"#ea580c", teal:"#0d9488", purp:"#7c3aed", lime:"#15803d",
  yel:"#b45309", yelB:"#fffbeb", yelBdr:"#fde68a",
};

const colorMap = {
  teal:   { bg: C.tealB, border: C.tealBdr, text: C.teal,  accent: C.teal },
  amber:  { bg: C.yelB,  border: C.yelBdr,  text: C.yel,   accent: C.yel },
  violet: { bg: "#f5f3ff", border: "#ddd6fe", text: C.purp,  accent: C.purp },
  blue:   { bg: C.bluB,  border: C.bluBdr,  text: C.blue,  accent: C.blue },
  rose:   { bg: C.redB,  border: C.redBdr,  text: C.red,   accent: C.red },
  slate:  { bg: "#f1f5f9", border: "#e2e8f0", text: C.txtM,  accent: C.txtM },
};

function Card({ children, style }) {
  return (
    <div style={{ background:C.sur, border:`1px solid ${C.bdr}`, borderRadius:12, padding:24, boxShadow:"0 1px 3px rgba(0,0,0,0.05)", ...style }}>
      {children}
    </div>
  );
}

const thS = { color:C.txtS, fontSize:11, fontWeight:600, paddingBottom:8, textAlign:"left", textTransform:"uppercase", whiteSpace:"nowrap" };
const tdS = { padding:"10px 5px", borderBottom:`1px solid ${C.bdr}`, verticalAlign:"middle" };

// ─── Data (Same Content) ─────────────────────────────────────────────────────

const VALUATION_FRAMEWORKS = [
  {
    id: "arr",
    title: "Future ARR Discounted",
    range: "$1.4M – $16.2M",
    color: "teal",
    description:
      "Project Year 2–3 ARR at 8–15× SaaS multiple, then discount 70–85% for execution risk and time value.",
    rows: [
      { scenario: "Rigging-only moderate", arr: "$2.15M (Yr 2)", multiple: "10×", discount: "75%", valuation: "~$5.4M" },
      { scenario: "Rigging + expansion moderate", arr: "$6.46M (Yr 3)", multiple: "10×", discount: "75%", valuation: "~$16.2M" },
      { scenario: "Conservative rigging-only", arr: "$717K (Yr 2)", multiple: "8×", discount: "75%", valuation: "~$1.4M" },
    ],
  },
  {
    id: "berkus",
    title: "Berkus Method",
    range: "$2M – $5.5M",
    color: "amber",
    description:
      "Assigns up to $500K–$2M of value to each of five risk-reduction factors that have been addressed.",
    rows: [
      { factor: "Sound idea / validated concept", status: "✓ Confirmed", value: "$500K – $1M" },
      { factor: "Working prototype", status: "✓ Demonstrated", value: "$1M – $2M" },
      { factor: "Quality management team", status: "TBD", value: "$0 – $1M" },
      { factor: "Strategic relationships / LOIs", status: "✓ In hand", value: "$500K – $1.5M" },
      { factor: "Sales / product rollout", status: "Not yet", value: "$0" },
    ],
  },
  {
    id: "vc",
    title: "VC Ownership Back-Calc",
    range: "$2M – $4.25M",
    color: "violet",
    description:
      "Seed investors target 15–25% ownership. Working backward from a target raise amount produces implied pre-money valuation.",
    rows: [
      { raise: "$500K", ownership: "20%", preMoney: "$2.0M", postMoney: "$2.5M" },
      { raise: "$500K", ownership: "15%", preMoney: "$2.83M", postMoney: "$3.33M" },
      { raise: "$750K", ownership: "20%", preMoney: "$3.0M", postMoney: "$3.75M" },
      { raise: "$750K", ownership: "15%", preMoney: "$4.25M", postMoney: "$5.0M" },
      { raise: "$1M", ownership: "20%", preMoney: "$4.0M", postMoney: "$5.0M" },
    ],
  },
];

const NEEDLE_MOVERS = [
  { rank: 1, action: "Convert one LOI to paying customer", impact: "Adds $1M–$2M to valuation overnight — changes narrative from pre-revenue to early revenue.", color: "teal" },
  { rank: 2, action: "Named-brand rigging company pilot", impact: "Maxim, ALL Erection, or Barnhart signing even a pilot = verifiable, Googleable proof of value.", color: "teal" },
  { rank: 3, action: "Quantify LOIs in committed ARR", impact: "Shifts investors from risk-adjustment frameworks to revenue multiples — a dramatically higher number.", color: "amber" },
  { rank: 4, action: "Document founder industry credentials", impact: "Team quality adds $500K–$2M at pre-revenue stage. Any rigging/construction background is gold.", color: "amber" },
  { rank: 5, action: "Complete QuickBooks integration", impact: "Removes the #1 objection from office managers in every demo. A non-negotiable for closing sales.", color: "slate" },
  { rank: 6, action: "File provisional patent on unique features", impact: "Patent-pending on margin slider + rate overrides adds IP value and signals seriousness to investors.", color: "slate" },
];

const VALUATION_TRAJECTORY = [
  { stage: "NOW", label: "Prototype + LOIs", arr: "$0", method: "Risk-adjusted", valuation: "$3M – $5M", note: "Current raise window", color: "teal" },
  { stage: "YR 1", label: "5–10 paying customers", arr: "$180K – $360K", method: "8–12× ARR", valuation: "$5M – $8M", note: "Post mobile + QB launch", color: "amber" },
  { stage: "YR 2", label: "20–40 customers", arr: "$720K – $1.4M", method: "10–15× ARR", valuation: "$10M – $21M", note: "Series A territory", color: "blue" },
  { stage: "YR 3", label: "Phase 2 live (millwright)", arr: "$4M – $6.5M", method: "10–15× ARR", valuation: "$40M – $98M", note: "Expansion ARR kicks in", color: "violet" },
  { stage: "YR 5", label: "Phase 3 launched", arr: "$35M – $108M", method: "8–12× ARR", valuation: "$280M – $1.3B", note: "Full specialty market", color: "rose" },
];

const EQUITY_STRUCTURE = [
  { role: "Founder / CEO", person: "You", equity: 51, color: "#b86b0a", description: "Majority control — cannot be outvoted even if both 20% holders combine (40% total vs your 51%)." },
  { role: "CTO / IT Lead", person: "IT Person", equity: 20, color: "#16a34a", description: "Technical co-founder owning codebase, architecture, and engineering roadmap." },
  { role: "CMO / Head of Growth", person: "Marketing Person", equity: 20, color: "#7c3aed", description: "Go-to-market lead owning customer acquisition, positioning, and revenue growth." },
  { role: "Advisor / Individual A", person: "Individual A", equity: 3, color: "#2563eb", description: "Advisor, industry connector, or key early hire. Market rate for seed-stage advisors." },
  { role: "Advisor / Individual B", person: "Individual B", equity: 3, color: "#ea580c", description: "Advisor, industry connector, or key early hire. Market rate for seed-stage advisors." },
  { role: "Advisor / Individual C", person: "Individual C", equity: 3, color: "#0d9488", description: "Advisor, industry connector, or key early hire. Market rate for seed-stage advisors." },
];

const SUGGESTED_STRUCTURE = [
  { role: "Founder / CEO", equity: 51, color: "#b86b0a" },
  { role: "CTO / IT Lead", equity: 20, color: "#16a34a" },
  { role: "CMO / Growth Lead", equity: 20, color: "#7c3aed" },
  { role: "Advisor A", equity: 1, color: "#2563eb" },
  { role: "Advisor B", equity: 1, color: "#ea580c" },
  { role: "Advisor C", equity: 1, color: "#0d9488" },
  { role: "Employee ESOP", equity: 6, color: "#4b5563" },
];

const FOUNDING_ROLES = [
  { title: "CEO / Founder", icon: "👤", essential: true, description: "Vision, fundraising, customer relationships, strategy. Domain expertise in crane/rigging is a major asset.", you: true },
  { title: "CTO / Technical Lead", icon: "💻", essential: true, description: "Owns codebase, architecture, engineering roadmap. Builds and scales the platform.", you: false },
  { title: "CMO / Go-to-Market Lead", icon: "📣", essential: true, description: "Customer acquisition, positioning, revenue growth. The 'hustler' in the founding trio.", you: false },
  { title: "Head of Success", icon: "🤝", essential: false, description: "Retention is the lifeblood of SaaS. Losing customers costs more than acquiring new ones.", you: false },
  { title: "Head of Finance / CFO", icon: "📊", essential: false, description: "Once revenue flows, financial controls and reporting become critical for investor confidence.", you: false },
  { title: "Industry Advisor", icon: "🏗️", essential: false, description: "A recognized SC&RA or ACT100 name on your advisory board signals market credibility to investors.", you: false },
];

// ─── Sub-components ───────────────────────────────────────────────────────────

function SectionHeader({ label, title }) {
  return (
    <div style={{ marginBottom: 28 }}>
      <p style={{ fontSize: 11, fontWeight: 800, color: C.acc, textTransform: "uppercase", letterSpacing: 1.5, marginBottom: 4 }}>{label}</p>
      <h2 style={{ fontSize: 24, fontWeight: 800, color: C.txt, margin: 0 }}>{title}</h2>
      <div style={{ marginTop: 8, height: 3, width: 44, background: C.acc, borderRadius: 2 }} />
    </div>
  );
}

function StatCard({ label, value, sub, color = "teal" }) {
  const c = colorMap[color];
  return (
    <Card style={{ padding: 20, borderTop: `4px solid ${c.accent}` }}>
      <p style={{ fontSize: 12, color: C.txtS, marginBottom: 4 }}>{label}</p>
      <p style={{ fontSize: 24, fontWeight: 800, color: C.txt }}>{value}</p>
      {sub && <p style={{ fontSize: 11, color: C.txtM, marginTop: 4 }}>{sub}</p>}
    </Card>
  );
}

function Tab({ label, active, onClick }) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: "10px 18px",
        fontSize: 13,
        fontWeight: 700,
        borderRadius: 8,
        border: "none",
        cursor: "pointer",
        transition: "all .2s",
        background: active ? C.acc : "transparent",
        color: active ? "#fff" : C.txtM,
        boxShadow: active ? "0 4px 12px rgba(184, 107, 10, 0.2)" : "none",
      }}
    >
      {label}
    </button>
  );
}

// ─── Sections ────────────────────────────────────────────────────────────────

function ValuationOverview() {
  return (
    <div>
      <SectionHeader label="Investor Valuation" title="What Is RigPro Worth?" />

      <div style={{ background: C.accL, border: `1.5px solid ${C.accB}`, borderRadius: 12, padding: 24, marginBottom: 24, display: "flex", flexWrap: "wrap", gap: 24 }}>
        <div style={{ flex: 1, minWidth: 200 }}>
          <p style={{ fontSize: 13, color: C.txtS, marginBottom: 4 }}>Current stage</p>
          <p style={{ fontSize: 16, fontWeight: 700, color: C.txt }}>Working prototype · LOIs in hand · Pre-revenue</p>
        </div>
        <div style={{ minWidth: 280 }}>
          <p style={{ fontSize: 11, color: C.txtS, textTransform: "uppercase", letterSpacing: 1, marginBottom: 4 }}>Recommended pre-money valuation</p>
          <p style={{ fontSize: 42, fontWeight: 800, color: C.acc, margin: 0 }}>$3M – $5M</p>
          <p style={{ fontSize: 14, color: C.ora, fontWeight: 600, marginTop: 6 }}>Seed raise: $500K–$750K at 15–20% dilution</p>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 20, marginBottom: 28 }}>
        {VALUATION_FRAMEWORKS.map((f) => {
          const c = colorMap[f.color];
          return (
            <Card key={f.id} style={{ borderBottom: `4px solid ${c.accent}` }}>
              <div style={{ fontSize: 10, fontWeight: 800, textTransform: "uppercase", color: c.text, marginBottom: 8 }}>Framework</div>
              <h3 style={{ fontSize: 18, fontWeight: 800, color: C.txt, marginBottom: 4 }}>{f.title}</h3>
              <p style={{ fontSize: 24, fontWeight: 800, color: c.accent, marginBottom: 12 }}>{f.range}</p>
              <p style={{ fontSize: 13, color: C.txtM, lineHeight: 1.5 }}>{f.description}</p>
            </Card>
          );
        })}
      </div>

      <div style={{ borderRadius: 12, border: `1px solid ${C.bdr}`, overflow: "hidden" }}>
        <div style={{ background: C.bg, padding: "12px 20px", borderBottom: `1px solid ${C.bdr}` }}>
          <p style={{ fontSize: 13, fontWeight: 700, color: C.txt }}>Valuation Range by Investor Type</p>
        </div>
        <div style={{ background: "#fff" }}>
          {[
            { type: "Angel / friends & family", pre: "$1.5M – $2.5M", raise: "$100K – $300K", note: "Common for prototype stage" },
            { type: "Seed round (with LOIs)", pre: "$3M – $5M", raise: "$500K – $750K", note: "Most likely range ✓", highlight: true },
            { type: "Seed + industry credibility", pre: "$5M – $8M", raise: "$750K – $1.5M", note: "If LOIs from named companies" },
            { type: "Strategic investor (SC&RA)", pre: "$4M – $10M", raise: "Variable", note: "Industry insider validates faster" },
          ].map((row, i) => (
            <div key={i} style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 12, padding: "14px 20px", borderBottom: i < 3 ? `1px solid ${C.bdr}` : "none", background: row.highlight ? C.accL : "transparent" }}>
              <span style={{ fontSize: 13, fontWeight: row.highlight ? 700 : 500, color: row.highlight ? C.acc : C.txtM }}>{row.type}</span>
              <span style={{ fontSize: 14, fontWeight: 800, color: C.txt }}>{row.pre}</span>
              <span style={{ fontSize: 13, color: C.txtS }}>{row.raise}</span>
              <span style={{ fontSize: 12, color: row.highlight ? C.ora : C.txtS, fontWeight: 500 }}>{row.note}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function FrameworkDetails() {
  const [active, setActive] = useState("arr");
  const fw = VALUATION_FRAMEWORKS.find((f) => f.id === active);
  const c = colorMap[fw.color];

  return (
    <div>
      <SectionHeader label="Methodology" title="Valuation Frameworks in Detail" />
      <div style={{ display: "flex", gap: 8, marginBottom: 24, background: "#eaedf1", padding: 4, borderRadius: 10, alignSelf:"flex-start", width:"fit-content" }}>
        {VALUATION_FRAMEWORKS.map((f) => (
          <Tab key={f.id} label={f.title} active={active === f.id} onClick={() => setActive(f.id)} />
        ))}
      </div>

      <Card style={{ borderLeft: `6px solid ${c.accent}` }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
          <h3 style={{ fontSize: 20, fontWeight: 800, color: c.accent }}>{fw.title}</h3>
          <span style={{ fontSize: 24, fontWeight: 800, color: C.txt }}>{fw.range}</span>
        </div>
        <p style={{ fontSize: 14, color: C.txtM, lineHeight: 1.6, marginBottom: 24 }}>{fw.description}</p>

        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ borderBottom: `1px solid ${C.bdrM}` }}>
                {active === "arr" && <>
                  <th style={thS}>Scenario</th>
                  <th style={thS}>Projected ARR</th>
                  <th style={thS}>Multiple</th>
                  <th style={thS}>Risk Discount</th>
                  <th style={{ ...thS, textAlign: "right" }}>Implied Valuation</th>
                </>}
                {active === "berkus" && <>
                  <th style={thS}>Factor</th>
                  <th style={thS}>Status</th>
                  <th style={{ ...thS, textAlign: "right" }}>Value Contribution</th>
                </>}
                {active === "vc" && <>
                  <th style={thS}>Raise Amount</th>
                  <th style={thS}>Ownership</th>
                  <th style={thS}>Pre-Money</th>
                  <th style={{ ...thS, textAlign: "right" }}>Post-Money</th>
                </>}
              </tr>
            </thead>
            <tbody>
              {active === "arr" && fw.rows.map((r, i) => (
                <tr key={i}>
                  <td style={{ ...tdS, fontWeight: 700 }}>{r.scenario}</td>
                  <td style={tdS}>{r.arr}</td>
                  <td style={tdS}>{r.multiple}</td>
                  <td style={tdS}>{r.discount}</td>
                  <td style={{ ...tdS, textAlign: "right", fontWeight: 800, color: C.acc }}>{r.valuation}</td>
                </tr>
              ))}
              {active === "berkus" && fw.rows.map((r, i) => (
                <tr key={i}>
                  <td style={tdS}>{r.factor}</td>
                  <td style={tdS}>
                    <span style={{ display:"inline-block", padding:"3px 10px", borderRadius:20, fontSize:11, background: r.status.includes("✓") ? C.grnB : C.bg, color: r.status.includes("✓") ? C.grn : C.txtS, fontWeight:700 }}>{r.status}</span>
                  </td>
                  <td style={{ ...tdS, textAlign: "right", fontWeight: 700, color: C.ora }}>{r.value}</td>
                </tr>
              ))}
              {active === "vc" && fw.rows.map((r, i) => (
                <tr key={i}>
                  <td style={tdS}>{r.raise}</td>
                  <td style={tdS}>{r.ownership}</td>
                  <td style={{ ...tdS, fontWeight: 800 }}>{r.preMoney}</td>
                  <td style={{ ...tdS, textAlign: "right", color: C.txtS }}>{r.postMoney}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

function NeedleMover() {
  return (
    <div>
      <SectionHeader label="Action Plan" title="What Would Move the Needle Most" />
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(380px, 1fr))", gap: 16 }}>
        {NEEDLE_MOVERS.map((n) => {
          const c = colorMap[n.color];
          return (
            <div key={n.rank} style={{ display: "flex", gap: 16, background: "#fff", border: `1px solid ${C.bdr}`, borderRadius: 12, padding: 18 }}>
              <div style={{ flexShrink: 0, width: 32, height: 32, borderRadius: "50%", background: c.accent, color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, fontWeight: 800 }}>
                {n.rank}
              </div>
              <div>
                <p style={{ fontSize: 15, fontWeight: 700, color: C.txt, marginBottom: 4 }}>{n.action}</p>
                <p style={{ fontSize: 13, color: C.txtM, lineHeight: 1.5 }}>{n.impact}</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function ValuationTrajectory() {
  return (
    <div>
      <SectionHeader label="5-Year Outlook" title="Projected Company Value — Now Through Year 5" />
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12, marginBottom: 24 }}>
        {VALUATION_TRAJECTORY.map((m) => {
          const c = colorMap[m.color];
          return (
            <div key={m.stage} style={{ borderRadius: 12, border: `1.5px solid ${c.border}`, overflow: "hidden", display: "flex", flexDirection: "column" }}>
              <div style={{ background: c.accent, color: "#fff", padding: "8px", textAlign: "center", fontSize: 12, fontWeight: 800 }}>{m.stage}</div>
              <div style={{ flex: 1, padding: 16, background: "#fff" }}>
                <p style={{ fontSize: 14, fontWeight: 700, color: C.txt, marginBottom: 12, lineHeight: 1.3 }}>{m.label}</p>
                <div style={{ marginBottom: 10 }}>
                  <p style={{ fontSize: 10, color: C.txtS, textTransform: "uppercase" }}>ARR</p>
                  <p style={{ fontSize: 13, fontWeight: 700, color: C.txt }}>{m.arr}</p>
                </div>
                <div style={{ borderTop: `1px solid ${C.bg}`, paddingTop: 12, marginTop: "auto" }}>
                  <p style={{ fontSize: 10, color: C.txtS, textTransform: "uppercase" }}>Est. Valuation</p>
                  <p style={{ fontSize: 16, fontWeight: 800, color: c.text }}>{m.valuation}</p>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div style={{ background: "#fffbeb", border: "1px solid #fde68a", borderRadius: 12, padding: 20, display: "flex", gap: 16 }}>
        <span style={{ fontSize: 24 }}>⚡</span>
        <div>
          <p style={{ color: "#92400e", fontWeight: 700, fontSize: 15, marginBottom: 4 }}>Key Inflection Point</p>
          <p style={{ fontSize: 14, color: "#92400e", lineHeight: 1.5 }}>
            Reaching <span style={{ fontWeight: 800 }}>~$500K ARR</span> (~12 paying customers) shifts valuation methodology from
            risk-adjusted frameworks to revenue multiples — the numbers become dramatically more favorable and
            Series A investors enter the conversation.
          </p>
        </div>
      </div>
    </div>
  );
}

function EquityStructure() {
  const [hovered, setHovered] = useState(null);
  const total = EQUITY_STRUCTURE.reduce((s, e) => s + e.equity, 0);

  return (
    <div>
      <SectionHeader label="Cap Table" title="Proposed Equity Structure" />

      <div style={{ display: "flex", flexWrap: "wrap", gap: 40, marginBottom: 32 }}>
        <div style={{ flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div style={{ position: "relative", width: 220, height: 220 }}>
            <svg viewBox="0 0 100 100" style={{ width: "100%", height: "100%", transform: "rotate(-90deg)" }}>
              {(() => {
                let cumulative = 0;
                return EQUITY_STRUCTURE.map((e, i) => {
                  const pct = e.equity / 100;
                  const dash = pct * 251.2;
                  const offset = cumulative * 251.2;
                  cumulative += pct;
                  const isHov = hovered === i;
                  return (
                    <circle
                      key={i} cx="50" cy="50" r="40" fill="none"
                      stroke={e.color} strokeWidth={isHov ? 18 : 14}
                      strokeDasharray={`${dash} ${251.2 - dash}`}
                      strokeDashoffset={-offset}
                      style={{ transition: "all .2s", cursor: "pointer", opacity: hovered === null || isHov ? 1 : 0.4 }}
                      onMouseEnter={() => setHovered(i)}
                      onMouseLeave={() => setHovered(null)}
                    />
                  );
                });
              })()}
            </svg>
            <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", pointerEvents: "none" }}>
              {hovered !== null ? (
                <>
                  <p style={{ fontSize: 32, fontWeight: 800, color: C.txt }}>{EQUITY_STRUCTURE[hovered].equity}%</p>
                  <p style={{ fontSize: 11, color: C.txtS, textAlign: "center", width: 100 }}>{EQUITY_STRUCTURE[hovered].role}</p>
                </>
              ) : (
                <>
                  <p style={{ fontSize: 32, fontWeight: 800, color: C.acc }}>51%</p>
                  <p style={{ fontSize: 12, color: C.txtS }}>Founder Retained</p>
                </>
              )}
            </div>
          </div>
        </div>

        <div style={{ flex: 1, minWidth: 320, display: "flex", flexDirection: "column", gap: 10 }}>
          {EQUITY_STRUCTURE.map((e, i) => (
            <div
              key={i}
              onMouseEnter={() => setHovered(i)}
              onMouseLeave={() => setHovered(null)}
              style={{
                display: "flex", alignItems: "center", gap: 12, padding: 12, borderRadius: 10,
                background: hovered === i ? C.bg : "transparent",
                border: `1px solid ${hovered === i ? C.bdr : "transparent"}`,
                transition: "all .2s"
              }}
            >
              <div style={{ width: 12, height: 12, borderRadius: "50%", background: e.color }} />
              <div style={{ flex: 1 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ fontSize: 14, fontWeight: 700, color: C.txt }}>{e.role}</span>
                  {e.role.includes("Founder") && <span style={{ fontSize: 9, background: C.accL, color: C.acc, border: `1px solid ${C.accB}`, padding: "1px 5px", borderRadius: 10, fontWeight: 800 }}>YOU</span>}
                </div>
                <p style={{ fontSize: 11, color: C.txtS }}>{e.description}</p>
              </div>
              <div style={{ textAlign: "right" }}>
                <p style={{ fontSize: 16, fontWeight: 800, color: C.txt }}>{e.equity}%</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 16 }}>
        {[
          { icon: "🔒", title: "Vesting Schedule (Critical)", body: "All equity grants should carry a 4-year vest with 1-year cliff. Avoids 'hit and run' equity loss." },
          { icon: "⚖️", title: "Entity Structure", body: "Delaware C-Corp is standard for VC-backed SaaS. Essential for managing the cap table properly." },
          { icon: "💰", title: "83(b) Election", body: "Crucial for founders to file within 30 days of equity grant to avoid future tax liabilities." },
          { icon: "📋", title: "ESOP Dilution", body: " factor in a 10–15% option pool for future hires before raising. It signals planning to VCs." },
        ].map((tip, i) => (
          <div key={i} style={{ padding: 16, background: "#fff", border: `1px solid ${C.bdr}`, borderRadius: 12 }}>
            <p style={{ fontSize: 14, fontWeight: 700, color: C.txt, marginBottom: 4 }}>{tip.icon} {tip.title}</p>
            <p style={{ fontSize: 12, color: C.txtM, lineHeight: 1.5 }}>{tip.body}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function ManagementTeam() {
  return (
    <div>
      <SectionHeader label="Founding Team" title="Startup Management & Roles" />
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 16, marginBottom: 32 }}>
        {FOUNDING_ROLES.map((r, i) => (
          <Card key={i} style={{ borderBottom: r.essential ? `4px solid ${C.acc}` : `1px solid ${C.bdr}` }}>
            <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
              <span style={{ fontSize: 28 }}>{r.icon}</span>
              <div>
                <p style={{ fontSize: 15, fontWeight: 700, color: C.txt, marginBottom: 2 }}>{r.title}</p>
                <div style={{ display: "flex", gap: 4, marginBottom: 8 }}>
                  {r.essential && <span style={{ fontSize: 10, background: C.accL, color: C.acc, border: `1px solid ${C.accB}`, padding: "1px 6px", borderRadius: 4, fontWeight: 700 }}>ESSENTIAL</span>}
                  {r.you && <span style={{ fontSize: 10, background: "#fffbeb", color: "#b45309", border: "1px solid #fde68a", padding: "1px 6px", borderRadius: 4, fontWeight: 700 }}>YOU</span>}
                </div>
                <p style={{ fontSize: 12, color: C.txtM, lineHeight: 1.5 }}>{r.description}</p>
              </div>
            </div>
          </Card>
        ))}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16, textAlign: "center" }}>
        {[
          { label: "The Builder", sub: "CTO / Hacker", desc: "Builds the product", color: "teal" },
          { label: "The Seller", sub: "CEO / Hustler", desc: "Sells the vision", color: "amber" },
          { label: "The Designer", sub: "CPO / Maker", desc: "Shapes experience", color: "violet" },
        ].map((t, i) => (
          <div key={i} style={{ background: colorMap[t.color].bg, border: `1.5px solid ${colorMap[t.color].border}`, borderRadius: 12, padding: 16 }}>
            <p style={{ fontSize: 16, fontWeight: 800, color: colorMap[t.color].accent }}>{t.label}</p>
            <p style={{ fontSize: 11, fontWeight: 600, color: C.txtM }}>{t.sub}</p>
            <p style={{ fontSize: 11, color: C.txtS, marginTop: 4 }}>{t.desc}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function RigPro3InvestorDashboard() {
  const [activeTab, setActiveTab] = useState("overview");

  const TABS = [
    { id: "overview",    label: "Overview" },
    { id: "frameworks",  label: "Frameworks" },
    { id: "needle",      label: "Action Plan" },
    { id: "trajectory",  label: "Trajectory" },
    { id: "equity",      label: "Cap Table" },
    { id: "team",        label: "Management" },
  ];

  return (
    <div style={{ minHeight: "100vh", background: C.bg, color: C.txt, paddingBottom: 60, fontFamily: "'Segoe UI', Roboto, Helvetica, Arial, sans-serif" }}>
      {/* Top Bar */}
      <div style={{ background: "#fff", borderBottom: `1px solid ${C.bdr}`, position: "sticky", top: 0, zIndex: 10, padding: "0 24px" }}>
        <div style={{ maxWidth: 1100, margin: "0 auto", height: 72, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <div style={{ width: 44, height: 44, background: C.acc, borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 4px 12px rgba(184, 107, 10, 0.3)" }}>
              <span style={{ color: "#fff", fontWeight: 800, fontSize: 18 }}>R3</span>
            </div>
            <div>
              <p style={{ fontSize: 18, fontWeight: 800, color: C.txt, margin: 0, lineHeight: 1.1 }}>RigPro Investor Analysis</p>
              <p style={{ fontSize: 12, color: C.txtS, margin: 0 }}>Strategic Valuation & Equity Modeling</p>
            </div>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <span style={{ fontSize: 11, background: C.accL, color: C.acc, border: `1px solid ${C.accB}`, padding: "4px 10px", borderRadius: 20, fontWeight: 800 }}>PROTOTYPE</span>
            <span style={{ fontSize: 11, background: C.grnB, color: C.grn, border: `1px solid ${C.grnBdr}`, padding: "4px 10px", borderRadius: 20, fontWeight: 800 }}>LOIs ACTIVE</span>
          </div>
        </div>
      </div>

      <div style={{ maxWidth: 1100, margin: "32px auto", padding: "0 24px" }}>
        {/* Main Stats */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 16, marginBottom: 32 }}>
          <StatCard label="Recommended Valuation" value="$3M – $5M" sub="Pre-money (Risk adjusted)" color="teal" />
          <StatCard label="Target Seed Raise" value="$500K – $750K" sub="15–20% Equity Stake" color="amber" />
          <StatCard label="Exit Potential (Yr 5)" value="$280M – $1.3B" sub="Full Platform Scenario" color="violet" />
          <StatCard label="Addressable Market" value="$900M+" sub="Annual Serviceable Market" color="blue" />
        </div>

        {/* Navigation */}
        <div style={{ background: "#eaedf1", padding: 6, borderRadius: 12, display: "flex", flexWrap: "wrap", gap: 4, marginBottom: 32 }}>
          {TABS.map((t) => (
            <Tab key={t.id} label={t.label} active={activeTab === t.id} onClick={() => setActiveTab(t.id)} />
          ))}
        </div>

        {/* Content */}
        <div style={{ minHeight: 400 }}>
          {activeTab === "overview"   && <ValuationOverview />}
          {activeTab === "frameworks" && <FrameworkDetails />}
          {activeTab === "needle"     && <NeedleMover />}
          {activeTab === "trajectory" && <ValuationTrajectory />}
          {activeTab === "equity"     && <EquityStructure />}
          {activeTab === "team"       && <ManagementTeam />}
        </div>

        {/* Disclaimer */}
        <div style={{ marginTop: 60, padding: 24, background: "#fff", border: `1px solid ${C.bdr}`, borderRadius: 12 }}>
          <p style={{ color: C.ora, fontWeight: 800, fontSize: 13, textTransform: "uppercase", letterSpacing: 1, marginBottom: 12 }}>⚠️ Legal & Financial Notice</p>
          <p style={{ fontSize: 13, color: C.txtM, lineHeight: 1.6, marginBottom: 12 }}>
            This document is for discussion purposes only and does not constitute financial advice, legal advice, or a
            solicitation for investment. All valuations are estimates based on market data, comparable
            transactions, and standard early-stage frameworks. Subjectivity is high; outcomes depend on execution, 
            market conditions, and negotiation dynamics.
          </p>
          <p style={{ fontSize: 11, color: C.txtS, lineHeight: 1.5 }}>
            Consult a startup attorney for cap table structuring and an 83(b) election. Engage a CPA familiar 
            with SaaS models before issuing equity to advisors or employees.
          </p>
        </div>
      </div>
    </div>
  );
}
