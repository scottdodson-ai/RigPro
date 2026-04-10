import sys

with open('src/App.jsx', 'r') as f:
    text = f.read()

# 1. Inject CompanySummaryModal before MarkDeadModal
modal_code = """
function CompanySummaryModal({ custName, summary, onClose }) {
  const formatMD = (text) => {
    return text.split('\\n').map((line, i) => {
      if (!line.trim()) return <div key={i} style={{height:10}} />;
      if (line.startsWith('### ')) return <h3 key={i} style={{marginTop:20, marginBottom:8, color:"#1e3a8a", fontSize:20, fontWeight:900}}>{line.replace('### ', '')}</h3>;
      if (line.startsWith('#### ')) return <h4 key={i} style={{marginTop:18, marginBottom:8, color:"#1e40af", fontSize:16, fontWeight:800}}>{line.replace('#### ', '')}</h4>;
      if (line.startsWith('* ')) return <li key={i} style={{marginLeft:20, marginTop:5, color:"#475569", fontSize:14}}><span dangerouslySetInnerHTML={{__html: line.replace('* ', '').replace(/\\*\\*(.*?)\\*\\*/g, '<strong>$1</strong>')}} /></li>;
      return <p key={i} style={{marginTop:5, marginBottom:5, color:"#334155", lineHeight:1.7, fontSize:14}}><span dangerouslySetInnerHTML={{__html: line.replace(/\\*\\*(.*?)\\*\\*/g, '<strong>$1</strong>')}} /></p>;
    });
  };

  return (
    <div style={{ position:"fixed", inset:0, background:"rgba(15,23,42,0.75)", zIndex:9999, display:"flex", justifyContent:"center", alignItems:"center", padding:20 }}>
      <div style={{ background:"#fff", width:"100%", maxWidth:700, borderRadius:16, boxShadow:"0 25px 50px -12px rgba(0,0,0,0.25)", display:"flex", flexDirection:"column", maxHeight:"90vh", animation:"0.2s ease-out 0s 1 normal forwards running popIn" }}>
        <style>{`@keyframes popIn { 0%{opacity:0;transform:scale(0.95)} 100%{opacity:1;transform:scale(1)} }`}</style>
        <div style={{ padding:"20px 24px", borderBottom:"1px solid #e2e5ea", display:"flex", justifyContent:"space-between", alignItems:"center", background:"#f8fafc", borderRadius:"16px 16px 0 0" }}>
          <div>
            <div style={{ fontSize:12, fontWeight:800, color:"#64748b", textTransform:"uppercase", letterSpacing:1 }}>AI Intelligence Dossier</div>
            <div style={{ fontSize:22, fontWeight:900, color:"#0f172a", marginTop:2 }}>{custName}</div>
          </div>
          <button onClick={onClose} style={{ background:"#e2e8f0", color:"#475569", border:"none", borderRadius:8, width:32, height:32, display:"flex", alignItems:"center", justifyContent:"center", cursor:"pointer", transition:"0.2s" }}>
             <span style={{fontSize:20, lineHeight:1}}>×</span>
          </button>
        </div>
        <div style={{ padding:"24px 30px", overflowY:"auto", flex:1, whiteSpace:"normal" }}>
          {formatMD(summary)}
        </div>
        <div style={{ padding:"16px 24px", borderTop:"1px solid #e2e5ea", background:"#f8fafc", borderRadius:"0 0 16px 16px", display:"flex", justifyContent:"flex-end" }}>
           <button onClick={onClose} style={{ background:"#2563eb", color:"#fff", border:"none", borderRadius:8, padding:"10px 24px", fontSize:14, fontWeight:700, cursor:"pointer", boxShadow:"0 4px 6px -1px rgba(37,99,235,0.4)"}}>Acknowledge Briefing</button>
        </div>
      </div>
    </div>
  );
}

function MarkDeadModal"""

text = text.replace('function MarkDeadModal', modal_code)

# 2. Update CustomerModal inline rendering
old_cust_modal = """                  {data.company_summary && (
                    <button onClick={() => setShowSummary(!showSummary)} style={{ background:showSummary?"#e0e7ff":"#f5f6f8", color:showSummary?"#3730a3":"#4a5060", border:`1px solid ${showSummary?"#c7d2fe":"#e2e5ea"}`, borderRadius:5, padding:"5px 12px", fontSize:11, fontWeight:700, cursor:"pointer", transition:"0.2s" }}>
                      COMPANY SUMMARY
                    </button>
                  )}
                </div>
                {showSummary && data.company_summary && (
                  <div style={{ backgroundColor:"#eff6ff", border:"1px solid #bfdbfe", borderRadius:8, padding:14, marginBottom:16, fontSize:13, color:"#1e3a8a", lineHeight:1.5, position:"relative" }}>
                    <div style={{fontWeight:800, marginBottom:4, display:"flex", justifyContent:"space-between"}}>
                      <span>AI Intelligence Summary</span>
                      <span onClick={()=>setShowSummary(false)} style={{cursor:"pointer", fontSize:16, lineHeight:0.8}}>×</span>
                    </div>
                    <div>{data.company_summary}</div>
                  </div>
                )}"""

new_cust_modal = """                  {data.company_summary && (
                    <button onClick={() => setShowSummary(true)} style={{ background:"#f5f6f8", color:"#4a5060", border:"1px solid #e2e5ea", borderRadius:5, padding:"5px 12px", fontSize:11, fontWeight:700, cursor:"pointer", transition:"0.2s" }}>
                      COMPANY SUMMARY
                    </button>
                  )}
                </div>
                {showSummary && data.company_summary && (
                  <CompanySummaryModal custName={custName} summary={data.company_summary} onClose={() => setShowSummary(false)} />
                )}"""

text = text.replace(old_cust_modal, new_cust_modal)

# 3. Export CompanySummaryModal in props section
text = text.replace('Header, RFQModal, JobFolderModal, MarkDeadModal, CustomerModal', 'Header, RFQModal, JobFolderModal, MarkDeadModal, CustomerModal, CompanySummaryModal')

with open('src/App.jsx', 'w') as f:
    f.write(text)

print("Updated App.jsx successfully.")
