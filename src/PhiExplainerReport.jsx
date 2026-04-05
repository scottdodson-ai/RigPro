import React from 'react';
import { calculatePHI } from './phiEngine';

const C = { bg: "#f8fafc", sur: "#ffffff", txt: "#1e293b", txtM: "#475569", txtS: "#94a3b8", bdr: "#e2e8f0", acc: "#0ea5e9", red: "#dc2626", grn: "#16a34a", amb: "#d97706" };

export default function PhiExplainerReport({ jobs, reqs, phiConfig }) {
  const phi = calculatePHI(jobs, reqs, phiConfig);

  return (
    <div style={{ padding: "40px", maxWidth: "900px", margin: "0 auto", background: C.sur, border: `1px solid ${C.bdr}`, borderRadius: "12px", fontFamily: "system-ui, -apple-system, sans-serif", color: C.txt }}>
      <h1 style={{ fontSize: "36px", margin: "0 0 10px 0", color: "#111827", borderBottom: `2px solid ${C.bdr}`, paddingBottom: "20px", display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
        Pipeline Health Index Explainer
        <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end" }}>
          <span style={{ fontSize: "14px", color: C.txtM, fontWeight: "normal", marginBottom: "4px" }}>Current Blend Ratio: {phi.ratios.company}% Company / {phi.ratios.industry}% Industry</span>
          <span style={{ fontSize: "42px", fontWeight: "800", color: phi.color, lineHeight: "1" }}>{phi.score}</span>
        </div>
      </h1>

      {/* Section 1: What is the PHI? */}
      <section style={{ marginTop: "30px" }}>
        <h2 style={{ fontSize: "20px", color: C.acc, marginBottom: "16px" }}>1. What is the PHI?</h2>
        <p style={{ lineHeight: "1.6", color: C.txtM }}>The Pipeline Health Index (PHI) is a composite score from 0 to 100 that summarizes the overall health of the sales pipeline. Revenue reports show the past, but the PHI acts as a leading indicator, signaling near-future outcomes across five unified metrics.</p>
        <ul style={{ lineHeight: "1.6", color: C.txtM, marginTop: "10px", paddingLeft: "20px" }}>
          <li><strong>Leading indicator:</strong> Shows present state to intercept revenue problems 30-90 days out.</li>
          <li><strong>Five signals unified:</strong> Combines quote aging, win rate, volume, margin, and response speed into one number.</li>
          <li><strong>Dual benchmark:</strong> Evaluated against your own historical baseline and industry peers.</li>
          <li><strong>Shared language:</strong> Aligns management and ownership to a single actionable number.</li>
        </ul>
      </section>

      {/* Section 2: The five components */}
      <section style={{ marginTop: "30px" }}>
        <h2 style={{ fontSize: "20px", color: C.acc, marginBottom: "16px" }}>2. The Five Scoring Components</h2>
        
        <div style={{ marginBottom: "20px" }}>
          <h3 style={{ fontSize: "16px", margin: "0 0 4px 0", color: "#111827" }}>Quote Aging (Current: {(phi.actuals.stale_pct * 100).toFixed(1)}% Stale)</h3>
          <p style={{ fontSize: "14px", color: C.txtM, margin: 0, lineHeight: "1.5" }}>Decaying quotes bloat pipeline value safely masking shortfalls. <em>Score: Drops linearly to 0 if stale estimates hit 40%.</em></p>
        </div>

        <div style={{ marginBottom: "20px" }}>
          <h3 style={{ fontSize: "16px", margin: "0 0 4px 0", color: "#111827" }}>Win Rate (Current: {phi.actuals.win_rate.toFixed(1)}%)</h3>
          <p style={{ fontSize: "14px", color: C.txtM, margin: 0, lineHeight: "1.5" }}>Closing ratio of sent proposals. <em>Score: ±5pts for every 5% deviation from baseline.</em></p>
        </div>

        <div style={{ marginBottom: "20px" }}>
          <h3 style={{ fontSize: "16px", margin: "0 0 4px 0", color: "#111827" }}>Incoming Volume (Current: {phi.actuals.vol} RFQs)</h3>
          <p style={{ fontSize: "14px", color: C.txtM, margin: 0, lineHeight: "1.5" }}>Top-of-funnel activity feeding the team. <em>Score: Full points if meeting baseline, decays underneath.</em></p>
        </div>

        <div style={{ marginBottom: "20px" }}>
          <h3 style={{ fontSize: "16px", margin: "0 0 4px 0", color: "#111827" }}>Margin Health (Current: {phi.actuals.margin.toFixed(1)}%)</h3>
          <p style={{ fontSize: "14px", color: C.txtM, margin: 0, lineHeight: "1.5" }}>Maintains quality of sales over sheer volume. <em>Score: ±1.5pts for every percent deviation from norm.</em></p>
        </div>

        <div style={{ marginBottom: "20px" }}>
          <h3 style={{ fontSize: "16px", margin: "0 0 4px 0", color: "#111827" }}>Response Speed (Current: {phi.actuals.speed} days)</h3>
          <p style={{ fontSize: "14px", color: C.txtM, margin: 0, lineHeight: "1.5" }}>Speed of quoting drives trust and win rate. <em>Score: Max points ≤ 2 days, 0 points ≥ 7 days.</em></p>
        </div>
      </section>

      {/* Section 3: Score bands */}
      <section style={{ marginTop: "30px" }}>
        <h2 style={{ fontSize: "20px", color: C.acc, marginBottom: "16px" }}>3. Score Bands</h2>
        <table style={{ width: "100%", borderCollapse: "collapse", marginTop: "10px", fontSize: "14px" }}>
          <thead>
            <tr style={{ background: C.bg, borderBottom: `2px solid ${C.bdr}` }}>
              <th style={{ padding: "12px", textAlign: "left" }}>Score</th>
              <th style={{ padding: "12px", textAlign: "left" }}>Band</th>
              <th style={{ padding: "12px", textAlign: "left" }}>What it means</th>
              <th style={{ padding: "12px", textAlign: "left" }}>Action</th>
            </tr>
          </thead>
          <tbody>
            <tr style={{ borderBottom: `1px solid ${C.bdr}` }}>
              <td style={{ padding: "12px", fontWeight: "bold" }}>0 – 39</td>
              <td style={{ padding: "12px", color: C.red, fontWeight: "bold" }}>Critical</td>
              <td style={{ padding: "12px", color: C.txtM }}>Shortfall likely within 30-60 days.</td>
              <td style={{ padding: "12px", color: C.txtM }}>Emergency pipeline review this week.</td>
            </tr>
            <tr style={{ borderBottom: `1px solid ${C.bdr}` }}>
              <td style={{ padding: "12px", fontWeight: "bold" }}>40 – 59</td>
              <td style={{ padding: "12px", color: C.amb, fontWeight: "bold" }}>At Risk</td>
              <td style={{ padding: "12px", color: C.txtM }}>Functional but vulnerable. Slide becomes Critical.</td>
              <td style={{ padding: "12px", color: C.txtM }}>Weekly check-in on flagged items.</td>
            </tr>
            <tr style={{ borderBottom: `1px solid ${C.bdr}` }}>
              <td style={{ padding: "12px", fontWeight: "bold" }}>60 – 74</td>
              <td style={{ padding: "12px", color: C.amb, fontWeight: "bold" }}>Fair</td>
              <td style={{ padding: "12px", color: C.txtM }}>Operating adequately but below standard.</td>
              <td style={{ padding: "12px", color: C.txtM }}>Monitor weekly for trends.</td>
            </tr>
            <tr style={{ borderBottom: `1px solid ${C.bdr}` }}>
              <td style={{ padding: "12px", fontWeight: "bold" }}>75 – 89</td>
              <td style={{ padding: "12px", color: C.grn, fontWeight: "bold" }}>Good</td>
              <td style={{ padding: "12px", color: C.txtM }}>Pipeline healthy. Position strong.</td>
              <td style={{ padding: "12px", color: C.txtM }}>Maintain current practices.</td>
            </tr>
            <tr style={{ borderBottom: `1px solid ${C.bdr}` }}>
              <td style={{ padding: "12px", fontWeight: "bold" }}>90 – 100</td>
              <td style={{ padding: "12px", color: C.grn, fontWeight: "bold" }}>Excellent</td>
              <td style={{ padding: "12px", color: C.txtM }}>Outperforming on all fronts.</td>
              <td style={{ padding: "12px", color: C.txtM }}>Celebrate and document workflow.</td>
            </tr>
          </tbody>
        </table>
      </section>

      {/* Section 4: How the blended score works */}
      <section style={{ marginTop: "30px" }}>
        <h2 style={{ fontSize: "20px", color: C.acc, marginBottom: "16px" }}>4. How the Blended Score Works</h2>
        <p style={{ lineHeight: "1.6", color: C.txtM }}>The system calculates two separate PHIs. The <b>Company Score</b> ({phi.phiCompany}) measures performance against our own baselines. The <b>Industry Score</b> ({phi.phiIndustry}) measures us against external benchmarks. We then apply our specific Blend Ratio to produce the final headline score.</p>
      </section>

      {/* Section 5: How to improve your score */}
      <section style={{ marginTop: "30px" }}>
        <h2 style={{ fontSize: "20px", color: C.acc, marginBottom: "16px" }}>5. How to Improve Your Score</h2>
        <ul style={{ lineHeight: "1.6", color: C.txtM, paddingLeft: "20px" }}>
          <li><strong>Quote Aging:</strong> Move the oldest estimates to the Follow-Up Queue and contact them this week. Mark dead if lost.</li>
          <li><strong>Win Rate:</strong> Implement structured follow-up sequences. Disqualify bad fits earlier.</li>
          <li><strong>Incoming Volume:</strong> Prompt sales team to hit target account outreach quotas.</li>
          <li><strong>Margin:</strong> Stop offering unapproved flat discounts. Lean into value-selling over price-matching.</li>
          <li><strong>Response Speed:</strong> Triage RFQs immediately. Delegate complex quotes to free up minor job processing.</li>
        </ul>
      </section>
    </div>
  );
}
