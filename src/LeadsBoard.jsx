import React, { useState, useMemo } from 'react';

function useTableSort(items) {
  const [sortKey, setSortKey] = useState("create_date");
  const [sortDir, setSortDir] = useState(-1);
  const requestSort = (key) => {
    if (sortKey === key) setSortDir(-sortDir);
    else { setSortKey(key); setSortDir(1); }
  };
  const sortedItems = useMemo(() => {
    if (!sortKey) return items;
    return [...items].sort((a,b) => {
      let v1 = typeof sortKey === 'function' ? sortKey(a) : a[sortKey];
      let v2 = typeof sortKey === 'function' ? sortKey(b) : b[sortKey];
      const clean = v => (typeof v === 'string' ? v.toLowerCase() : v);
      v1 = clean(v1); v2 = clean(v2);
      if (v1 < v2) return -1 * sortDir;
      if (v1 > v2) return 1 * sortDir;
      return 0;
    });
  }, [items, sortKey, sortDir]);
  return { sortedItems, requestSort, sortKey, sortDir };
}

function SortTh({ label, sortKey, currentSort, currentDir, requestSort, style, className }) {
  const isA = currentSort === sortKey;
  return (
    <th className={className} style={{ ...style, cursor: "pointer", userSelect: "none" }} onClick={() => requestSort(sortKey)}>
      {label} <span style={{ fontSize:10, opacity:0.6 }}>{isA ? (currentDir === 1 ? "▼" : "▲") : "↕"}</span>
    </th>
  );
}

const LeadsBoard = (props) => {
  const { C, fmt, thS, tdS, leads, reqs, jobs, actBtns, Header, token, setToken, role, setRole, view, setView, appUsers, statusList } = props;
  const [search, setSearch] = useState("");
  const [leadView, setLeadView] = useState("list");
  const [selLead, setSelLead] = useState(null);

  const toggleView = (v) => {
    if (v === "card") setSelLead(null);
    setLeadView(v);
  };

  const filteredLeads = useMemo(() => {
    return (leads || []).filter(l => {
      if (!search) return true;
      const s = search.toLowerCase();
      return (
        (l.first_name || "").toLowerCase().includes(s) ||
        (l.last_name || "").toLowerCase().includes(s) ||
        (l.company_name || "").toLowerCase().includes(s) ||
        (l.description || "").toLowerCase().includes(s)
      );
    });
  }, [leads, search]);

  const { sortedItems, requestSort, sortKey, sortDir } = useTableSort(filteredLeads);

  const formatAssocName = (username) => {
    const user = (appUsers || []).find(u => u.username === username);
    return user ? `${user.first_name} ${user.last_name}` : username;
  };

  const formatStatusName = (statusNum) => {
    const st = (statusList || []).find(s => s.id == statusNum);
    return st ? st.name : `Status ${statusNum}`;
  };

  React.useEffect(() => {
    if (!selLead && sortedItems.length > 0 && leadView === "list") {
      setSelLead(sortedItems[0]);
    }
  }, [selLead, sortedItems, leadView]);

  return (
    <div style={{ minHeight:"100vh", background:C.bg, color:C.txt, fontFamily:"'Segoe UI','Helvetica Neue',Arial,sans-serif", fontSize:14 }}>
      <Header 
        customerCount={props.customers.length} 
        reqCount={reqs.length} 
        quoteCount={jobs.filter(q => q.quote_data || q.status === "Pending" || q.quote_number).length} 
        jobCount={jobs.filter(q => q.is_master_job).length} 
        token={token} role={role} view={view} setView={setView} setToken={setToken} setRole={setRole} extra={actBtns}
      />

      <div style={{ padding:"14px", maxWidth:1600, margin:"0 auto", width:"100%" }}>
        
        {/* CONTROLS PANEL */}
        <div style={{ position:"sticky", top:0, zIndex:10, background:"#fff", padding:"10px 0 20px 0", borderBottom:`2px solid ${C.accL}` }}>
          <div style={{ display:"flex", alignItems:"flex-end", gap:16, flexWrap:"wrap", maxWidth:1280, margin:"0 auto" }}>
            <div style={{ flex:1 }}>
               <div style={{fontSize:11, fontWeight:800, color:C.txtS, marginBottom:6, letterSpacing:0.8}}>SEARCH LEADS</div>
               <input 
                 style={{ width:"100%", minHeight:42, border:`2px solid ${C.acc}`, borderRadius:10, padding:"0 15px", boxSizing:"border-box", fontSize:14 }} 
                 placeholder="Search by name, company, or description..." 
                 value={search} 
                 onChange={e=>setSearch(e.target.value)}
               />
            </div>
            <div style={{ display:"flex", flexDirection:"column" }}>
              <div style={{fontSize:11, fontWeight:800, color:C.txtS, marginBottom:6, letterSpacing:0.8}}>VIEW MODE</div>
              <div style={{ display:"flex", background:C.bg, borderRadius:10, padding:4, border:`1px solid ${C.bdr}` }}>
                <button 
                  onClick={() => toggleView("card")} 
                  style={{ background: leadView === "card" ? "#fff" : "transparent", color: leadView === "card" ? C.acc : C.txtM, border:"none", borderRadius:6, padding:"8px 16px", fontSize:13, fontWeight:700, cursor:"pointer", boxShadow: leadView === "card" ? "0 2px 5px rgba(0,0,0,0.05)" : "none", transition:"all 0.2s" }}
                >
                  <span style={{ marginRight:6 }}>🗂️</span> Grid
                </button>
                <button 
                  onClick={() => toggleView("list")} 
                  style={{ background: leadView === "list" ? "#fff" : "transparent", color: leadView === "list" ? C.acc : C.txtM, border:"none", borderRadius:6, padding:"8px 16px", fontSize:13, fontWeight:700, cursor:"pointer", boxShadow: leadView === "list" ? "0 2px 5px rgba(0,0,0,0.05)" : "none", transition:"all 0.2s" }}
                >
                  <span style={{ marginRight:6 }}>📋</span> List
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* DATA TABLE */}
        {/* VIEW MODE RENDERER: SPLIT SCREEN OR FULL GRID */}
        <div className={leadView === "list" ? "app-split-layout" : ""} style={{ display: leadView === "list" ? "grid" : "block", gridTemplateColumns: leadView === "list" ? "420px 1fr" : "none", gap:30, marginTop: 15, alignItems:"flex-start" }}>
          
          {/* LEFT: LIST VIEW / CARDS */}
          {(!selLead || leadView === "list") && (
          <div style={{ background: leadView === "list" ? "#fff" : "transparent", border: leadView === "list" ? `1px solid ${C.bdrL}` : "none", borderRadius:20, overflow:"hidden", display:"flex", flexDirection:"column", height: leadView === "list" ? "calc(100vh - 160px)" : "auto" }}>
            <div style={{ overflowY:"auto", flex:1, padding: leadView === "list" ? 15 : 0 }}>
              {leadView === "list" ? (
                <div className="app-table-wrap">
                  <table style={{ width:"100%", borderCollapse:"collapse" }}>
                    <thead>
                      <tr>
                        <SortTh style={thS} label="Lead Name" sortKey="last_name" currentSort={sortKey} currentDir={sortDir} requestSort={requestSort} />
                        <SortTh className="mobile-hidden" style={{ ...thS, textAlign:"center" }} label="Status" sortKey="status_number" currentSort={sortKey} currentDir={sortDir} requestSort={requestSort} />
                      </tr>
                    </thead>
                    <tbody>
                      {sortedItems.map(l => {
                        const isSel = selLead && selLead.id === l.id;
                        return (
                          <tr key={l.id} style={{ background: isSel ? C.accL : "transparent", cursor:"pointer", transition:"0.2s", borderBottom:`1px solid ${C.bdr}` }} onClick={()=>{ setSelLead(l); }}>
                            <td style={{ ...tdS, fontWeight:800, fontSize:15, color:C.txt, paddingTop:12, paddingBottom:12 }}>
                              {l.first_name || l.last_name ? `${l.first_name||""} ${l.last_name||""}` : l.company_name || `Lead #${l.id}`}
                            </td>
                            <td className="mobile-hidden" style={{ ...tdS, textAlign:"center", fontWeight:700, fontSize:14 }}>{formatStatusName(l.status_number)}</td>
                          </tr>
                        );
                      })}
                      {sortedItems.length === 0 && (
                        <tr>
                          <td colSpan={2} style={{ padding:40, textAlign:"center", color:C.txtM, fontSize:14 }}>No leads found.</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill, minmax(320px, 1fr))", gap:15 }}>
                  {sortedItems.map(l => (
                    <div key={l.id} style={{ cursor:"pointer", padding:20, borderRadius:16, transition:"0.2s", background: "#fff", border: `1px solid ${C.bdr}` }} onClick={()=>{ setSelLead(l); }}>
                      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:10 }}>
                        <div style={{ fontWeight:900, fontSize:16, color: C.txt }}>
                          {l.first_name || l.last_name ? `${l.first_name||""} ${l.last_name||""}` : l.company_name || `Lead #${l.id}`}
                        </div>
                        <span style={{ background:C.accL, color:C.acc, borderRadius:6, padding:"2px 6px", fontSize:10, fontWeight:800 }}>{formatStatusName(l.status_number)}</span>
                      </div>
                      <div style={{ fontSize:14, fontWeight:600, color:C.txtM, marginBottom:10 }}>{l.company_name || "—"}</div>
                      <div style={{ display:"flex", gap:15, borderTop:`1px solid ${C.bdr}`, paddingTop:10, fontSize: 12, color: C.txtS }}>
                        <div>{l.city ? `${l.city}${l.state ? `, ${l.state}` : ""}` : "No Location"}</div>
                        <div style={{marginLeft:"auto"}}>{new Date(l.create_date).toLocaleDateString()}</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
          )}

          {/* RIGHT: DETAILS VIEW */}
          {(selLead || leadView === "list") && (
          <div style={{ background:"#fff", borderRadius:20, boxShadow:"0 5px 25px rgba(0,0,0,0.03)", border:`1px solid ${C.bdrL}`, height:"calc(100vh - 160px)", overflowY:"auto" }}>
            {selLead ? (
               <div style={{ flex:1, padding:"30px 40px", background:"#fff" }}>
                 {leadView === "card" && (
                   <div style={{ marginBottom: 20 }}>
                     <button style={{ padding: "8px 16px", borderRadius: 8, fontSize: 13, border: `1px solid ${C.bdr}`, color: C.txtM, background: "#fff", cursor:"pointer" }} onClick={() => setSelLead(null)}>
                       ← Back to Grid
                     </button>
                   </div>
                 )}
                 <div style={{ maxWidth:950, margin:"0 auto" }}>
                  <div style={{ display:"flex", flexDirection:"column", gap:10, marginBottom:50, borderBottom:`4px solid ${C.accL}`, paddingBottom:35 }}>
                    <div style={{ display:"flex", gap:15, alignItems:"flex-start", justifyContent:"flex-end" }}>
                       <span style={{ background:C.accL, padding:"6px 12px", borderRadius:6, color:C.acc, fontWeight:800 }}>Est: {formatAssocName(selLead.estimator_id) || "Unassigned"}</span>
                    </div>

                    <div>
                      <div style={{ fontSize:44, fontWeight:900, color:C.txt, letterSpacing:"-1px", lineHeight:1 }}>{selLead.first_name || selLead.last_name || selLead.company_name || `Lead #${selLead.id}`}</div>
                      <div style={{ display:"flex", gap:20, marginTop:18 }}>
                        <div style={{ fontSize:13, color:C.txtS, fontWeight:800, textTransform:"uppercase", background:C.bg, padding:"5px 12px", borderRadius:8 }}>Company: {selLead.company_name || 'N/A'}</div>
                        <div style={{ fontSize:13, color:C.ora, fontWeight:800, background:"#fff7ed", padding:"5px 12px", borderRadius:8 }}>STATUS: {formatStatusName(selLead.status_number)}</div>
                      </div>
                    </div>
                  </div>

                  <div className="app-two-col" style={{ gap:60 }}>
                    <div style={{ display:"flex", flexDirection:"column", gap:45 }}>
                      <div>
                        <div style={{ fontSize:16, fontWeight:900, color:C.txt, marginBottom:10, textTransform:"uppercase", letterSpacing:1 }}>Location</div>
                        <div style={{ background:C.bg, padding:30, borderRadius:20, marginTop:15, fontSize:15, fontWeight:600, color:C.txt, lineHeight:1.7, border:`1px solid ${C.bdrL}`, boxShadow:"inset 0 2px 4px rgba(0,0,0,0.02)" }}>
                          <div style={{display:"flex", flexDirection:"column", gap:8}}>
                            <div style={{display:"flex", gap:10}}><span style={{color:C.txtS, width:75}}>Street:</span><span>{selLead.address1 || "—"}</span></div>
                            <div style={{display:"flex", gap:10}}><span style={{color:C.txtS, width:75}}>City:</span><span>{selLead.city || "—"}</span></div>
                            <div style={{display:"flex", gap:10}}><span style={{color:C.txtS, width:75}}>State:</span><span>{selLead.state || "—"}</span></div>
                            <div style={{display:"flex", gap:10}}><span style={{color:C.txtS, width:75}}>Zip:</span><span>{selLead.zip || "—"}</span></div>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div>
                      <div style={{ fontSize:16, fontWeight:900, color:C.txt, marginBottom:10, textTransform:"uppercase", letterSpacing:1 }}>Lead Description</div>
                      <div style={{ background:"#fffbeb", padding:30, borderRadius:20, border:`1px solid #fef3c7`, fontSize:16, color:C.txtM, lineHeight:1.8, minHeight:200, whiteSpace:"pre-wrap" }}>{selLead.description || "No description provided."}</div>
                    </div>
                  </div>
                 </div>
               </div>
            ) : (
               <div style={{ flex:1, display:"flex", alignItems:"center", justifyContent:"center", height:"100%", color:C.txtM, fontSize:15, flexDirection:"column", gap:10, padding:40, textAlign:"center" }}>
                 <div style={{ fontSize:40 }}>👤</div>
                 No lead selected.<br/>Select a lead from the left list to view details.
               </div>
            )}
          </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default LeadsBoard;
