import sys

with open('src/CustomerCRMBoard.jsx', 'r') as f:
    text = f.read()

# 1. extract CompanySummaryModal from props
if 'CompanySummaryModal' not in text:
    text = text.replace('const RFQModal = props.RFQModal;', 'const RFQModal = props.RFQModal;\n  const CompanySummaryModal = props.CompanySummaryModal;')

# 2. replace inline summary with modal component
old_board_modal = """                        {currentSelectionData?.company_summary && (
                          <button onClick={() => setShowSummaryBoard(!showSummaryBoard)} style={{ background:showSummaryBoard?"#e0e7ff":"#f5f6f8", color:showSummaryBoard?"#3730a3":"#4a5060", border:`1px solid ${showSummaryBoard?"#c7d2fe":"#e2e5ea"}`, borderRadius:8, padding:"8px 14px", fontSize:12, fontWeight:700, cursor:"pointer", transition:"0.2s" }}>
                            COMPANY SUMMARY
                          </button>
                        )}
                        {showSummaryBoard && currentSelectionData?.company_summary && (
                          <div style={{ backgroundColor:"#eff6ff", border:"1px solid #bfdbfe", borderRadius:8, padding:"10px 14px", fontSize:12, color:"#1e3a8a", lineHeight:1.5, maxWidth:380, textAlign:"left", boxShadow:"0 2px 8px rgba(0,0,0,0.03)" }}>
                            <div style={{fontWeight:800, marginBottom:3, fontSize:11, textTransform:"uppercase", letterSpacing:0.5, display:"flex", justifyContent:"space-between", alignItems:"center"}}>
                               <span>AI Intelligence Summary</span>
                               <span onClick={()=>setShowSummaryBoard(false)} style={{cursor:"pointer", fontSize:16, lineHeight:0.8}}>×</span>
                            </div>
                            <div>{currentSelectionData.company_summary}</div>
                          </div>
                        )}"""

new_board_modal = """                        {currentSelectionData?.company_summary && (
                          <button onClick={() => setShowSummaryBoard(true)} style={{ background:"#f5f6f8", color:"#4a5060", border:"1px solid #e2e5ea", borderRadius:8, padding:"8px 14px", fontSize:12, fontWeight:700, cursor:"pointer", transition:"0.2s" }}>
                            COMPANY SUMMARY
                          </button>
                        )}
                        {showSummaryBoard && currentSelectionData?.company_summary && CompanySummaryModal && (
                          <CompanySummaryModal custName={currentSelectionData.name} summary={currentSelectionData.company_summary} onClose={() => setShowSummaryBoard(false)} />
                        )}"""

text = text.replace(old_board_modal, new_board_modal)

with open('src/CustomerCRMBoard.jsx', 'w') as f:
    f.write(text)

print("Updated CustomerCRMBoard.jsx successfully.")
