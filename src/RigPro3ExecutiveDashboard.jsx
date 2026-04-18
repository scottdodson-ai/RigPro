import React, { useState, useEffect, useMemo } from 'react';
import { calculatePHI } from './phiEngine';

const C = {
  bg: "#f8fafc", sur: "#ffffff", acc: "#0ea5e9", accL: "#bae6fd", accB: "#0284c7", txt: "#0f172a", txtM: "#334155", txtS: "#64748b",
  bdr: "#e2e8f0", red: "#ef4444", redB: "#fef2f2", redBdr: "#fca5a5", grn: "#22c55e", grnB: "#f0fdf4", grnBdr: "#86efac",
  yel: "#f59e0b", yelB: "#fffbeb", yelBdr: "#fcd34d", purp: "#8b5cf6", teal: "#14b8a6", bluB: "#eff6ff", bluBdr: "#bfdbfe", blue: "#3b82f6"
};

export default function RigPro3ExecutiveDashboard({ jobs, reqs, token }) {
  const [phiConfig, setPhiConfig] = useState(null);

  useEffect(() => {
    fetch("/api/admin/phi-config", { headers: { 'Authorization': `Bearer ${token}` } })
      .then(r => r.json())
      .then(d => { if (Object.keys(d).length > 2) setPhiConfig(d); })
      .catch(e => console.error("Load phi config err:", e));
  }, [token]);

  const stats = useMemo(() => {
    const now = new Date();
    const ninetyDaysAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
    
    let revYTD = 0, pipelineVal = 0, winCount = 0, lossCount = 0, rfqCount = 0;
    let totalMarginPct = 0, marginCount = 0, staleCount = 0, pendingQuotes = 0;
    let totalRespTimeHrs = 0, respTimeCount = 0;

    // Filter to current year
    const ytdJobs = jobs.filter(q => q.status === "Won" && (!q.date || new Date(q.date).getFullYear() === now.getFullYear()));
    revYTD = ytdJobs.reduce((sum, q) => sum + (q.total || 0), 0);

    const pending = jobs.filter(q => ["In Progress","In Review","Approved","Adjustments Needed","Submitted"].includes(q.status));
    pipelineVal = pending.reduce((sum, q) => sum + (q.total || 0), 0);
    pendingQuotes = pending.length;
    
    // Win rate rolling 90 days
    const recentJobs = jobs.filter(q => q.date && new Date(q.date) >= ninetyDaysAgo);
    recentJobs.forEach(q => {
      if (q.status === "Won") winCount++;
      if (q.status === "Lost") lossCount++;
    });

    const activeRfqs = reqs.filter(r => r.status !== "Dead" && r.status !== "Completed");
    rfqCount = activeRfqs.length;

    // Averages
    const wonJobs = jobs.filter(q => q.status === "Won");
    wonJobs.forEach(q => {
      const rev = q.total || 0;
      const cost = Math.round((q.labor||0)*0.6 + (q.equip||0)*0.7 + (q.hauling||0)*0.85 + (q.mats||0)*0.85 + (q.travel||0));
      const margin = rev - cost;
      if (rev > 0) {
        totalMarginPct += (margin / rev) * 100;
        marginCount++;
      }
    });

    // Speed
    jobs.forEach(q => {
      if (q.fromReqId) {
        const r = reqs.find(rq => rq.id === q.fromReqId);
        if (r && r.date && q.date) {
            const hrs = (new Date(q.date) - new Date(r.date)) / 3600000;
            if (hrs >= 0) {
              totalRespTimeHrs += hrs;
              respTimeCount++;
            }
        }
      }
    });

    // Stale Quotes > 14 days
    const fourteenDaysAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);
    const atRiskQuotes = [];
    pending.forEach(q => {
      if (q.date && new Date(q.date) < fourteenDaysAgo) {
        staleCount++;
        atRiskQuotes.push(q);
      }
    });
    
    // Sort recent wins >10k
    const bigWins = wonJobs.filter(q => (q.total||0) >= 10000)
       .sort((a,b) => new Date(b.date||0) - new Date(a.date||0))
       .slice(0, 5);

    atRiskQuotes.sort((a,b) => new Date(a.date||0) - new Date(b.date||0));

    const totalResolved = winCount + lossCount;
    const actualWinRate = totalResolved > 0 ? (winCount / totalResolved) * 100 : 0;
    const actualMargin = marginCount > 0 ? totalMarginPct / marginCount : 0;
    const actualSpeedDays = respTimeCount > 0 ? (totalRespTimeHrs / respTimeCount) / 24 : 0;
    const actualStalePct = pendingQuotes > 0 ? (staleCount / pendingQuotes) * 100 : 0;
    
    // Mock volume as recent req count (e.g. 30 days)
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const actualVolume = reqs.filter(r => r.date && new Date(r.date) >= thirtyDaysAgo).length;

    // Zone 1 Metrics (Spec)
    const rfqsIn = reqs.filter(r => r.date && new Date(r.date).getFullYear() === now.getFullYear()).length;
    const estimatesGiven = jobs.filter(q => q.date && new Date(q.date).getFullYear() === now.getFullYear()).length;
    const responseRate = rfqsIn > 0 ? (estimatesGiven / rfqsIn * 100) : 0;
    
    const activeCustomers = new Set(jobs.filter(q => q.date && new Date(q.date).getFullYear() === now.getFullYear()).map(q => q.client));
    const customerCount = activeCustomers.size;
    
    const wonSum = ytdJobs.reduce((sum, q) => sum + (q.total || 0), 0);
    const avgMargin = marginCount > 0 ? totalMarginPct / marginCount : 0;

    return {
      revYTD, pipelineVal, actualWinRate, actualMargin, rfqCount,
      rfqsIn, estimatesGiven, responseRate, customerCount, wonSum, avgMargin,
      phiData: {
        winRate: actualWinRate,
        volume: actualVolume,
        margin: actualMargin,
        stalePct: actualStalePct,
        speedDays: actualSpeedDays
      },
      bigWins,
      atRiskQuotes
    };
  }, [jobs, reqs]);

  const fmt2 = n => "$" + Math.round(n || 0).toLocaleString();
  const phiResult = phiConfig ? calculatePHI(phiConfig, stats.phiData) : { totalScore: 0, band: "Loading", color: C.txtS, components: {} };

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:20 }}>
      {/* 1. Top KPI Ribbon (5 Cards) - per RigPro3 Spec Section 2.1 */}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit, minmax(200px, 1fr))", gap:16 }}>
        {[
          { label:"Total RFQs In", value:stats.rfqsIn, color:C.acc, sub:"Current Year" },
          { label:"Estimates Given", value:stats.estimatesGiven, color:C.purp, sub:`${stats.responseRate.toFixed(1)}% Response` },
          { label:"Customers", value:stats.customerCount, color:C.yel, sub:"Active in Period" },
          { label:"Won Sales", value:fmt2(stats.wonSum), color:C.grn, sub:"YTD Total" },
          { label:"Avg Gross Margin", value:Math.round(stats.avgMargin)+"%", color:C.teal, sub:"Blended Average" }
        ].map((kpi, i) => (
          <div key={i} style={{ background:C.sur, border:`1px solid ${C.bdr}`, padding:20, borderRadius:12, boxShadow:"0 2px 4px rgba(0,0,0,0.02)" }}>
            <div style={{ color:C.txtS, fontSize:12, fontWeight:700, textTransform:"uppercase", letterSpacing:0.5 }}>{kpi.label}</div>
            <div style={{ color:kpi.color, fontSize:28, fontWeight:800, marginTop:8 }}>{kpi.value}</div>
            <div style={{ color:C.txtS, fontSize:11, marginTop:4, fontWeight:600 }}>{kpi.sub}</div>
          </div>
        ))}
      </div>

      {/* 2. Middle Split (60/40) */}
      <div style={{ display:"flex", flexWrap:"wrap", gap:20 }}>
        <div style={{ flex:"6 1 400px", minWidth:0, background:C.sur, border:`1px solid ${C.bdr}`, borderRadius:12, padding:24 }}>
          <div style={{ fontWeight:800, fontSize:16, marginBottom:16 }}>Revenue vs. Forecast overlay</div>
          <div style={{ height:300, display:"flex", alignItems:"flex-end", gap:8, borderBottom:`1px solid ${C.bdr}`, paddingBottom:12, position:"relative" }}>
            {/* Mock Chart Visualization */}
            {[40, 65, 80, 50, 95, 120].map((h, j) => (
              <div key={j} style={{ flex:1, display:"flex", justifyContent:"center" }}>
                <div style={{ width:"40%", background:C.acc+ "80", height:`${h}%`, borderRadius:"4px 4px 0 0", marginRight:4 }}></div>
                <div style={{ width:"40%", background:C.purp+"80", height:`${h+20}%`, borderRadius:"4px 4px 0 0" }}></div>
              </div>
            ))}
            <svg style={{ position:"absolute", top:0, left:0, width:"100%", height:"100%", pointerEvents:"none" }}>
               <polyline points="0,200 100,150 200,100 300,160 400,60 500,20" fill="none" stroke={C.grn} strokeWidth="3" opacity="0.8"/>
            </svg>
          </div>
          <div style={{ display:"flex", justifyContent:"center", gap:16, marginTop:12, fontSize:12, color:C.txtS }}>
            <span style={{display:"flex", alignItems:"center", gap:4}}><div style={{width:10,height:10,background:C.acc+"80", borderRadius:2}}></div> Actual YTD</span>
            <span style={{display:"flex", alignItems:"center", gap:4}}><div style={{width:10,height:10,background:C.purp+"80", borderRadius:2}}></div> Forecast</span>
            <span style={{display:"flex", alignItems:"center", gap:4}}><div style={{width:10,height:3,background:C.grn}}></div> Trend Line</span>
          </div>
        </div>

        <div style={{ flex:"4 1 300px", minWidth:0, background:C.sur, border:`1px solid ${C.bdr}`, borderRadius:12, padding:24, display:"flex", flexDirection:"column", alignItems:"center" }}>
          <div style={{ fontWeight:800, fontSize:16, marginBottom:20, alignSelf:"flex-start" }}>Pipeline Health Index (PHI)</div>
          
          <div style={{ 
            width:160, height:160, borderRadius:"50%", border:`8px solid ${phiResult.color}40`, 
            display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center",
            boxShadow:`0 0 20px ${phiResult.color}20`
          }}>
             <div style={{ fontSize:48, fontWeight:800, color:phiResult.color, lineHeight:1 }}>{phiResult.totalScore}</div>
             <div style={{ fontSize:14, fontWeight:700, color:C.txtM, marginTop:4, textTransform:"uppercase" }}>{phiResult.band}</div>
          </div>

          <div style={{ width:"100%", marginTop:30 }}>
            {Object.entries(phiResult.components).map(([k, score]) => (
              <div key={k} style={{ marginBottom:10 }}>
                <div style={{ display:"flex", justifyContent:"space-between", fontSize:11, fontWeight:700, textTransform:"uppercase", color:C.txtM, marginBottom:4 }}>
                  <span>{k}</span>
                  <span>{score} / 100</span>
                </div>
                <div style={{ height:6, background:C.bg, borderRadius:3, overflow:"hidden" }}>
                  <div style={{ height:"100%", width:`${score}%`, background:phiResult.color, borderRadius:3 }}></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 3. Bottom Area (Tables) */}
      <div style={{ display:"flex", flexWrap:"wrap", gap:20 }}>
        <div style={{ flex:"1 1 400px", minWidth:0, background:C.sur, border:`1px solid ${C.bdr}`, borderRadius:12 }}>
          <div style={{ padding:"16px 20px", borderBottom:`1px solid ${C.bdr}`, fontWeight:800, fontSize:15 }}>Recent High-Value Wins (&gt; $10k)</div>
          <div style={{ padding:20 }}>
            {stats.bigWins.length === 0 ? <div style={{ fontSize:13, color:C.txtS, textAlign:"center" }}>No recent high value wins won yet.</div> : (
              <table style={{ width:"100%", borderCollapse:"collapse", fontSize:13 }}>
                <tbody>
                  {stats.bigWins.map((w,i) => (
                    <tr key={i} style={{ borderBottom: i===stats.bigWins.length-1?"none":`1px solid ${C.bdr}` }}>
                      <td style={{ padding:"10px 0", fontWeight:600 }}>{w.client}</td>
                      <td style={{ padding:"10px 0", color:C.txtS }}>{w.qn}</td>
                      <td style={{ padding:"10px 0", textAlign:"right", fontWeight:700, color:C.grn }}>{fmt2(w.total)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        <div style={{ flex:"1 1 400px", minWidth:0, background:C.sur, border:`1px solid ${C.bdr}`, borderRadius:12 }}>
          <div style={{ padding:"16px 20px", borderBottom:`1px solid ${C.bdr}`, fontWeight:800, fontSize:15, display:"flex", justifyContent:"space-between" }}>
            <span>At-Risk Pipeline</span>
            <span style={{ fontSize:12, fontWeight:600, color:C.red, background:C.redB, padding:"2px 8px", borderRadius:4 }}>&gt; 14 Days</span>
          </div>
          <div style={{ padding:20, maxHeight: 300, overflowY:"auto" }}>
            {stats.atRiskQuotes.length === 0 ? <div style={{ fontSize:13, color:C.txtS, textAlign:"center" }}>No stale pipeline deals found!</div> : (
              <table style={{ width:"100%", borderCollapse:"collapse", fontSize:13 }}>
                 <tbody>
                  {stats.atRiskQuotes.map((q,i) => (
                    <tr key={i} style={{ borderBottom: i===stats.atRiskQuotes.length-1?"none":`1px solid ${C.bdr}` }}>
                      <td style={{ padding:"10px 0", fontWeight:600 }}>{q.client}</td>
                      <td style={{ padding:"10px 0", color:C.txtS }}>{q.date}</td>
                      <td style={{ padding:"10px 0", textAlign:"right", fontWeight:700, color:C.acc }}>{fmt2(q.total)}</td>
                    </tr>
                  ))}
                </tbody>
             </table>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
