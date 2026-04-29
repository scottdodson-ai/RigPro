import React, { useState, useMemo, useEffect } from 'react';
import { useAppStore } from './store';
import { getLeadTimeInfo } from './timeUtils';

/**
 * Custom hook to persist state in localStorage
 */
function usePersistentState(key, initialValue) {
  const [state, setState] = useState(() => {
    try {
      const saved = localStorage.getItem(key);
      if (saved !== null) {
        return JSON.parse(saved);
      }
    } catch (e) {
      console.warn(`Error loading state for key "${key}" from localStorage:`, e);
    }
    return initialValue;
  });

  useEffect(() => {
    try {
      localStorage.setItem(key, JSON.stringify(state));
    } catch (e) {
      console.warn(`Error saving state for key "${key}" to localStorage:`, e);
    }
  }, [key, state]);

  return [state, setState];
}

function useTableSort(items) {
  const [sortKey, setSortKey] = usePersistentState("rigpro_leads_sort_key", "create_date");
  const [sortDir, setSortDir] = usePersistentState("rigpro_leads_sort_dir", -1);
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
  const { C, fmt, thS, tdS, leads, setLeads, reqs, jobs, setJobs, actBtns, Header, token, setToken, role, setRole, view, setView, appUsers, profileUser, statusList, custData, Sec, onAddLead, mkBtn, AutoInput, Lbl, Card, inp, sel, globalSitesCount, openEdit, deleteQuote } = props;
  const leadsSearch = useAppStore(state => state.leadsSearch);
  const setLeadsSearch = useAppStore(state => state.setLeadsSearch);
  const leadsView = useAppStore(state => state.leadsView);
  const setLeadsView = useAppStore(state => state.setLeadsView);
  const selLead = useAppStore(state => state.selLead);
  const setSelLead = useAppStore(state => state.setSelLead);

  const isEstimator = (u) => u.role === "estimator" || (u.roles || []).includes("estimator");
  const allEstimators = (appUsers || []).filter(isEstimator);
  const isAdmin = role === "admin" || (profileUser && (profileUser.role === "admin" || (profileUser.roles || []).includes("admin")));
  const amIEstimator = profileUser && (isEstimator(profileUser) || isAdmin);
  const otherEstimators = allEstimators.filter(u => profileUser && u.username !== profileUser.username);

  const grabLead = (lead) => {
    if (!openEdit) return;
    const inProgStatus = (statusList || []).find(s => s.name === "In Progress")?.id || "In Progress"; 
    const pName = profileUser ? (profileUser.username || profileUser.first_name || "") : ""; 
    openEdit({ ...lead, status: inProgStatus, client: lead.client || lead.customer_name || lead.company, salesAssoc: pName, sales_assoc: pName, estimator: pName, estimator_id: pName });
  };

  const getLeadSlaColor = (l) => {
    if (l.estimator_id) return { bg: "#ffffff", blink: false };
    const { bDays } = getLeadTimeInfo(l.create_date);
    if (bDays === 0) return { bg: "#dcfce7", blink: false }; // light green
    if (bDays === 1) return { bg: "#fef08a", blink: false }; // yellow
    if (bDays === 2) return { bg: "#fee2e2", blink: false }; // light red
    return { bg: "#fee2e2", blink: true }; // >2 days: blinking light red
  };

  const handleAssign = async (usernameTarget, targetLead = selLead) => {
    if (!targetLead) return;
    try {
      // Map estimator update payload to quotes schema
      const payload = { sales_assoc: usernameTarget, status: 2 }; // status 2 is Quote Requested / In Progress
      const res = await fetch(`${fmt.api || "/api"}/admin/tables/quotes/${targetLead.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
        body: JSON.stringify(payload)
      });
      if (!res.ok) throw new Error("Failed to assign lead to estimator. You might lack permissions.");
      
      const updated = { ...targetLead, estimator_id: usernameTarget, sales_assoc: usernameTarget };
      if (usernameTarget) updated.status_number = 2; // Server backend inherently trips it to 'In Progress' Quote Mode
      
      if (setLeads) {
        setLeads((prev) => prev.filter(l => l.id !== targetLead.id));
      }
      if (setJobs) {
        setJobs(prev => {
          if (prev.find(q => q.id === targetLead.id)) return prev.map(q => q.id === targetLead.id ? updated : q);
          return [updated, ...prev];
        });
      }
      if (selLead && selLead.id === targetLead.id) {
        setSelLead(null);
      }
    } catch (e) {
      console.error(e);
      alert("Error assigning lead: " + e.message);
    }
  };

  const handleStatusChange = async (newStatusId) => {
    try {
      const payload = { status: newStatusId };
      const res = await fetch(`${fmt.api || "/api"}/admin/tables/quotes/${selLead.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
        body: JSON.stringify(payload)
      });
      if (!res.ok) throw new Error("Failed to change lead status.");
      
      const updated = { ...selLead, status_number: newStatusId };
      
      if (setLeads) {
        if (String(newStatusId) === "1") {
           setLeads(prev => prev.map(l => l.id === selLead.id ? updated : l));
           setSelLead(updated);
           if (setJobs) setJobs(prev => prev.map(q => q.id === selLead.id ? updated : q));
        } else {
           setLeads(prev => prev.filter(l => l.id !== selLead.id));
           setSelLead(null);
           if (setJobs) {
             setJobs(prev => {
                if (prev.find(q => q.id === selLead.id)) return prev.map(q => q.id === selLead.id ? updated : q);
                return [updated, ...prev];
             });
           }
        }
      }
    } catch (e) {
      console.error(e);
      alert("Error changing status: " + e.message);
    }
  };

  const toggleView = (v) => {
    if (v === "card") setSelLead(null);
    setLeadsView(v);
  };

  const filteredLeads = useMemo(() => {
    return (leads || []).filter(l => {
      if (!leadsSearch) return true;
      const s = leadsSearch.toLowerCase();
      return (
        (l.first_name || "").toLowerCase().includes(s) ||
        (l.last_name || "").toLowerCase().includes(s) ||
        (l.customer_name || "").toLowerCase().includes(s) ||
        (l.description || l.desc || l.jobDesc || "").toLowerCase().includes(s)
      );
    });
  }, [leads, leadsSearch]);

  const { sortedItems, requestSort, sortKey, sortDir } = useTableSort(filteredLeads);



  const formatAssocName = (username) => {
    const user = (appUsers || []).find(u => u.username === username);
    return user ? `${user.first_name} ${user.last_name}` : username;
  };

  const formatStatusName = (statusNum) => {
    const st = (statusList || []).find(s => s.id == statusNum);
    return st ? st.name : `Status ${statusNum}`;
  };


  return (
    <div style={{ minHeight:"100vh", background:C.bg, color:C.txt, fontFamily:"'Segoe UI','Helvetica Neue',Arial,sans-serif", fontSize:14 }}>
      <Header siteCount={globalSitesCount} 
        leadCount={leads ? leads.length : 0}
        customerCount={props.customers ? props.customers.length : 0} 
        reqCount={reqs.length} 
        quoteCount={jobs.filter(q => q.quote_data || q.status === "Pending" || q.quote_number).length} 
        jobCount={jobs.filter(q => q.is_master_job).length} 
        token={token} role={role} view={view} setView={setView} setToken={setToken} setRole={setRole} extra={actBtns}
      />

      <div style={{ padding:"14px", maxWidth:1600, margin:"0 auto", width:"100%" }}>
        
        {/* CONTROLS PANEL */}
        <div className="sticky-search" style={{ position:"sticky", top:0, zIndex:10, background:"#fff", padding:"10px 0 20px 0", borderBottom:`2px solid ${C.accL}` }}>
          <div style={{ display:"flex", alignItems:"flex-end", gap:16, flexWrap:"wrap", maxWidth:1280, margin:"0 auto" }}>
            <div style={{ flex:1 }}>
               <div style={{fontSize:11, fontWeight:800, color:C.txtS, marginBottom:6, letterSpacing:0.8}}>SEARCH LEADS</div>
               <div style={{position:"relative"}}>
                 <input 
                   style={{ width:"100%", minHeight:42, border:`2px solid ${C.acc}`, borderRadius:10, padding:"0 15px", paddingRight: 35, boxSizing:"border-box", fontSize:14 }} 
                   placeholder="Search by name, company, or description..." 
                   value={leadsSearch} 
                   onChange={e=>setLeadsSearch(e.target.value)}
                 />
                 {leadsSearch && <span onClick={() => setLeadsSearch("")} style={{position:"absolute", right:12, top:"50%", transform:"translateY(-50%)", cursor:"pointer", color:"#aaa", fontWeight:800, fontSize:15, padding:5}}>✕</span>}
               </div>
            </div>
            <div style={{ display:"flex", flexDirection:"column" }}>
              <div style={{fontSize:11, fontWeight:800, color:C.txtS, marginBottom:6, letterSpacing:0.8}}>VIEW MODE</div>
              <div style={{ display:"flex", background:C.bg, borderRadius:10, padding:4, border:`1px solid ${C.bdr}` }}>
                <button 
                  onClick={() => toggleView("card")} 
                  style={{ background: leadsView === "card" ? "#fff" : "transparent", color: leadsView === "card" ? C.acc : C.txtM, border:"none", borderRadius:6, padding:"8px 16px", fontSize:13, fontWeight:700, cursor:"pointer", boxShadow: leadsView === "card" ? "0 2px 5px rgba(0,0,0,0.05)" : "none", transition:"all 0.2s" }}
                >
                  <span style={{ marginRight:6 }}>🗂️</span> Grid
                </button>
                <button 
                  onClick={() => toggleView("list")} 
                  style={{ background: leadsView === "list" ? "#fff" : "transparent", color: leadsView === "list" ? C.acc : C.txtM, border:"none", borderRadius:6, padding:"8px 16px", fontSize:13, fontWeight:700, cursor:"pointer", boxShadow: leadsView === "list" ? "0 2px 5px rgba(0,0,0,0.05)" : "none", transition:"all 0.2s" }}
                >
                  <span style={{ marginRight:6 }}>📋</span> List
                </button>
              </div>
            </div>
            <div style={{ display:"flex", flexDirection:"column" }}>
               <div style={{fontSize:11, fontWeight:800, color:C.txtS, marginBottom:6, letterSpacing:0.8, opacity:0}}>ACTION</div>
               <button onClick={onAddLead} style={{ ...mkBtn("blue"), background:C.acc, color:"#fff" }}>+ New Lead</button>
            </div>
          </div>
        </div>


        {/* DATA TABLE */}
        {/* VIEW MODE RENDERER: SPLIT SCREEN OR FULL GRID */}
        <div className={leadsView === "list" ? "app-split-layout" : ""} style={{ display: leadsView === "list" ? "grid" : "block", gridTemplateColumns: leadsView === "list" ? "420px 1fr" : "none", gap:30, marginTop: 15, alignItems:"flex-start" }}>
          
          {/* LEFT: LIST VIEW / CARDS */}
          {(!selLead || leadsView === "list") && (
          <div className="leads-left-col" style={{ background: leadsView === "list" ? "#fff" : "transparent", border: leadsView === "list" ? `1px solid ${C.bdrL}` : "none", borderRadius:20, overflow:"hidden", display:"flex", flexDirection:"column", height: leadsView === "list" ? "calc(100vh - 160px)" : "auto" }}>
            <div style={{ overflow:"auto", flex:1, padding: leadsView === "list" ? 15 : 0 }}>
              {leadsView === "list" ? (
                  <table style={{ width:"100%", borderCollapse:"collapse" }}>
                    <thead>
                      <tr>
                        <SortTh style={{ ...thS, width: "30%" }} label="Customer" sortKey="customer_name" currentSort={sortKey} currentDir={sortDir} requestSort={requestSort} />
                        <SortTh style={{ ...thS, width: "25%" }} label="Contact" sortKey="last_name" currentSort={sortKey} currentDir={sortDir} requestSort={requestSort} />
                        <SortTh style={{ ...thS, width: "30%" }} label="Timing" sortKey="create_date" currentSort={sortKey} currentDir={sortDir} requestSort={requestSort} />
                        <th style={{ ...thS, width: "15%" }}></th>
                      </tr>
                    </thead>
                    <tbody>
                      {sortedItems.map(l => {
                        const isSel = selLead && selLead.id === l.id;
                        const sla = getLeadSlaColor(l);
                        const tInfo = getLeadTimeInfo(l.create_date);
                        return (
                          <tr key={l.id} className={!isSel && sla.blink ? "bg-blink-red" : ""} style={{ background: isSel ? C.accL : (sla.blink ? undefined : sla.bg), cursor:"pointer", transition:"0.2s", borderBottom:`1px solid ${C.bdr}` }} onClick={()=>{ setSelLead(l); }}>
                            <td style={{ ...tdS, fontWeight:800, fontSize:15, color:C.txt, paddingTop:12, paddingBottom:12, maxWidth: 160, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                              <div title={l.customer_name || ""}>{l.customer_name || "—"}</div>
                            </td>
                            <td style={{ ...tdS, color:C.txtM, fontSize:13, maxWidth: 160, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                              {l.first_name || l.last_name ? `${l.first_name||""} ${l.last_name||""}` : `Lead #${l.id}`}
                            </td>
                            <td style={{ ...tdS, color:C.txtM, fontSize:12, maxWidth: 180, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                              <div style={{ color: C.txtS, fontWeight: 500 }}>Created: {l.create_date ? new Date(l.create_date).toLocaleString() : "Unknown"}</div>
                              <div style={{ color: C.acc, fontWeight: 700, marginTop: 4 }}>Time Elapsed: {tInfo.formatted}</div>
                            </td>
                            <td style={{ ...tdS, width: 120, textAlign: "right" }}>
                              <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
                                {isAdmin && (
                                  <button
                                    onClick={(e) => { e.stopPropagation(); deleteQuote(l.id); }}
                                    style={{ background: "#ef4444", color: "#fff", border: "none", borderRadius: 5, padding: "4px 10px", fontSize: 11, fontWeight: 700, cursor: "pointer", boxShadow: "0 2px 4px rgba(239,68,68,0.2)" }}>
                                    Delete
                                  </button>
                                )}
                                {l.estimator_id !== (profileUser ? profileUser.username : null) && (
                                  <button
                                    onClick={(e) => { e.stopPropagation(); grabLead(l); }}
                                    style={{ background: "#3b82f6", color: "#fff", border: "none", borderRadius: 5, padding: "4px 10px", fontSize: 11, fontWeight: 700, cursor: "pointer", boxShadow: "0 2px 4px rgba(59,130,246,0.2)" }}>
                                    Grab this lead
                                  </button>
                                )}
                              </div>
                            </td>
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
              ) : (
                <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill, minmax(320px, 1fr))", gap:15 }}>
                  {sortedItems.map(l => {
                    const sla = getLeadSlaColor(l);
                    const tInfo = getLeadTimeInfo(l.create_date);
                    return (
                    <div key={l.id} className={sla.blink ? "bg-blink-red" : ""} style={{ cursor:"pointer", padding:20, borderRadius:16, transition:"0.2s", background: sla.blink ? undefined : sla.bg, border: `1px solid ${C.bdr}` }} onClick={()=>{ setSelLead(l); }}>
                      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:10 }}>
                        <div style={{ fontWeight:900, fontSize:16, color: C.txt }}>
                          {l.first_name || l.last_name ? `${l.first_name||""} ${l.last_name||""}` : l.customer_name || `Lead #${l.id}`}
                        </div>
                        <span style={{ background:C.accL, color:C.acc, borderRadius:6, padding:"2px 6px", fontSize:10, fontWeight:800 }}>{formatStatusName(l.status_number)}</span>
                      </div>
                      <div style={{ fontSize:14, fontWeight:600, color:C.txtM, marginBottom:4 }}>{l.customer_name || "—"}</div>
                      <div style={{ fontSize: 11, color: C.txtS, marginBottom: 10 }}>Created: {l.create_date ? new Date(l.create_date).toLocaleString() : "Unknown"}</div>
                      <div style={{ display:"flex", gap:15, borderTop:`1px solid ${C.bdr}`, paddingTop:10, fontSize: 12, color: C.txtS }}>
                        <div>
                          {(() => {
                            const locs = custData && custData[l.customer_name] && custData[l.customer_name].locations;
                            if (locs && locs.length > 0) {
                              return locs.slice(0, 2).map((loc, i) => (
                                <div key={i}>{loc.name ? `${loc.name}: ` : ''}{loc.address}{loc.city ? `, ${loc.city}` : ''}</div>
                              )).concat(locs.length > 2 ? <div key="more" style={{ color: C.acc, fontSize: 10 }}>+{locs.length - 2} more sites</div> : []);
                            }
                            return l.city ? `${l.city}${l.state ? `, ${l.state}` : ""}` : (l.jobSite || "No Location");
                          })()}
                        </div>
                        <div style={{marginLeft:"auto", textAlign: "right"}}>
                           <div style={{fontWeight: 700, color: C.txtM}}>{tInfo.formatted} elapsed</div>
                        </div>
                      </div>
                      {(l.estimator_id !== (profileUser ? profileUser.username : null) || isAdmin) && (
                        <div style={{ borderTop: `1px solid ${C.bdr}`, paddingTop: 10, marginTop: 10, display: "flex", justifyContent: "flex-end", gap: 10 }}>
                          {isAdmin && (
                            <button
                              onClick={(e) => { e.stopPropagation(); deleteQuote(l.id); }}
                              style={{ background: "#ef4444", color: "#fff", border: "none", borderRadius: 5, padding: "6px 12px", fontSize: 11, fontWeight: 700, cursor: "pointer", boxShadow: "0 2px 4px rgba(239,68,68,0.2)" }}>
                              Delete
                            </button>
                          )}
                          {l.estimator_id !== (profileUser ? profileUser.username : null) && (
                            <button
                              onClick={(e) => { e.stopPropagation(); grabLead(l); }}
                              style={{ background: "#3b82f6", color: "#fff", border: "none", borderRadius: 5, padding: "6px 12px", fontSize: 11, fontWeight: 700, cursor: "pointer", boxShadow: "0 2px 4px rgba(59,130,246,0.2)" }}>
                              Grab this lead
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
          )}

          {/* RIGHT: DETAILS VIEW */}
          {(selLead || leadsView === "list") && (
          <div className="leads-right-col" style={{ background:"#fff", borderRadius:20, boxShadow:"0 5px 25px rgba(0,0,0,0.03)", border:`1px solid ${C.bdrL}`, height:"calc(100vh - 160px)", overflowY:"auto" }}>
            {selLead ? (
              !leads.some(l => l.id === selLead.id) ? (
                <div style={{ padding: 40, textAlign: "center", color: C.txtS, fontStyle: "italic", height: 400, display: "flex", alignItems: "center", justifyContent: "center" }}>
                  This lead has been claimed or deleted.
                </div>
              ) : (
                <div style={{ flex:1, padding:"30px 40px", background:"#fff" }}>
                 {(leadsView === "card" || leadsView === "list") && (
                   <div className={leadsView === "list" ? "mobile-only-return-btn" : ""} style={{ marginBottom: 20 }}>
                     <button style={{ padding: "8px 16px", borderRadius: 8, fontSize: 13, border: `1px solid ${C.bdr}`, color: C.txtM, background: "#fff", cursor:"pointer" }} onClick={() => setSelLead(null)}>
                       ← Back to {leadsView === "list" ? "List" : "Grid"}
                     </button>
                   </div>
                 )}
                 <div style={{ maxWidth:950, margin:"0 auto" }}>
                  <div style={{ display:"flex", flexDirection:"column", gap:10, marginBottom:50, borderBottom:`4px solid ${C.accL}`, paddingBottom:35 }}>
                    <div style={{ display:"flex", gap:15, alignItems:"center", justifyContent:"flex-end", flexWrap: "wrap" }}>
                       {(role || []).includes('admin') && (
                         <select 
                           style={{ padding:"5px 10px", borderRadius:6, border:`1px solid ${C.bdr}`, cursor:"pointer", color:C.txt, outline:"none", fontSize:12, background:"#f8fafc", fontWeight:600 }}
                           value={selLead.status_number || 1}
                           onChange={e => handleStatusChange(e.target.value)}
                         >
                           {statusList && statusList.filter(s => s.type === 'quote').map(s => (
                             <option key={s.id} value={s.id}>{s.name}</option>
                           ))}
                         </select>
                       )}
                       {selLead.estimator_id && <span style={{ background:C.accL, padding:"6px 12px", borderRadius:6, color:C.acc, fontWeight:800 }}>Est: {formatAssocName(selLead.estimator_id)}</span>}
                       <select 
                         style={{ padding:"5px 10px", borderRadius:6, border:`1px solid ${C.bdr}`, cursor:"pointer", color:C.txtM, outline:"none", fontSize:12, background:"#fff" }}
                         value={selLead.estimator_id || ""}
                         onChange={e => handleAssign(e.target.value)}
                       >
                         <option value="">-- Assign Other Estimator --</option>
                         {otherEstimators.map(u => (
                           <option key={u.id} value={u.username}>{u.first_name} {u.last_name||""}</option>
                         ))}
                       </select>
                       {isAdmin && (
                         <button 
                           onClick={() => { if (selLead) deleteQuote(selLead.id); }}
                           style={{ background:"#ef4444", color:"#fff", border:"none", borderRadius:6, padding:"6px 14px", fontWeight:800, cursor:"pointer", fontSize:12, boxShadow:"0 2px 4px rgba(239,68,68,0.2)" }}
                         >
                           DELETE
                         </button>
                       )}
                       {selLead.estimator_id !== (profileUser ? profileUser.username : null) && (
                         <button 
                           onClick={() => grabLead(selLead)}
                           style={{ background:C.blue, color:"#fff", border:"none", borderRadius:6, padding:"6px 14px", fontWeight:800, cursor:"pointer", fontSize:12, boxShadow:"0 2px 4px rgba(37,99,235,0.2)" }}
                         >
                           GRAB THIS LEAD
                         </button>
                       )}
                    </div>

                    <div>
                      <div style={{ fontSize:44, fontWeight:900, color:C.txt, letterSpacing:"-1px", lineHeight:1 }}>{selLead.customer_name || `Lead #${selLead.id}`}</div>
                      <div style={{ display:"flex", gap:20, marginTop:18 }}>
                        <div style={{ fontSize:13, color:C.txtS, fontWeight:800, textTransform:"uppercase", background:C.bg, padding:"5px 12px", borderRadius:8 }}>Contact: {selLead.first_name || selLead.last_name ? `${selLead.first_name||""} ${selLead.last_name||""}` : 'N/A'}</div>
                        {(selLead.contact_phone || selLead.contact_email) && (
                          <div style={{ fontSize:13, color:C.acc, fontWeight:800, background:C.accL, padding:"5px 12px", borderRadius:8 }}>
                            {selLead.contact_phone} {selLead.contact_email ? `| ${selLead.contact_email}` : ''}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="app-two-col" style={{ gap:60 }}>
                    <div style={{ display:"flex", flexDirection:"column", gap:45 }}>
                      <div>
                        <div style={{ fontSize:16, fontWeight:900, color:C.txt, marginBottom:10, textTransform:"uppercase", letterSpacing:1 }}>Location</div>
                        <div style={{ background:C.bg, padding:30, borderRadius:20, marginTop:15, fontSize:15, fontWeight:600, color:C.txt, lineHeight:1.7, border:`1px solid ${C.bdrL}`, boxShadow:"inset 0 2px 4px rgba(0,0,0,0.02)" }}>
                          {(() => {
                            const locs = custData && custData[selLead.customer_name] && custData[selLead.customer_name].locations;
                            if (locs && locs.length > 0) {
                              return (
                                <div style={{ display: "flex", flexDirection: "column", gap: 15 }}>
                                  {locs.map((loc, idx) => (
                                    <div key={idx} style={{ paddingBottom: idx < locs.length - 1 ? 15 : 0, borderBottom: idx < locs.length - 1 ? `1px solid ${C.bdr}` : 'none' }}>
                                      <div style={{ fontWeight: 800, color: C.acc, marginBottom: 4 }}>{loc.name || `Site ${idx+1}`}</div>
                                      <div style={{ display:"flex", gap:10 }}><span style={{color:C.txtS, width:75}}>Street:</span><span>{loc.address || "—"}</span></div>
                                      <div style={{ display:"flex", gap:10 }}><span style={{color:C.txtS, width:75}}>City:</span><span>{loc.city || "—"}</span></div>
                                      <div style={{ display:"flex", gap:10 }}><span style={{color:C.txtS, width:75}}>State:</span><span>{loc.state || "—"}</span></div>
                                      <div style={{ display:"flex", gap:10 }}><span style={{color:C.txtS, width:75}}>Zip:</span><span>{loc.zip || "—"}</span></div>
                                    </div>
                                  ))}
                                </div>
                              );
                            }
                            return (!(selLead.address1 || selLead.street) && !selLead.city && !selLead.state && !(selLead.zip || selLead.zipcode) && !selLead.jobSite) ? (
                              <div style={{ color:C.txtS, fontStyle:"italic" }}>No address entered</div>
                            ) : (
                              <div style={{display:"flex", flexDirection:"column", gap:8}}>
                                <div style={{display:"flex", gap:10}}><span style={{color:C.txtS, width:75}}>Location:</span><span>{selLead.jobSite || "—"}</span></div>
                                <div style={{display:"flex", gap:10}}><span style={{color:C.txtS, width:75}}>Street:</span><span>{selLead.address1 || selLead.street || "—"}</span></div>
                                <div style={{display:"flex", gap:10}}><span style={{color:C.txtS, width:75}}>City:</span><span>{selLead.city || "—"}</span></div>
                                <div style={{display:"flex", gap:10}}><span style={{color:C.txtS, width:75}}>State:</span><span>{selLead.state || "—"}</span></div>
                                <div style={{display:"flex", gap:10}}><span style={{color:C.txtS, width:75}}>Zip:</span><span>{selLead.zip || selLead.zipcode || "—"}</span></div>
                              </div>
                            );
                          })()}
                        </div>
                      </div>
                    </div>

                    <div>
                      <div style={{ fontSize:16, fontWeight:900, color:C.txt, marginBottom:10, textTransform:"uppercase", letterSpacing:1 }}>Lead Description</div>
                      <div style={{ background:"#fffbeb", padding:30, borderRadius:20, border:`1px solid #fef3c7`, fontSize:16, color:C.txtM, lineHeight:1.8, minHeight:200, whiteSpace:"pre-wrap" }}>{selLead.desc || selLead.description || selLead.jobDesc || "No description provided."}</div>

                      <div style={{ marginTop: 45 }}>
                        <Sec c="Authorized Personnel Directory"/>
                        <div style={{ display:"flex", flexDirection:"column", gap:15, marginTop:20, marginBottom:50 }}>
                          {(() => {
                            const contacts = (custData && selLead.customer_name && custData[selLead.customer_name]?.contacts) || [];
                            return contacts.length > 0 ? contacts.map((con, idx) => (
                              <div key={idx} style={{ padding:25, border:`1px solid ${con.primary?C.grnBdr:C.bdr}`, borderRadius:18, background:con.primary?"#f0fdf4":"#fff", boxShadow:con.primary?"0 5px 15px rgba(34,197,94,0.05)":"none" }}>
                                 <div style={{ display:"flex", justifyContent:"space-between", marginBottom:15 }}>
                                    <div style={{ fontSize:18, fontWeight:900, color:C.txt }}>{con.name}</div>
                                    {con.primary && <span style={{ fontSize:9, background:C.grn, color:"#fff", borderRadius:8, padding:"3px 10px", fontWeight:900 }}>PRIMARY</span>}
                                 </div>
                                 <div style={{ fontSize:13, display:"flex", flexDirection:"column", gap:6 }}>
                                    <div><span style={{ color:C.txtS, fontWeight:700, marginRight:8 }}>TITLE:</span> {con.title || "—"}</div>
                                    <div style={{ color:C.acc, fontWeight:800 }}>{con.email?.toLowerCase() || "—"}</div>
                                    <div><span style={{ color:C.txtS, fontWeight:700, marginRight:8 }}>DIRECT:</span> {con.phone || con.mobile || "—"}</div>
                                 </div>
                              </div>
                            )) : (
                              <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
                                {selLead.contact_email && <div style={{ padding:25, border:`1px solid ${C.bdr}`, borderRadius:18, background:"#fff" }}>
                                  <div style={{ fontSize:18, fontWeight:900, color:C.txt, marginBottom:10 }}>{selLead.first_name} {selLead.last_name}</div>
                                  <div style={{ fontSize:13, display:"flex", flexDirection:"column", gap:6 }}>
                                    <div style={{ color:C.acc, fontWeight:800 }}>{selLead.contact_email.toLowerCase()}</div>
                                    <div><span style={{ color:C.txtS, fontWeight:700, marginRight:8 }}>DIRECT:</span> {selLead.contact_phone || "—"}</div>
                                  </div>
                                </div>}
                                <div style={{ padding:30, textAlign:"center", background:C.bg, borderRadius:20, color:C.txtS, fontSize:13 }}>No other active contact records for this company.</div>
                              </div>
                            );
                          })()}
                        </div>
                      </div>
                    </div>
                  </div>
                 </div>
               </div>
              )
            ) : (
               <div style={{ flex:1, display:"flex", alignItems:"center", justifyContent:"center", height:"100%", color:C.txtM, fontSize:15, flexDirection:"column", gap:10, padding:40, textAlign:"center" }}>
                 <div style={{ fontSize:40 }}>👤</div>
                 No lead selected.<br/>Select a lead from the left list to view details.
               </div>
            )}
          </div>
          )}
        </div>
        
        <style>{`
          @media (max-width: 1050px) {
            .app-split-layout { grid-template-columns: 1fr !important; }
            ${selLead ? '.leads-left-col { display: none !important; }' : '.leads-right-col { display: none !important; }'}
          }
          @media (min-width: 1051px) {
            .mobile-only-return-btn { display: none !important; }
          }
        `}</style>
      </div>
    </div>
  );
};

export default LeadsBoard;
