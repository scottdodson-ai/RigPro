import React, { useState, useRef, useEffect } from 'react';

const CustomerCRMBoard = (props) => {
  const { 
    C, fmt, mkBtn, Badge, Sec, Lbl, Card, thS, tdS, inp, sel,
    view, setView, token, setToken, role, setRole, actBtns,
    customers, custData, setCustData, CUSTOMERS,
    selC, setSelC, custView, setCustView, search, setSearch, wonOnly, setWonOnly, custFilter, setCustFilter,
    quotes, reqs, jobFolders, 
    showCustModal, setShowCustModal, adjModal, setAdjModal, showSearchModal, setShowSearchModal,
    showRM, setShowRM, setEditR, editR, saveReq, saveAdjustment, saveJobFolder,
    showJFM, setShowJFM, deadModal, setDeadModal,
    profileTemplate, showProfileTempl, setShowProfileTempl,
    openEdit, openNew, liftTonThreshold, globalCheck, setGlobalCheck, appUsers
  } = props;

  const [gridScroll, setGridScroll] = useState(0);
  const gridRef = useRef(null);

  // Modals...
  const Header = props.Header;
  const RFQModal = props.RFQModal;
  const JobFolderModal = props.JobFolderModal;
  const MarkDeadModal = props.MarkDeadModal;
  const CustomerModal = props.CustomerModal;
  const SearchResultsModal = props.SearchResultsModal;
  const SalesAdjustmentModal = props.SalesAdjustmentModal;
  const ProfileTemplateModal = props.ProfileTemplateModal;

  const currentSelectionData = selC ? custData[selC] : null;
  const contacts = currentSelectionData?.contacts || [];

  // RESTORE SCROLL POSITION WITH ROBUST TIMING
  useEffect(() => {
    if (custView === "card" && gridRef.current) {
      const timer = setTimeout(() => {
        if (gridRef.current) {
          gridRef.current.scrollTop = gridScroll;
          console.log("Restored scroll position to:", gridScroll);
        }
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [custView]);

  return (
    <div style={{ minHeight:"100vh", background:C.bg, color:C.txt, fontFamily:"'Segoe UI','Helvetica Neue',Arial,sans-serif", fontSize:14 }}>
      {adjModal && <SalesAdjustmentModal quote={adjModal} onSave={saveAdjustment} onClose={()=>setAdjModal(null)}/>}
      {showCustModal && <CustomerModal custName={showCustModal} quotes={quotes.filter(q=>q.client===showCustModal)} reqs={reqs} jobFolders={jobFolders} custData={custData} setCustData={setCustData} profileTemplate={profileTemplate} onOpenQuote={q=>{openEdit(q);}} onOpenJobFolder={r=>setShowJFM(r)} onClose={()=>setShowCustModal(false)}/>}
      {showSearchModal && <SearchResultsModal search={search} quotes={quotes} reqs={reqs} custData={custData} onClose={()=>setShowSearchModal(false)} onOpenQuote={openEdit} onOpenReq={r=>{setEditR(r);setShowRM(true);}} onOpenCust={setSelC}/>}
      {showRM && <RFQModal init={editR} onSave={saveReq} appUsers={appUsers} custData={custData} setCustData={setCustData} quotes={quotes} onClose={()=>{setShowRM(false);setEditR(null);}}/>}
      {showJFM && <JobFolderModal rfq={showJFM} folder={jobFolders[showJFM.id]} globalChecklist={globalCheck} onUpdateGlobalChecklist={setGlobalCheck} onSave={saveJobFolder} onMarkDead={r=>{ setDeadModal({type:"rfq",item:r}); setShowJFM(null); }} onUpdateRfq={r=>props.setReqs(p=>p.map(x=>x.id===r.id?r:x))} onCreateEstimate={r=>{setShowJFM(null);openNew(r);}} appUsers={appUsers} linkedQuote={quotes.find(q=>q.fromReqId===showJFM?.id)||null} liftTonThreshold={liftTonThreshold} onClose={()=>setShowJFM(null)}/>}
      {deadModal && <MarkDeadModal itemType={deadModal.type==="rfq"?"RFQ":"Quote"} itemLabel={deadModal.type==="rfq"?deadModal.item.rn+" · "+deadModal.item.company:deadModal.item.qn+" · "+deadModal.item.client} onConfirm={note=>{ if(deadModal.type==="rfq") props.setReqs(p=>p.map(x=>x.id===deadModal.item.id?{...x,status:"Dead",deadNote:note}:x)); else props.setQuotes(p=>p.map(x=>x.id===deadModal.item.id?{...x,status:"Dead",deadNote:note}:x)); setDeadModal(null); }} onClose={()=>setDeadModal(null)} />}
      
      <Header token={token} role={role} view={view} setView={setView} setToken={setToken} setRole={setRole} extra={actBtns}/>
      
      <div style={{ padding:"14px", maxWidth:1280, margin:"0 auto" }}>
        
        {/* CRM CONTROLS PANEL */}
        <div style={{ display:"flex", alignItems:"flex-end", gap:12, marginBottom:16, flexWrap:"wrap" }}>
          <div style={{ display:"flex", gap:1, background:C.acc, border:`1px solid ${C.acc}`, borderRadius:10, padding:3, height:42, boxSizing:"border-box" }}>
            <button style={{ background:custView==="card"?"#fff":"transparent", color:custView==="card"?C.acc:"#fff", border:"none", padding:"0 18px", fontSize:12, fontWeight:800, borderRadius:8, cursor:"pointer", transition:"0.2s" }} onClick={()=>setCustView("card")}>Card View</button>
            <button style={{ background:custView==="list"?"#fff":"transparent", color:custView==="list"?C.acc:"#fff", border:"none", padding:"0 18px", fontSize:12, fontWeight:800, borderRadius:8, cursor:"pointer", transition:"0.2s" }} onClick={()=>setCustView("list")}>List View</button>
          </div>
          <div style={{ flex:1 }}>
             <Lbl c="CUSTOMER DIRECT SEARCH"/><input style={{ ...inp, width:"100%", minHeight:42, border:`2px solid ${C.acc}`, borderRadius:10, padding:"0 15px", boxSizing:"border-box" }} placeholder="Search for a customer name..." value={search} onChange={e=>setSearch(e.target.value)}/>
          </div>
        </div>

        {custView === "list" ? (
          /* CRM LIST VIEW: SIDEBAR + DETAIL */
          <div style={{ background:"#fff", border:`1px solid ${C.bdr}`, borderRadius:16, height:"78vh", minHeight:650, overflow:"hidden", display:"flex", boxShadow:"0 20px 60px rgba(0,0,0,0.08)" }}>
            
            {/* SIDEBAR DIRECTORY */}
            <div style={{ width:340, borderRight:`1px solid ${C.bdr}`, background:"#f8fafc", display:"flex", flexDirection:"column" }}>
              <div style={{ padding:"22px 25px", background:"#fff", borderBottom:`1px solid ${C.bdr}`, display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                <div style={{ fontSize:11, fontWeight:900, color:C.acc, letterSpacing:1.5 }}>CUSTOMERS</div>
                <div style={{ background:C.acc, color:"#fff", borderRadius:12, padding:"3px 12px", fontSize:11, fontWeight:900 }}>{customers.length}</div>
              </div>
              <div style={{ flex:1, overflowY:"auto" }}>
                {customers.filter(c => !search || c.name.toLowerCase().includes(search.toLowerCase())).map(c => (
                  <div key={c.name} onClick={()=>setSelC(c.name)} style={{ padding:"18px 25px", cursor:"pointer", borderBottom:`1px solid ${C.bdrL}`, background:selC===c.name?C.accL:"transparent", borderLeft:selC===c.name?`6px solid ${C.acc}`:"6px solid transparent", transition:"0.15s" }}>
                    <div style={{ fontSize:14, fontWeight:selC===c.name?800:600, color:selC===c.name?C.acc:C.txt }}>{c.name}</div>
                    <div style={{ fontSize:10, color:C.txtS, fontWeight:700, marginTop:4, opacity:0.6 }}>ACCOUNT ID: {custData[c.name]?.accountNum || "PENDING"}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* PROFILE DETAIL PANEL */}
            <div style={{ flex:1, overflowY:"auto", padding:60, background:"#fff" }}>
              {selC ? (
                <div style={{ maxWidth:950, margin:"0 auto" }}>
                  <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:50, borderBottom:`4px solid ${C.accL}`, paddingBottom:35 }}>
                    <div>
                      <div style={{ fontSize:11, fontWeight:900, color:C.acc, letterSpacing:2, marginBottom:12 }}>MASTER DATA PROFILE</div>
                      <div style={{ fontSize:44, fontWeight:900, color:C.txt, letterSpacing:"-1px", lineHeight:1 }}>{selC}</div>
                      <div style={{ display:"flex", gap:20, marginTop:18 }}>
                        <div style={{ fontSize:13, color:C.txtS, fontWeight:800, textTransform:"uppercase", background:C.bg, padding:"5px 12px", borderRadius:8 }}>{currentSelectionData?.industry || "Industrial Sector"}</div>
                        <div style={{ fontSize:13, color:C.ora, fontWeight:800, background:"#fff7ed", padding:"5px 12px", borderRadius:8 }}>PAYMENT TERMS: {currentSelectionData?.paymentTerms || "Net 30"}</div>
                      </div>
                    </div>
                    <div style={{ display:"flex", gap:15, alignItems:"center" }}>
                      <button style={{ ...mkBtn("outline"), padding:"16px 25px", borderRadius:14, fontSize:15, border:`2px solid ${C.acc}`, color:C.acc, fontWeight:800 }} onClick={()=>{ setCustView("card"); }}>← Return to Search Grid</button>
                      <button style={{ ...mkBtn("primary"), padding:"16px 40px", borderRadius:14, fontSize:16 }} onClick={()=>setShowCustModal(selC)}>Edit Corporate Profile</button>
                    </div>
                  </div>

                  <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:60 }}>
                    <div style={{ display:"flex", flexDirection:"column", gap:45 }}>
                      <div>
                        <Sec c="Master Billing Address"/>
                        <div style={{ background:C.bg, padding:30, borderRadius:20, marginTop:15, fontSize:17, fontWeight:600, color:C.txt, lineHeight:1.7, border:`1px solid ${C.bdrL}`, boxShadow:"inset 0 2px 4px rgba(0,0,0,0.02)" }}>{currentSelectionData?.billingAddr || "Detailed Address Pending Validation"}</div>
                      </div>
                      <div>
                        <Sec c="Official Corporate Domain"/>
                        {currentSelectionData?.website ? (
                          <a href={currentSelectionData.website.startsWith("http")?currentSelectionData.website:`https://${currentSelectionData.website}`} target="_blank" rel="noreferrer" style={{ display:"flex", alignItems:"center", gap:12, background:C.accL, color:C.acc, padding:25, borderRadius:20, marginTop:15, fontSize:16, fontWeight:800, textDecoration:"none", border:`1px solid ${C.accL}` }}>
                            <span style={{ fontSize:22 }}>🌐</span> {currentSelectionData.website}
                          </a>
                        ) : <div style={{ color:C.txtS, fontSize:15, marginTop:15, background:C.bg, padding:25, borderRadius:20 }}>No web domain recorded.</div>}
                      </div>
                      <div>
                        <Sec c="Executive Internal Management Notes"/>
                        <div style={{ background:"#fffbeb", padding:30, borderRadius:20, border:`1px solid #fef3c7`, fontSize:16, color:C.txtM, lineHeight:1.8, minHeight:200, whiteSpace:"pre-wrap" }}>{currentSelectionData?.notes || "No internal executive management notes recorded for this entity."}</div>
                      </div>
                    </div>

                    <div>
                      <Sec c="Authorized Personnel Directory"/>
                      <div style={{ display:"flex", flexDirection:"column", gap:15, marginTop:20 }}>
                        {contacts.length > 0 ? contacts.map((con, idx) => (
                          <div key={idx} style={{ padding:30, border:`1px solid ${con.primary?C.grnBdr:C.bdr}`, borderRadius:22, background:con.primary?"#f0fdf4":"#fff", boxShadow:con.primary?"0 10px 30px rgba(34,197,94,0.1)":"none", transition:"0.3s" }}>
                             <div style={{ display:"flex", justifyContent:"space-between", marginBottom:18 }}>
                                <div style={{ fontSize:20, fontWeight:900, color:C.txt, letterSpacing:"-0.3px" }}>{con.name}</div>
                                {con.primary && <span style={{ fontSize:10, background:C.grn, color:"#fff", borderRadius:10, padding:"5px 15px", fontWeight:900, letterSpacing:1 }}>PRIMARY CONTACT</span>}
                             </div>
                             <div style={{ display:"flex", flexDirection:"column", gap:12, borderTop:`1px solid ${C.bdrL}`, paddingTop:22 }}>
                                <div style={{ fontSize:15, display:"flex", gap:15 }}><span style={{ width:100, fontWeight:900, fontSize:11, color:C.txtS, textTransform:"uppercase", letterSpacing:0.5 }}>Official Title</span> <span style={{fontWeight:700}}>{con.title || "—"}</span></div>
                                <div style={{ fontSize:15, display:"flex", gap:15, color:C.blue }}><span style={{ width:100, fontWeight:900, fontSize:11, color:C.txtS, textTransform:"uppercase", letterSpacing:0.5 }}>Corporate Email</span> <span style={{fontWeight:700, borderBottom:`1.5px solid ${C.accL}`}}>{con.email?.toLowerCase() || "—"}</span></div>
                                <div style={{ fontSize:15, display:"flex", gap:15 }}><span style={{ width:100, fontWeight:900, fontSize:11, color:C.txtS, textTransform:"uppercase", letterSpacing:0.5 }}>Mobile Phone</span> <span style={{fontWeight:700}}>{con.mobile || "—"}</span></div>
                                <div style={{ fontSize:15, display:"flex", gap:15 }}><span style={{ width:100, fontWeight:900, fontSize:11, color:C.txtS, textTransform:"uppercase", letterSpacing:0.5 }}>Direct Phone</span> <span style={{fontWeight:700}}>{con.phone || "—"}</span></div>
                             </div>
                          </div>
                        )) : (
                          <div style={{ padding:60, textAlign:"center", background:C.bg, borderRadius:25, color:C.txtS, fontSize:16, border:`2px dashed ${C.bdr}` }}>
                            <div style={{ fontSize:50, marginBottom:20 }}>👥</div>
                            No authorized personnel records found in database.
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div style={{ height:"100%", display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", color:C.txtS, opacity:0.6 }}>
                  <div style={{ fontSize:120, marginBottom:30 }}>🏢</div>
                  <div style={{ fontSize:32, fontWeight:900, color:C.txt, letterSpacing:"-1px" }}>CUSTOMER MASTER DATABASE</div>
                  <div style={{ fontSize:18, marginTop:12 }}>Select a directory entry to initialize profile data visualization</div>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div ref={gridRef} style={{ 
            display:"grid", 
            gridTemplateColumns:"repeat(auto-fill,minmax(310px,1fr))", 
            gap:25, 
            height:"78vh", 
            minHeight:650, 
            overflowY:"auto", 
            padding:30, 
            background:"#f8fafc", 
            borderRadius:16, 
            border:`1px solid ${C.bdr}`,
            boxShadow:"inset 0 2px 10px rgba(0,0,0,0.02)"
          }}>
            {customers.filter(c=>(!search||c.name.toLowerCase().includes(search.toLowerCase()))&&(custFilter==="all"||(custFilter==="prospects"?c.isProspect:!c.isProspect))).map(c => {
              const won = c.quotes.filter(q=>q.status==="Won");
              const tot = wonOnly ? won.reduce((s,q)=>s+(q.total||0)+((q.salesAdjustments||[]).reduce((ss,a)=>ss+a.amount,0)),0) : c.quotes.reduce((s,q)=>s+(q.total||0),0);
              return (
                <Card key={c.name} style={{ cursor:"pointer", padding:25, borderRadius:20, transition:"0.2s", border: selC === c.name ? `2.5px solid ${C.acc}` : `1px solid ${C.bdrL}` }} onClick={()=>{ 
                  if (gridRef.current) setGridScroll(gridRef.current.scrollTop);
                  setSelC(c.name); 
                  setCustView("list"); 
                }}>
                  <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:12 }}>
                    <div style={{ fontWeight:900, fontSize:17 }}>{c.name}</div>
                    {c.isProspect ? <span style={{ background:"#fffbeb", color:"#b45309", border:"1px solid #fde68a", borderRadius:6, padding:"2px 8px", fontSize:11, fontWeight:800 }}>PROSPECT</span> : <span style={{ background:C.grnB, color:C.grn, border:`1px solid ${C.grnBdr}`, borderRadius:6, padding:"2px 8px", fontSize:11, fontWeight:800 }}>CUSTOMER</span>}
                  </div>
                  <div style={{ fontSize:22, fontWeight:900, color:C.acc, marginBottom:15 }}>{fmt(tot)}</div>
                  <div style={{ display:"flex", gap:20, borderTop:`1px solid ${C.bdrL}`, paddingTop:15 }}>
                    <div><div style={{fontSize:9, fontWeight:900, color:C.txtS}}>TOTAL QUOTES</div><div style={{fontSize:15, fontWeight:800}}>{c.quotes.length}</div></div>
                    <div><div style={{fontSize:9, fontWeight:900, color:C.txtS}}>WON JOBS</div><div style={{fontSize:15, fontWeight:800, color:C.grn}}>{won.length}</div></div>
                  </div>
                </Card>
              );
            })}
          </div>
        )}

        <div className="mobile-only-return-btn" style={{ marginTop: 40, textAlign: "center" }}>
          <button style={{ ...mkBtn("outline"), padding: "18px 40px", fontSize: 18, width: "100%", maxWidth: 450, margin: "0 auto", background: "#fff", borderRadius:18, fontWeight:800, boxShadow:"0 5px 15px rgba(0,0,0,0.05)" }} onClick={() => setView("dash")}>← Return to Executive Dashboard</button>
        </div>
        <style>{`
          @media (min-width: 951px) {
            .mobile-only-return-btn { display: none !important; }
          }
        `}</style>
      </div>
    </div>
  );
};

export default CustomerCRMBoard;
