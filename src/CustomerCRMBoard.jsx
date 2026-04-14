import React, { useState, useRef, useEffect, useMemo } from 'react';

function useTableSort(items) {
  const [sortKey, setSortKey] = useState(null);
  const [sortDir, setSortDir] = useState(1);
  const requestSort = (key) => {
    if (sortKey === key) setSortDir(-sortDir);
    else { setSortKey(key); setSortDir(1); }
  };
  const sortedItems = useMemo(() => {
    if (!sortKey) return items;
    return [...items].sort((a,b) => {
      let v1 = typeof sortKey === 'function' ? sortKey(a) : a[sortKey];
      let v2 = typeof sortKey === 'function' ? sortKey(b) : b[sortKey];
      const clean = v => {
        if(typeof v === 'string') {
          if (/^[\$]?[0-9,]+(\.[0-9]+)?%?(\s*(days|hrs|m|w))?$/.test(v.trim().toLowerCase())) return Number(v.replace(/[^0-9.-]/g, ''));
          return v.toLowerCase();
        }
        return v;
      };
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

const CustomerCRMBoard = (props) => {
  const { 
    C, fmt, mkBtn, Badge, Sec, Lbl, Card, thS, tdS, inp, sel,
    view, setView, token, setToken, role, setRole, actBtns,
    customers, custData, setCustData, CUSTOMERS,
    selC, setSelC, custView, setCustView, search, setSearch, wonOnly, setWonOnly, custFilter, setCustFilter,
    jobs, reqs, jobFolders, 
    showCustModal, setShowCustModal, adjModal, setAdjModal, showSearchModal, setShowSearchModal,
    showRM, setShowRM, setEditR, editR, saveReq, saveAdjustment, saveJobFolder,
    showJFM, setShowJFM, deadModal, setDeadModal,
    profileTemplate, showProfileTempl, setShowProfileTempl,
    openEdit, openNew, liftTonThreshold, globalCheck, setGlobalCheck, appUsers
  } = props;

  const [gridScroll, setGridScroll] = useState(0);
  const [showSummaryBoard, setShowSummaryBoard] = useState(false);
  const gridRef = useRef(null);

  // Modals...
  const Header = props.Header;
  const RFQModal = props.RFQModal;
  const CompanySummaryModal = props.CompanySummaryModal;
  const JobFolderModal = props.JobFolderModal;
  const MarkDeadModal = props.MarkDeadModal;
  const CustomerModal = props.CustomerModal;
  const SearchResultsModal = props.SearchResultsModal;
  const SalesAdjustmentModal = props.SalesAdjustmentModal;
  const ProfileTemplateModal = props.ProfileTemplateModal;

  const currentSelectionData = selC ? custData[selC] : null;
  const contacts = currentSelectionData?.contacts || [];

  const { sortedItems: sortedCustomers, requestSort, sortKey, sortDir } = useTableSort(customers.filter(c=>(!search||c.name.toLowerCase().includes(search.toLowerCase()))&&(custFilter==="all"||(custFilter==="prospects"?c.isProspect:!c.isProspect))));

  // RESTORE SCROLL POSITION WITH ROBUST TIMING
  useEffect(() => {
    if (gridRef.current) {
      const timer = setTimeout(() => {
        if (gridRef.current) {
          gridRef.current.scrollTop = gridScroll;
        }
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [custView]);

  const toggleView = (v) => {
    if (v === "card") setSelC(null);
    setCustView(v);
  };

  useEffect(() => {
    if (!selC && sortedCustomers.length > 0 && custView === "list") {
      setSelC(sortedCustomers[0].name);
    }
  }, [selC, sortedCustomers, setSelC, custView]);

  return (
    <div style={{ minHeight:"100vh", background:C.bg, color:C.txt, fontFamily:"'Segoe UI','Helvetica Neue',Arial,sans-serif", fontSize:14 }}>
      {adjModal && <SalesAdjustmentModal quote={adjModal} onSave={saveAdjustment} onClose={()=>setAdjModal(null)}/>}
      {showRM && <RFQModal init={editR} onSave={saveReq} appUsers={appUsers} custData={custData} setCustData={setCustData} quotes={jobs} onClose={()=>{setShowRM(false);setEditR(null);}}/>}
      {showJFM && <JobFolderModal rfq={showJFM} folder={jobFolders[showJFM.id]} globalChecklist={globalCheck} onUpdateGlobalChecklist={setGlobalCheck} onSave={saveJobFolder} onMarkDead={r=>{ setDeadModal({type:"rfq",item:r}); setShowJFM(null); }} onUpdateRfq={r=>props.setReqs(p=>p.map(x=>x.id===r.id?r:x))} onCreateEstimate={r=>{setShowJFM(null);openNew(r);}} appUsers={appUsers} linkedQuote={jobs.find(q=>q.fromReqId===showJFM?.id)||null} liftTonThreshold={liftTonThreshold} onClose={()=>setShowJFM(null)}/>}
      {deadModal && <MarkDeadModal itemType={deadModal.type==="rfq"?"RFQ":"Quote"} itemLabel={deadModal.type==="rfq"?deadModal.item.rn+" · "+deadModal.item.company:deadModal.item.qn+" · "+deadModal.item.client} onConfirm={note=>{ if(deadModal.type==="rfq") props.setReqs(p=>p.map(x=>x.id===deadModal.item.id?{...x,status:"Dead",deadNote:note}:x)); else props.setQuotes(p=>p.map(x=>x.id===deadModal.item.id?{...x,status:"Dead",deadNote:note}:x)); setDeadModal(null); }} onClose={()=>setDeadModal(null)} />}
      
      <Header customerCount={customers.length} reqCount={reqs.length} quoteCount={jobs.filter(q => q.quote_data || q.status === "Pending" || q.quote_number).length} jobCount={jobs.filter(q => q.is_master_job).length} token={token} role={role} view={view} setView={setView} setToken={setToken} setRole={setRole} extra={actBtns}/>
      
      {showCustModal ? (
        <CustomerModal custName={showCustModal} jobs={jobs.filter(q=>q.customer_name===showCustModal)} reqs={reqs} jobFolders={jobFolders} custData={custData} setCustData={setCustData} profileTemplate={profileTemplate} onOpenQuote={q=>{openEdit(q);}} onOpenJobFolder={r=>setShowJFM(r)} onClose={()=>setShowCustModal(false)}/>
      ) : (
      <div className="crm-main-container" style={{ padding:"14px", maxWidth: 1600, margin:"0 auto", width:"100%" }}>
        
        {/* CRM CONTROLS PANEL (STICKY) */}
        <div style={{ position:"sticky", top:0, zIndex:10, background:"#fff", padding:"10px 0 20px 0", borderBottom:`2px solid ${C.accL}` }}>
          <div style={{ display:"flex", alignItems:"flex-end", gap:16, flexWrap:"wrap", maxWidth:1280, margin:"0 auto" }}>
            <div style={{ flex:1 }}>
               <Lbl c="CUSTOMER DIRECT SEARCH"/><input style={{ ...inp, width:"100%", minHeight:42, border:`2px solid ${C.acc}`, borderRadius:10, padding:"0 15px", boxSizing:"border-box" }} placeholder="Search for a customer name..." value={search} onChange={e=>setSearch(e.target.value)}/>
            </div>
            <div style={{ display:"flex", flexDirection:"column" }}>
              <Lbl c="VIEW MODE" />
              <div style={{ display:"flex", background:C.bg, borderRadius:10, padding:4, border:`1px solid ${C.bdr}` }}>
                <button 
                  onClick={() => toggleView("card")} 
                  style={{ background: custView === "card" ? "#fff" : "transparent", color: custView === "card" ? C.acc : C.txtM, border:"none", borderRadius:6, padding:"8px 16px", fontSize:13, fontWeight:700, cursor:"pointer", boxShadow: custView === "card" ? "0 2px 5px rgba(0,0,0,0.05)" : "none", transition:"all 0.2s" }}
                >
                  <span style={{ marginRight:6 }}>🗂️</span> Grid
                </button>
                <button 
                  onClick={() => toggleView("list")} 
                  style={{ background: custView === "list" ? "#fff" : "transparent", color: custView === "list" ? C.acc : C.txtM, border:"none", borderRadius:6, padding:"8px 16px", fontSize:13, fontWeight:700, cursor:"pointer", boxShadow: custView === "list" ? "0 2px 5px rgba(0,0,0,0.05)" : "none", transition:"all 0.2s" }}
                >
                  <span style={{ marginRight:6 }}>📋</span> List
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* VIEW MODE RENDERER: SPLIT SCREEN OR FULL GRID */}
        <div ref={gridRef} className={custView === "list" ? "app-split-layout" : ""} style={{ display: custView === "list" ? "grid" : "block", gridTemplateColumns: custView === "list" ? "420px 1fr" : "none", gap:30, marginTop: 15, alignItems:"flex-start" }}>
          
          {/* LEFT: LIST VIEW / CARDS */}
          {(!selC || custView === "list") && (
          <div style={{ background: custView === "list" ? "#fff" : "transparent", border: custView === "list" ? `1px solid ${C.bdrL}` : "none", borderRadius:20, overflow:"hidden", display:"flex", flexDirection:"column", height: custView === "list" ? "calc(100vh - 160px)" : "auto" }}>
            <div style={{ overflowY:"auto", flex:1, padding: custView === "list" ? 15 : 0 }}>
              {custView === "list" ? (
                <div className="app-table-wrap">
                  <table style={{ width:"100%", borderCollapse:"collapse" }}>
                    <thead>
                      <tr>
                        <SortTh style={thS} label="Customer Name" sortKey="name" currentSort={sortKey} currentDir={sortDir} requestSort={requestSort} />
                        <SortTh className="mobile-hidden" style={{ ...thS, textAlign:"center" }} label="Master Jobs" sortKey={(c) => (c.quotes||[]).length} currentSort={sortKey} currentDir={sortDir} requestSort={requestSort} />
                      </tr>
                    </thead>
                    <tbody>
                      {sortedCustomers.map(c => {
                        const custJobs = c.quotes || []; 
                        const isSel = selC === c.name;
                        return (
                          <tr key={c.name} style={{ background: isSel ? C.accL : "transparent", cursor:"pointer", transition:"0.2s", borderBottom:`1px solid ${C.bdr}` }} onClick={()=>{ setSelC(c.name); }}>
                            <td style={{ ...tdS, fontWeight:800, fontSize:15, color:C.txt, paddingTop:12, paddingBottom:12 }}>
                              {c.name}
                            </td>
                            <td className="mobile-hidden" style={{ ...tdS, textAlign:"center", fontWeight:700, fontSize:14 }}>{custJobs.length}</td>
                          </tr>
                        );
                      })}
                      {sortedCustomers.length === 0 && (
                        <tr>
                          <td colSpan={2} style={{ padding:40, textAlign:"center", color:C.txtM, fontSize:14 }}>No customers found.</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill, minmax(320px, 1fr))", gap:15 }}>
                  {sortedCustomers.map(c => {
                    const custJobs = c.quotes || []; 
                    const tot = custJobs.reduce((s,q)=>s+(parseFloat(q.total_billings)||0),0);
                    return (
                      <Card key={c.name} style={{ cursor:"pointer", padding:20, borderRadius:16, transition:"0.2s", background: "#fff", border: `1px solid ${C.bdr}` }} onClick={()=>{ setSelC(c.name); }}>
                        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:10 }}>
                          <div style={{ fontWeight:900, fontSize:16, color: C.txt }}>
                            {c.name}
                          </div>
                          {c.isProspect ? <span style={{ background:"#fffbeb", color:"#b45309", border:"1px solid #fde68a", borderRadius:6, padding:"2px 6px", fontSize:10, fontWeight:800 }}>PROSPECT</span> : <span style={{ background:C.grnB, color:C.grn, border:`1px solid ${C.grnBdr}`, borderRadius:6, padding:"2px 6px", fontSize:10, fontWeight:800 }}>CUSTOMER</span>}
                        </div>
                        <div style={{ fontSize:18, fontWeight:900, color:C.acc, marginBottom:10 }}>{fmt(tot)}</div>
                        <div style={{ display:"flex", gap:15, borderTop:`1px solid ${C.bdr}`, paddingTop:10 }}>
                          <div><div style={{fontSize:9, fontWeight:900, color:C.txtS}}>MASTER JOBS</div><div style={{fontSize:14, fontWeight:800}}>{custJobs.length}</div></div>
                        </div>
                      </Card>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
          )}

          {/* RIGHT: DETAILS VIEW */}
          {(selC || custView === "list") && (
          <div style={{ background:"#fff", borderRadius:20, boxShadow:"0 5px 25px rgba(0,0,0,0.03)", border:`1px solid ${C.bdrL}`, height:"calc(100vh - 160px)", overflowY:"auto" }}>
            {selC ? (
               <div style={{ flex:1, padding:"30px 40px", background:"#fff" }}>
                 {custView === "card" && (
                   <div style={{ marginBottom: 20 }}>
                     <button style={{ ...mkBtn("outline"), padding: "8px 16px", borderRadius: 8, fontSize: 13, borderColor: C.bdr, color: C.txtM, background: "#fff" }} onClick={() => setSelC(null)}>
                       ← Back to Grid
                     </button>
                   </div>
                 )}
                 <div style={{ maxWidth:950, margin:"0 auto" }}>
                  <div style={{ display:"flex", flexDirection:"column", gap:10, marginBottom:50, borderBottom:`4px solid ${C.accL}`, paddingBottom:35 }}>
                    <div style={{ display:"flex", gap:15, alignItems:"flex-start", justifyContent:"flex-end" }}>
                      <div style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:4 }}>
                        <button 
                          style={{ ...mkBtn("ghost"), padding:"16px 25px", borderRadius:14, fontSize:15, border:`2px solid ${C.blu}`, color:C.blu, fontWeight:800, opacity:jobs.filter(q => q.customer_num === currentSelectionData?.customer_num).length === 0 ? 0.75 : 1, cursor: jobs.filter(q => q.customer_num === currentSelectionData?.customer_num).length === 0 ? "not-allowed" : "pointer" }} 
                          disabled={jobs.filter(q => q.customer_num === currentSelectionData?.customer_num).length === 0}
                          onClick={()=>{ 
                            props.setJobListFilter(selC);
                            setView("jobs"); 
                          }}
                        >📊 Job List ({jobs.filter(q => q.client === currentSelectionData?.name && q.job_number).length})</button>
                        <div style={{ height:15, display:"flex", alignItems:"center", justifyContent:"center" }}>
                          {jobs.filter(q => q.client === currentSelectionData?.name && q.job_number).length === 0 && (
                            <div className="mobile-hidden" style={{ fontSize:10, color:C.red, fontWeight:900, textTransform:"uppercase", letterSpacing:0.8 }}>No historical data exists for this account</div>
                          )}
                        </div>
                      </div>
                      <div style={{ display:"flex", flexDirection:"column", alignItems:"flex-end", gap:8 }}>
                        <button className="edit-profile-btn" style={{ ...mkBtn("primary"), padding:"16px 25px", borderRadius:14, fontSize:15 }} onClick={()=>setShowCustModal(selC)}>Edit Company Profile</button>
                        {currentSelectionData?.company_summary && (
                          <button onClick={() => setShowSummaryBoard(true)} style={{ background:"#f5f6f8", color:"#4a5060", border:"1px solid #e2e5ea", borderRadius:8, padding:"8px 14px", fontSize:12, fontWeight:700, cursor:"pointer", transition:"0.2s" }}>
                            COMPANY SUMMARY
                          </button>
                        )}
                        {showSummaryBoard && currentSelectionData?.company_summary && CompanySummaryModal && (
                          <CompanySummaryModal custName={currentSelectionData.name} summary={currentSelectionData.company_summary} onClose={() => setShowSummaryBoard(false)} />
                        )}
                      </div>
                    </div>

                    <div>
                      <div style={{ fontSize:44, fontWeight:900, color:C.txt, letterSpacing:"-1px", lineHeight:1 }}>{selC}</div>
                      <div style={{ display:"flex", gap:20, marginTop:18 }}>
                        <div style={{ fontSize:13, color:C.txtS, fontWeight:800, textTransform:"uppercase", background:C.bg, padding:"5px 12px", borderRadius:8 }}>{currentSelectionData?.industry || "Industrial Sector"}</div>
                        <div style={{ fontSize:13, color:C.ora, fontWeight:800, background:"#fff7ed", padding:"5px 12px", borderRadius:8 }}>PAYMENT TERMS: {currentSelectionData?.paymentTerms || "Net 30"}</div>
                      </div>
                    </div>
                  </div>

                  <div className="app-two-col" style={{ gap:60 }}>
                    <div style={{ display:"flex", flexDirection:"column", gap:45 }}>
                      <div>
                        <Sec c="Master Billing Address"/>
                        <div style={{ background:C.bg, padding:30, borderRadius:20, marginTop:15, fontSize:15, fontWeight:600, color:C.txt, lineHeight:1.7, border:`1px solid ${C.bdrL}`, boxShadow:"inset 0 2px 4px rgba(0,0,0,0.02)" }}>
                          <div style={{display:"flex", flexDirection:"column", gap:8}}>
                            <div style={{display:"flex", gap:10}}><span style={{color:C.txtS, width:75}}>Street:</span><span>{currentSelectionData?.address1 || "—"}</span></div>
                            <div style={{display:"flex", gap:10}}><span style={{color:C.txtS, width:75}}>City:</span><span>{currentSelectionData?.city || "—"}</span></div>
                            <div style={{display:"flex", gap:10}}><span style={{color:C.txtS, width:75}}>State:</span><span>{currentSelectionData?.state || "—"}</span></div>
                            <div style={{display:"flex", gap:10}}><span style={{color:C.txtS, width:75}}>Zip:</span><span>{currentSelectionData?.zip || "—"}</span></div>
                          </div>
                        </div>
                      </div>
                      <div>
                        {(() => {
                           let site = currentSelectionData?.website;
                           if (!site && currentSelectionData?.company_summary) {
                             const match = currentSelectionData.company_summary.match(/(?:website|domain|url|site)[\s*:-]+(https?:\/\/[^\s)<\]]+|www\.[^\s)<\]]+|[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/i);
                             if (match) site = match[1].replace(/[.,;*\\/]+$/, '');
                             else {
                               const fb = currentSelectionData.company_summary.match(/(https?:\/\/[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/i);
                               if (fb) site = fb[1].replace(/[.,;*\\/]+$/, '');
                             }
                           }
                           return (
                             <>
                              <Sec c="Official Company Domain"/>
                              {site ? (
                                <a href={site.startsWith("http")?site:`https://${site}`} target="_blank" rel="noreferrer" style={{ display:"flex", alignItems:"center", gap:12, background:C.accL, color:C.acc, padding:25, borderRadius:20, marginTop:15, fontSize:16, fontWeight:800, textDecoration:"none", border:`1px solid ${C.accL}` }}>
                                  <span style={{ fontSize:22 }}>🌐</span> {site}
                                </a>
                              ) : <div style={{ color:C.txtS, fontSize:15, marginTop:15, background:C.bg, padding:25, borderRadius:20 }}>No web domain recorded.</div>}
                             </>
                           );
                        })()}
                      </div>
                      <div>
                        <Sec c="Executive Internal Management Notes"/>
                        <div style={{ background:"#fffbeb", padding:30, borderRadius:20, border:`1px solid #fef3c7`, fontSize:16, color:C.txtM, lineHeight:1.8, minHeight:200, whiteSpace:"pre-wrap" }}>{currentSelectionData?.notes || "No internal executive management notes recorded for this entity."}</div>
                      </div>
                    </div>

                    <div>
                      <Sec c="Authorized Personnel Directory"/>
                      <div style={{ display:"flex", flexDirection:"column", gap:15, marginTop:20, marginBottom:50 }}>
                        {contacts.length > 0 ? contacts.map((con, idx) => (
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
                        )) : <div style={{ padding:30, textAlign:"center", background:C.bg, borderRadius:20, color:C.txtS, fontSize:13 }}>No active contact records.</div>}
                      </div>

                      <Sec c="Master Transaction History"/>
                      <div style={{ display:"flex", flexDirection:"column", gap:10, marginTop:15 }}>
                        {jobs.filter(q => q.client === currentSelectionData?.name && q.job_number).slice(0, 50).map((q, idx) => (
                           <div key={idx} style={{ padding:18, border:`1px solid ${C.bdrL}`, borderRadius:14, background:"#fff", display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                              <div style={{ flex:1 }}>
                                 <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                                    <div style={{ fontSize:10, fontWeight:900, color:C.acc }}>QUOTE #: {q.quote_number || q.qn}</div>
                                    <div style={{ fontSize:9, background:C.accL, color:C.acc, padding:"2px 8px", borderRadius:6, fontWeight:800 }}>ID: # {q.customer_num}</div>
                                 </div>
                                 <div style={{ fontSize:14, fontWeight:700, color:C.txtM, marginTop:3 }}>{q.job_description}</div>
                              </div>
                              <div style={{ textAlign:"right" }}>
                                 <div style={{ fontSize:15, fontWeight:800, color:C.txt }}>{fmt(q.total_billings)}</div>
                                 <div style={{ fontSize:10, color:C.txtS, fontWeight:700 }}>{q.start_date ? new Date(q.start_date).toLocaleDateString() : "Historical"}</div>
                              </div>
                           </div>
                        ))}
                        {jobs.filter(q => q.client === currentSelectionData?.name && q.job_number).length === 0 && <div style={{ padding:30, textAlign:"center", background:C.bg, borderRadius:20, color:C.txtS, fontSize:13 }}>No historical job transactions found.</div>}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
               <div style={{ flex:1, display:"flex", alignItems:"center", justifyContent:"center", height:"100%", color:C.txtM, fontSize:15, flexDirection:"column", gap:10, padding:40, textAlign:"center" }}>
                 <div style={{ fontSize:40 }}>👤</div>
                 No customer selected.<br/>Select an account from the left list to view their executive dossier!
               </div>
            )}
          </div>
          )}
        </div>

        <div className="mobile-only-return-btn" style={{ marginTop: 40, textAlign: "center" }}>
          <button style={{ ...mkBtn("outline"), padding: "18px 40px", fontSize: 18, width: "100%", maxWidth: 450, margin: "0 auto", background: "#fff", borderRadius:18, fontWeight:800, boxShadow:"0 5px 15px rgba(0,0,0,0.05)" }} onClick={() => setView("dash")}>← Return to Executive Dashboard</button>
        </div>
        <style>{`
          @media (min-width: 951px) {
            .mobile-only-return-btn { display: none !important; }
          }
          @media (max-width: 1050px) {
            .app-split-layout { grid-template-columns: 1fr !important; }
            .mobile-hidden { display: none !important; }
            .edit-profile-btn { padding: 10px 16px !important; font-size: 13px !important; border-radius: 10px !important; }
          }
        `}</style>
      </div>
      )}
    </div>
  );
};

export default CustomerCRMBoard;
