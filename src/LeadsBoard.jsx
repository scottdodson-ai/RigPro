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
  const { C, fmt, thS, tdS, leads, reqs, jobs, actBtns, Header, token, setToken, role, setRole, view, setView, appUsers } = props;
  const [search, setSearch] = useState("");

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
            <div>
               <div style={{fontSize:11, fontWeight:800, color:C.txtS, marginBottom:6, letterSpacing:0.8, textAlign:"right"}}>TOTAL CAPTURED LEADS</div>
               <div style={{fontSize:24, fontWeight:900, color:C.grn, textAlign:"right"}}>{sortedItems.length}</div>
            </div>
          </div>
        </div>

        {/* DATA TABLE */}
        <div style={{ marginTop: 20, overflowY:"auto", padding:"10px 10px 30px 10px" }}>
          <div className="app-table-wrap">
            <table style={{ width:"100%", borderCollapse:"collapse" }}>
              <thead>
                <tr>
                  <SortTh style={thS} label="Lead Contact" sortKey="last_name" currentSort={sortKey} currentDir={sortDir} requestSort={requestSort} />
                  <SortTh style={{...thS, width:"20%"}} label="Company Entity" sortKey="company_name" currentSort={sortKey} currentDir={sortDir} requestSort={requestSort} />
                  <SortTh style={{...thS, width:"15%"}} label="Job Site City" sortKey="city" currentSort={sortKey} currentDir={sortDir} requestSort={requestSort} />
                  <SortTh className="mobile-hidden" style={{...thS, width:"25%"}} label="Lead Notes / Description" sortKey="description" currentSort={sortKey} currentDir={sortDir} requestSort={requestSort} />
                  <SortTh className="mobile-hidden" style={{...thS, textAlign:"center", width:"12%"}} label="Estimator" sortKey="estimator_id" currentSort={sortKey} currentDir={sortDir} requestSort={requestSort} />
                  <SortTh style={{...thS, textAlign:"right"}} label="Created On" sortKey="create_date" currentSort={sortKey} currentDir={sortDir} requestSort={requestSort} />
                </tr>
              </thead>
              <tbody>
                {sortedItems.map(l => (
                  <tr key={l.id} style={{ transition:"0.2s", borderBottom:`1px solid ${C.bdr}` }}>
                    <td style={{ ...tdS, fontWeight:800, fontSize:15, color:C.txt }}>
                      {l.first_name || l.last_name ? `${l.first_name||""} ${l.last_name||""}` : "—"}
                    </td>
                    <td style={{ ...tdS, fontWeight:700, color:C.acc }}>
                      {l.company_name || <span style={{color:C.txtS,fontStyle:"italic",fontWeight:500}}>No Company Found</span>}
                    </td>
                    <td style={{ ...tdS, fontWeight:600, color:C.txtM }}>
                      {l.city || "—"}
                      {l.state && `, ${l.state}`}
                    </td>
                    <td className="mobile-hidden" style={{ ...tdS, fontSize:13, color:C.txtS, whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis", maxWidth:300 }}>
                      {l.description || "—"}
                    </td>
                    <td className="mobile-hidden" style={{ ...tdS, textAlign:"center", fontSize:12, fontWeight:700 }}>
                      <span style={{ background:C.accL, padding:"3px 8px", borderRadius:6, color:C.acc }}>{formatAssocName(l.estimator_id) || "—"}</span>
                    </td>
                    <td style={{ ...tdS, textAlign:"right", color:C.txtS, fontSize:13 }}>
                      {new Date(l.create_date).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
                {sortedItems.length === 0 && (
                  <tr>
                    <td colSpan={6} style={{ padding:40, textAlign:"center", color:C.txtM, fontSize:14 }}>
                      No lead records found based on your filters.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </div>
  );
};

export default LeadsBoard;
