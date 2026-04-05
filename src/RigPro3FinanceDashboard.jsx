import React, { useMemo } from 'react';

const C = {
  bg: "#f8fafc", sur: "#ffffff", acc: "#0ea5e9", accL: "#bae6fd", accB: "#0284c7", txt: "#0f172a", txtM: "#334155", txtS: "#64748b",
  bdr: "#e2e8f0", red: "#ef4444", redB: "#fef2f2", redBdr: "#fca5a5", grn: "#22c55e", grnB: "#f0fdf4", grnBdr: "#86efac",
  yel: "#f59e0b", yelB: "#fffbeb", yelBdr: "#fcd34d", purp: "#8b5cf6", teal: "#14b8a6", bluB: "#eff6ff", bluBdr: "#bfdbfe", blue: "#3b82f6"
};

export default function RigPro3FinanceDashboard({ jobs }) {
  const stats = useMemo(() => {
    const won = jobs.filter(q => q.status === "Won");
    
    // Core KPIs
    const totalRev = won.reduce((s,q) => s + (q.total || 0), 0);
    const totalCost = won.reduce((s,q) => s + Math.round((q.labor||0)*0.6 + (q.equip||0)*0.7 + (q.hauling||0)*0.85 + (q.mats||0)*0.85 + (q.travel||0)), 0);
    const grossMargin = totalRev - totalCost;
    const avgMarginPct = totalRev > 0 ? (grossMargin / totalRev) * 100 : 0;
    
    // Backlog
    const pending = won.filter(q => !q.comp_date || new Date(q.comp_date) >= new Date());
    const backlogVal = pending.reduce((s,q) => s + (q.total || 0), 0);
    const backlogCount = pending.length;
    
    const backlogByMonth = {};
    pending.forEach(q => {
      const m = q.comp_date ? q.comp_date.substring(0,7) : "Unscheduled";
      if(!backlogByMonth[m]) backlogByMonth[m] = { val:0, count:0, m };
      backlogByMonth[m].val += (q.total||0);
      backlogByMonth[m].count++;
    });
    const sortedBacklog = Object.values(backlogByMonth).sort((a,b)=>a.m.localeCompare(b.m));

    // Margin Trend (Group by month)
    const marginByMonth = {};
    won.forEach(q => {
      if(!q.date) return;
      const m = q.date.substring(0,7);
      if(!marginByMonth[m]) marginByMonth[m] = { rev:0, cost:0, counts:0 };
      const rev = q.total||0;
      const cost = Math.round((q.labor||0)*0.6 + (q.equip||0)*0.7 + (q.hauling||0)*0.85 + (q.mats||0)*0.85 + (q.travel||0));
      marginByMonth[m].rev += rev;
      marginByMonth[m].cost += cost;
      marginByMonth[m].counts++;
    });
    
    const sortedTrend = Object.keys(marginByMonth).sort().map(k => {
      const b = marginByMonth[k];
      const mPct = b.rev > 0 ? ((b.rev - b.cost) / b.rev) * 100 : 0;
      return { month:k, mPct, rev: b.rev };
    });

    return {
      totalRev, totalCost, grossMargin, avgMarginPct,
      backlogVal, backlogCount, sortedBacklog,
      sortedTrend
    };
  }, [jobs]);

  const fmt2 = n => "$" + Math.round(n || 0).toLocaleString();

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:20 }}>
      {/* KPI Ribbon */}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit, minmax(200px, 1fr))", gap:16 }}>
        {[
          { label:"Total Revenue", value:fmt2(stats.totalRev), color:C.acc },
          { label:"Total Direct Costs", value:fmt2(stats.totalCost), color:C.purp },
          { label:"Gross Margin ($)", value:fmt2(stats.grossMargin), color:C.grn },
          { label:"Avg Margin %", value:Math.round(stats.avgMarginPct)+"%", color:C.teal },
          { label:"Total Backlog", value:fmt2(stats.backlogVal), color:C.yel }
        ].map((kpi, i) => (
          <div key={i} style={{ background:C.sur, border:`1px solid ${C.bdr}`, padding:20, borderRadius:12, boxShadow:"0 2px 4px rgba(0,0,0,0.02)" }}>
            <div style={{ color:C.txtS, fontSize:12, fontWeight:700, textTransform:"uppercase", letterSpacing:0.5 }}>{kpi.label}</div>
            <div style={{ color:kpi.color, fontSize:28, fontWeight:800, marginTop:8 }}>{kpi.value}</div>
          </div>
        ))}
      </div>

      {/* Main Analysis Block */}
      <div style={{ display:"flex", flexWrap:"wrap", gap:20 }}>
        {/* Margin Trend Over Time */}
        <div style={{ flex:"6 1 400px", minWidth:0, background:C.sur, border:`1px solid ${C.bdr}`, borderRadius:12, padding:24 }}>
          <div style={{ fontWeight:800, fontSize:16, marginBottom:16 }}>Margin Trend Over Time</div>
          <div style={{ height:300, display:"flex", alignItems:"flex-end", gap:8, borderBottom:`1px solid ${C.bdr}`, paddingBottom:12, position:"relative" }}>
            {stats.sortedTrend.map((t, j) => {
              // Normalize height for display
              // We'll scale margin % (0-100) to height
              const h = Math.min(Math.max(t.mPct, 0), 100);
              return (
                <div key={j} style={{ flex:1, display:"flex", flexDirection:"column", justifyContent:"flex-end", alignItems:"center", height:"100%" }}>
                  <div style={{ marginBottom:4, fontSize:10, color:C.txtM, fontWeight:600 }}>{Math.round(t.mPct)}%</div>
                  <div style={{ width:"60%", background:C.teal, height:`${h}%`, borderRadius:"4px 4px 0 0", opacity: t.mPct > 0 ? 0.9 : 0.2 }}></div>
                  <div style={{ position:"absolute", bottom:-25, fontSize:10, color:C.txtS, transform:"rotate(-45deg)" }}>{t.month}</div>
                </div>
              );
            })}
          </div>
          <div style={{ display:"flex", justifyContent:"center", gap:16, marginTop:30, fontSize:12, color:C.txtS }}>
            <span style={{display:"flex", alignItems:"center", gap:4}}><div style={{width:10,height:10,background:C.teal, borderRadius:2}}></div> Gross Margin %</span>
          </div>
        </div>

        {/* Backlog Report */}
        <div style={{ flex:"4 1 300px", minWidth:0, background:C.sur, border:`1px solid ${C.bdr}`, borderRadius:12, display:"flex", flexDirection:"column" }}>
          <div style={{ padding:"16px 20px", borderBottom:`1px solid ${C.bdr}`, fontWeight:800, fontSize:15, display:"flex", justifyContent:"space-between" }}>
            <span>Backlog by Completion Month</span>
            <span style={{ fontSize:12, fontWeight:600, color:C.yel, background:C.yelB, padding:"2px 8px", borderRadius:4 }}>{stats.backlogCount} Jobs Pending</span>
          </div>
          <div style={{ padding:20, flex:1, overflowY:"auto" }}>
            {stats.sortedBacklog.length === 0 ? <div style={{ fontSize:13, color:C.txtS, textAlign:"center" }}>No pending jobs in backlog.</div> : (
              <table style={{ width:"100%", borderCollapse:"collapse", fontSize:13 }}>
                <thead>
                  <tr style={{ borderBottom:`2px solid ${C.bdr}`, textAlign:"left" }}>
                    <th style={{ paddingBottom:8, color:C.txtS, fontWeight:600 }}>Month</th>
                    <th style={{ paddingBottom:8, color:C.txtS, fontWeight:600, textAlign:"center" }}>Jobs</th>
                    <th style={{ paddingBottom:8, color:C.txtS, fontWeight:600, textAlign:"right" }}>Value</th>
                  </tr>
                </thead>
                <tbody>
                  {stats.sortedBacklog.map((b,i) => (
                    <tr key={i} style={{ borderBottom:`1px solid ${C.bdr}` }}>
                      <td style={{ padding:"10px 0", fontWeight:600 }}>{b.m}</td>
                      <td style={{ padding:"10px 0", textAlign:"center", color:C.txtM }}>{b.count}</td>
                      <td style={{ padding:"10px 0", textAlign:"right", fontWeight:700, color:C.purp }}>{fmt2(b.val)}</td>
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
