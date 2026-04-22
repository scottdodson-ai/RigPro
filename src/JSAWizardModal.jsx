import React, { useState } from "react";

const C = {
  bg: "#f5f6f8", sur: "#ffffff", bdr: "#e2e5ea", bdrM: "#c8cdd5",
  txt: "#1c1f26", txtM: "#4a5060", txtS: "#8a93a2",
  acc: "#b86b0a", accL: "#fff7ed", accB: "#f5a623",
  blue: "#2563eb", bluB: "#eff6ff", bluBdr: "#bfdbfe",
  grn: "#16a34a", grnB: "#f0fdf4", grnBdr: "#bbf7d0",
  red: "#dc2626", redB: "#fef2f2", redBdr: "#fecaca",
};

const inp = { background: C.sur, border: `1px solid ${C.bdrM}`, borderRadius: 5, color: C.txt, fontFamily: "inherit", fontSize: 13, padding: "7px 10px", width: "100%", boxSizing: "border-box", outline: "none" };
const sel = { ...inp, padding: "7px 8px" };

function mkBtn(v = "primary") {
  const m = {
    primary: { bg: C.acc, cl: "#fff", bd: "none" },
    outline: { bg: C.sur, cl: C.acc, bd: `1.5px solid ${C.accB}` },
    ghost: { bg: "transparent", cl: C.txtM, bd: "none" },
  };
  const x = m[v] || m.primary;
  return { background: x.bg, color: x.cl, border: x.bd, borderRadius: 6, padding: "8px 16px", fontSize: 13, fontFamily: "inherit", fontWeight: 600, cursor: "pointer", display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 6 };
}

const JOB_TYPES = ["Industrial Rigging", "Machinery Moving", "Heavy Haul Transport", "Combined Scope"];
const COMM_METHODS = ["Hand Signals", "Radio", "Direct Verbal", "Mixed"];
const PPE_OPTIONS = ["Hard hat", "Safety glasses", "High-visibility vest", "Cut-resistant gloves", "Steel-toe boots", "Hearing protection", "Fall protection"];
const HAZARD_OPTIONS = ["Suspended load", "Pinch / crush points", "Swing radius exposure", "Unstable / shifting load", "Unknown center of gravity", "Rigging overload risk", "Overhead obstructions", "Power lines / energized equipment", "Uneven ground / poor floor loading", "Traffic / public exposure", "Weather / wind", "Confined access / tight clearances", "Transport securement failure", "Trailer / route clearance issue"];
const CONTROL_OPTIONS = ["Pre-task crew review", "Dedicated signal person", "Exclusion zone established", "Test lift performed", "Tag lines used", "Spotters assigned", "Floor / ground bearing confirmed", "Load weight verified", "COG identified", "Rigging gear inspected", "Route survey completed", "Permits confirmed", "Weather checked", "Stop-work authority reviewed"];
const DEFAULT_STEPS = [
  { id: 1, task: "Arrive / stage equipment", hazard: "Site congestion, struck-by", control: "Barricades, staging plan, spotter" },
  { id: 2, task: "Inspect rigging and equipment", hazard: "Damaged gear, hidden defects", control: "Pre-use inspection, remove defective gear" },
  { id: 3, task: "Rig the load", hazard: "Wrong pick points, bad sling angle", control: "Verify pick points, angle, WLL, COG" },
  { id: 4, task: "Test lift / initial movement", hazard: "Load shift, tip, binding", control: "Lift inches only, stop and verify balance" },
  { id: 5, task: "Main lift / transfer", hazard: "Swing radius, line of fire", control: "Exclusion zone, one signal person, tag lines" },
  { id: 6, task: "Set on skates / trailer / foundation", hazard: "Pinch / crush points", control: "Hands clear, use bars/tools, controlled lowering" },
  { id: 7, task: "Final securement / set", hazard: "Unexpected movement", control: "Final check, blocking, securement verification" },
];

export default function JSAWizardModal({ quote, onSave, onClose }) {
  const [step, setStep] = useState(1);
  const [jsa, setJsa] = useState({
    job_type: "Industrial Rigging",
    supervisor: "",
    crew: "",
    dimensions: "",
    center_of_gravity: "",
    pick_points: "",
    rigging_gear: "",
    hazards: [],
    controls: [],
    stop_work_triggers: "Any load shift, equipment issue, communication failure, unsafe weather, route or floor condition change, or any unplanned condition.",
    comm_method: "Hand Signals",
    signal_person: "",
    spotters: "",
    exclusion_zone: "",
    tag_lines: true,
    ppe: ["Hard hat", "Safety glasses", "Steel-toe boots", "High-visibility vest"],
    route_notes: "",
    permits: "",
    weather: "",
    steps: [...DEFAULT_STEPS],
    ...quote.jsaData
  });

  const u = (k, v) => setJsa(p => ({ ...p, [k]: v }));
  const toggleArr = (arr, val) => arr.includes(val) ? arr.filter(x => x !== val) : [...arr, val];

  const updateStep = (id, field, val) => setJsa(p => ({ ...p, steps: p.steps.map(s => s.id === id ? { ...s, [field]: val } : s) }));
  const addStep = () => setJsa(p => ({ ...p, steps: [...p.steps, { id: Date.now(), task: "", hazard: "", control: "" }] }));
  const removeStep = (id) => setJsa(p => ({ ...p, steps: p.steps.filter(s => s.id !== id) }));

  const tabs = [
    { id: 1, label: "1. Job Info" },
    { id: 2, label: "2. Load & Gear" },
    { id: 3, label: "3. Hazards & Controls" },
    { id: 4, label: "4. Site & Comm" },
    { id: 5, label: "5. JSA Steps" },
  ];

  const Lbl = ({ c }) => <div style={{ fontSize: 11, fontWeight: 700, color: C.txtS, marginBottom: 4, textTransform: "uppercase" }}>{c}</div>;

  const handlePrint = () => {
    const printDiv = document.getElementById("jsa-print-area");
    if (!printDiv) return;
    const w = window.open("", "_blank", "width=900,height=900");
    w.document.write(`
      <html><head><title>JSA - ${quote.qn || "New"}</title>
      <style>
        @page { size: letter; margin: 0.5in; }
        body { font-family: 'Segoe UI', Arial, sans-serif; font-size: 11px; color: #000; margin:0; }
        .header { border-bottom: 3px solid #b86b0a; padding-bottom: 10px; margin-bottom: 20px; }
        .h1 { font-size: 20px; font-weight: 800; color: #b86b0a; text-transform: uppercase; }
        .h2 { font-size: 12px; font-weight: 600; margin-top: 4px; }
        .row { display: flex; gap: 20px; margin-bottom: 12px; }
        .col { flex: 1; }
        .lbl { font-size: 9px; font-weight: 700; color: #666; text-transform: uppercase; margin-bottom: 2px; }
        .val { font-size: 12px; font-weight: 700; background: #f5f6f8; padding: 6px 10px; border-radius: 4px; border: 1px solid #e2e5ea; min-height: 14px; }
        .section-title { font-size: 12px; font-weight: 800; color: #fff; background: #4a5060; padding: 4px 8px; margin: 20px 0 10px; border-radius: 4px; }
        table { width: 100%; border-collapse: collapse; margin-top: 10px; }
        th, td { border: 1px solid #ccc; padding: 8px; text-align: left; vertical-align: top; }
        th { background: #f5f6f8; font-size: 10px; text-transform: uppercase; color: #666; }
        td { font-size: 11px; font-weight: 600; }
        .tag { display: inline-block; background: #e2e5ea; padding: 3px 6px; border-radius: 4px; margin: 2px; font-size: 10px; }
        .tag.green { background: #dcfce7; color: #166534; border: 1px solid #bbf7d0; }
        .tag.red { background: #fee2e2; color: #991b1b; border: 1px solid #fecaca; }
        .tag.blue { background: #dbeafe; color: #1e40af; border: 1px solid #bfdbfe; }
      </style></head><body>
      ${printDiv.innerHTML}
      </body></html>
    `);
    w.document.close();
    w.focus();
    setTimeout(() => { w.print(); w.close(); }, 500);
  };

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
      <div style={{ background: C.sur, borderRadius: 12, width: "100%", maxWidth: 850, height: "90vh", display: "flex", flexDirection: "column", overflow: "hidden", boxShadow: "0 10px 40px rgba(0,0,0,0.3)" }}>
        
        {/* Header */}
        <div style={{ padding: "16px 24px", borderBottom: `1px solid ${C.bdr}`, display: "flex", justifyContent: "space-between", alignItems: "center", background: C.bg }}>
          <div>
            <div style={{ fontSize: 18, fontWeight: 800, color: C.txt }}>Comprehensive JSA Wizard</div>
            <div style={{ fontSize: 12, color: C.txtM, marginTop: 2 }}>{quote.qn} - {quote.client} - {quote.desc}</div>
          </div>
          <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
            <button onClick={handlePrint} style={mkBtn("outline")}>🖨 Print JSA</button>
            <button onClick={onClose} style={{ background: "none", border: "none", fontSize: 24, color: C.txtS, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", width: 32, height: 32 }}>×</button>
          </div>
        </div>

        {/* Progress Tabs */}
        <div style={{ display: "flex", background: C.sur, borderBottom: `1px solid ${C.bdr}`, overflowX: "auto" }}>
          {tabs.map(t => (
            <div key={t.id} onClick={() => setStep(t.id)} style={{ flex: 1, padding: "12px 16px", textAlign: "center", borderBottom: step === t.id ? `3px solid ${C.acc}` : "3px solid transparent", color: step === t.id ? C.acc : C.txtS, fontWeight: step === t.id ? 800 : 600, fontSize: 13, cursor: "pointer", whiteSpace: "nowrap" }}>
              {t.label}
            </div>
          ))}
        </div>

        {/* Content */}
        <div style={{ padding: "24px", overflowY: "auto", flex: 1, background: C.sur }}>
          
          {step === 1 && (
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: C.txt, marginBottom: 8 }}>Job Overview</div>
              <div style={{ display: "flex", gap: 12 }}>
                <div style={{ flex: 1 }}><Lbl c="Project / Job Name" /><input style={inp} value={quote.desc || ""} disabled /></div>
                <div style={{ flex: 1 }}><Lbl c="Job Type" />
                  <select style={sel} value={jsa.job_type} onChange={e => u("job_type", e.target.value)}>
                    {JOB_TYPES.map(o => <option key={o}>{o}</option>)}
                  </select>
                </div>
              </div>
              <div style={{ display: "flex", gap: 12 }}>
                <div style={{ flex: 1 }}><Lbl c="Location" /><input style={inp} value={quote.jobSite || quote.city || ""} disabled /></div>
                <div style={{ flex: 1 }}><Lbl c="Customer" /><input style={inp} value={quote.client || ""} disabled /></div>
              </div>
              <div style={{ display: "flex", gap: 12 }}>
                <div style={{ flex: 1 }}><Lbl c="Supervisor / Lift Director" /><input style={inp} value={jsa.supervisor} onChange={e => u("supervisor", e.target.value)} /></div>
                <div style={{ flex: 1 }}><Lbl c="Crew (comma-separated)" /><input style={inp} value={jsa.crew} onChange={e => u("crew", e.target.value)} placeholder="John D, Jane S" /></div>
              </div>
            </div>
          )}

          {step === 2 && (
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: C.txt, marginBottom: 8 }}>Load & Equipment Details</div>
              <div style={{ display: "flex", gap: 12 }}>
                <div style={{ flex: 1 }}><Lbl c="Load Weight (lb)" /><input style={inp} value={(quote.maxLiftTons ? (quote.maxLiftTons * 2000) : "") + " lbs"} disabled /></div>
                <div style={{ flex: 1 }}><Lbl c="Dimensions" /><input style={inp} value={jsa.dimensions} onChange={e => u("dimensions", e.target.value)} /></div>
              </div>
              <div style={{ display: "flex", gap: 12 }}>
                <div style={{ flex: 1 }}><Lbl c="Center of Gravity" /><input style={inp} value={jsa.center_of_gravity} onChange={e => u("center_of_gravity", e.target.value)} /></div>
                <div style={{ flex: 1 }}><Lbl c="Pick Points / Lift Lugs" /><input style={inp} value={jsa.pick_points} onChange={e => u("pick_points", e.target.value)} /></div>
              </div>
              <div><Lbl c="Primary Equipment (From Quote)" /><textarea style={{...inp, resize:"vertical", minHeight:60}} value={(quote.equipRows||[]).map(e => e.name || e.code).join(", ")} disabled /></div>
              <div><Lbl c="Rigging Gear" /><textarea style={{...inp, resize:"vertical", minHeight:60}} value={jsa.rigging_gear} onChange={e => u("rigging_gear", e.target.value)} placeholder="2 x 20' synthetic round slings, 4 shackles..." /></div>
            </div>
          )}

          {step === 3 && (
            <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
              <div>
                <div style={{ fontSize: 14, fontWeight: 700, color: C.txt, marginBottom: 12 }}>Hazards Identified</div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 8 }}>
                  {HAZARD_OPTIONS.map(h => {
                    const act = jsa.hazards.includes(h);
                    return <div key={h} onClick={() => u("hazards", toggleArr(jsa.hazards, h))} style={{ border: `1px solid ${act?C.accB:C.bdr}`, background: act?C.accL:C.sur, color: act?C.acc:C.txtM, padding: "6px 10px", borderRadius: 4, fontSize: 12, fontWeight: 600, cursor: "pointer", display:"flex", alignItems:"center", gap:6 }}><input type="checkbox" checked={act} readOnly style={{margin:0}} /> {h}</div>
                  })}
                </div>
              </div>
              <div>
                <div style={{ fontSize: 14, fontWeight: 700, color: C.txt, marginBottom: 12 }}>Control Measures</div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 8 }}>
                  {CONTROL_OPTIONS.map(h => {
                    const act = jsa.controls.includes(h);
                    return <div key={h} onClick={() => u("controls", toggleArr(jsa.controls, h))} style={{ border: `1px solid ${act?C.grnBdr:C.bdr}`, background: act?C.grnB:C.sur, color: act?C.grn:C.txtM, padding: "6px 10px", borderRadius: 4, fontSize: 12, fontWeight: 600, cursor: "pointer", display:"flex", alignItems:"center", gap:6 }}><input type="checkbox" checked={act} readOnly style={{margin:0}} /> {h}</div>
                  })}
                </div>
              </div>
              <div><Lbl c="Stop-Work Triggers" /><textarea style={{...inp, resize:"vertical", minHeight:60}} value={jsa.stop_work_triggers} onChange={e => u("stop_work_triggers", e.target.value)} /></div>
            </div>
          )}

          {step === 4 && (
            <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
              <div style={{ display: "flex", gap: 12 }}>
                <div style={{ flex: 1 }}><Lbl c="Communication Method" />
                  <select style={sel} value={jsa.comm_method} onChange={e => u("comm_method", e.target.value)}>
                    {COMM_METHODS.map(o => <option key={o}>{o}</option>)}
                  </select>
                </div>
                <div style={{ flex: 1 }}><Lbl c="Signal Person" /><input style={inp} value={jsa.signal_person} onChange={e => u("signal_person", e.target.value)} /></div>
                <div style={{ flex: 1 }}><Lbl c="Spotters" /><input style={inp} value={jsa.spotters} onChange={e => u("spotters", e.target.value)} /></div>
              </div>
              <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                <div style={{ flex: 2 }}><Lbl c="Exclusion Zone / Barricade Notes" /><input style={inp} value={jsa.exclusion_zone} onChange={e => u("exclusion_zone", e.target.value)} /></div>
                <label style={{ flex: 1, display: "flex", alignItems: "center", gap: 6, fontSize: 13, fontWeight: 600, color: C.txtM, marginTop: 16, cursor: "pointer" }}>
                  <input type="checkbox" checked={jsa.tag_lines} onChange={e => u("tag_lines", e.target.checked)} style={{ width: 16, height: 16 }} />
                  Tag Lines Required
                </label>
              </div>
              <div>
                <div style={{ fontSize: 14, fontWeight: 700, color: C.txt, marginBottom: 12 }}>Required PPE</div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: 8 }}>
                  {PPE_OPTIONS.map(h => {
                    const act = jsa.ppe.includes(h);
                    return <div key={h} onClick={() => u("ppe", toggleArr(jsa.ppe, h))} style={{ border: `1px solid ${act?C.bluBdr:C.bdr}`, background: act?C.bluB:C.sur, color: act?C.blue:C.txtM, padding: "6px 10px", borderRadius: 4, fontSize: 12, fontWeight: 600, cursor: "pointer", display:"flex", alignItems:"center", gap:6 }}><input type="checkbox" checked={act} readOnly style={{margin:0}} /> {h}</div>
                  })}
                </div>
              </div>
              <div style={{ display: "flex", gap: 12 }}>
                <div style={{ flex: 1 }}><Lbl c="Transport / Route Notes" /><textarea style={{...inp, resize:"vertical", minHeight:50}} value={jsa.route_notes} onChange={e => u("route_notes", e.target.value)} /></div>
                <div style={{ flex: 1 }}><Lbl c="Weather / Site Conditions" /><textarea style={{...inp, resize:"vertical", minHeight:50}} value={jsa.weather} onChange={e => u("weather", e.target.value)} /></div>
              </div>
            </div>
          )}

          {step === 5 && (
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <div style={{ fontSize: 13, color: C.txtM }}>Edit the default steps to fit the specific job. Add or remove rows as needed.</div>
              {jsa.steps.map((s, i) => (
                <div key={s.id} style={{ background: C.bg, border: `1px solid ${C.bdr}`, borderRadius: 8, padding: 12, display: "flex", gap: 12, alignItems: "flex-start", position: "relative" }}>
                  <div style={{ background: C.txtM, color: "#fff", fontSize: 11, fontWeight: 800, padding: "3px 8px", borderRadius: 4, marginTop: 22 }}>{i + 1}</div>
                  <div style={{ flex: 1 }}><Lbl c="Task" /><input style={inp} value={s.task} onChange={e => updateStep(s.id, "task", e.target.value)} /></div>
                  <div style={{ flex: 1 }}><Lbl c="Hazards" /><input style={inp} value={s.hazard} onChange={e => updateStep(s.id, "hazard", e.target.value)} /></div>
                  <div style={{ flex: 1 }}><Lbl c="Controls" /><input style={inp} value={s.control} onChange={e => updateStep(s.id, "control", e.target.value)} /></div>
                  <button onClick={() => removeStep(s.id)} style={{ background: "none", border: "none", color: C.red, fontSize: 20, cursor: "pointer", padding: "20px 4px 0" }}>×</button>
                </div>
              ))}
              <button onClick={addStep} style={{ ...mkBtn("outline"), alignSelf: "flex-start", marginTop: 8 }}>+ Add Step</button>
            </div>
          )}
        </div>

        {/* Hidden Print Area */}
        <div id="jsa-print-area" style={{ display: "none" }}>
          <div className="header">
            <div className="h1">Job Safety Analysis (JSA)</div>
            <div className="h2">{quote.qn || "Draft"} - {quote.client || "Client"} - {quote.desc || "Description"}</div>
          </div>
          
          <div className="section-title">Job & Location Overview</div>
          <div className="row">
            <div className="col"><div className="lbl">Job Type</div><div className="val">{jsa.job_type}</div></div>
            <div className="col"><div className="lbl">Location</div><div className="val">{quote.jobSite || quote.city || "—"}</div></div>
            <div className="col"><div className="lbl">Date</div><div className="val">{new Date().toLocaleDateString()}</div></div>
          </div>
          <div className="row">
            <div className="col"><div className="lbl">Supervisor / Lift Director</div><div className="val">{jsa.supervisor || "—"}</div></div>
            <div className="col"><div className="lbl">Crew Members</div><div className="val">{jsa.crew || "—"}</div></div>
          </div>

          <div className="section-title">Load & Equipment Profile</div>
          <div className="row">
            <div className="col"><div className="lbl">Load Weight</div><div className="val">{(quote.maxLiftTons ? (quote.maxLiftTons * 2000) : "—") + " lbs"}</div></div>
            <div className="col"><div className="lbl">Dimensions</div><div className="val">{jsa.dimensions || "—"}</div></div>
            <div className="col"><div className="lbl">Center of Gravity</div><div className="val">{jsa.center_of_gravity || "—"}</div></div>
          </div>
          <div className="row">
            <div className="col"><div className="lbl">Pick Points</div><div className="val">{jsa.pick_points || "—"}</div></div>
            <div className="col"><div className="lbl">Rigging Gear</div><div className="val">{jsa.rigging_gear || "—"}</div></div>
          </div>

          <div className="section-title">Hazards, Controls & Site</div>
          <div className="row">
            <div className="col"><div className="lbl">Identified Hazards</div><div>{jsa.hazards.length ? jsa.hazards.map(h => <span key={h} className="tag red">{h}</span>) : "None"}</div></div>
            <div className="col"><div className="lbl">Control Measures</div><div>{jsa.controls.length ? jsa.controls.map(h => <span key={h} className="tag green">{h}</span>) : "None"}</div></div>
          </div>
          <div className="row">
            <div className="col"><div className="lbl">Required PPE</div><div>{jsa.ppe.length ? jsa.ppe.map(h => <span key={h} className="tag blue">{h}</span>) : "None"}</div></div>
          </div>
          <div className="row">
            <div className="col"><div className="lbl">Comm Method</div><div className="val">{jsa.comm_method}</div></div>
            <div className="col"><div className="lbl">Signal Person</div><div className="val">{jsa.signal_person || "—"}</div></div>
            <div className="col"><div className="lbl">Tag Lines Required?</div><div className="val">{jsa.tag_lines ? "YES" : "NO"}</div></div>
          </div>
          <div className="row">
            <div className="col"><div className="lbl">Stop-Work Triggers</div><div className="val">{jsa.stop_work_triggers || "—"}</div></div>
          </div>

          <div className="section-title">Step-by-Step Task Breakdown</div>
          <table>
            <thead><tr><th>#</th><th>Task Sequence</th><th>Hazards Identified</th><th>Controls / Actions</th></tr></thead>
            <tbody>
              {jsa.steps.map((s, i) => (
                <tr key={s.id}>
                  <td style={{width:"20px",textAlign:"center"}}>{i+1}</td>
                  <td>{s.task || "—"}</td>
                  <td>{s.hazard || "—"}</td>
                  <td>{s.control || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div style={{marginTop: "40px", display: "flex", gap: "40px"}}>
            <div style={{flex: 1}}><div style={{borderBottom: "1px solid #000", height: "30px"}}></div><div style={{fontSize: "9px", paddingTop: "4px"}}>Supervisor Signature</div></div>
            <div style={{flex: 1}}><div style={{borderBottom: "1px solid #000", height: "30px"}}></div><div style={{fontSize: "9px", paddingTop: "4px"}}>Date / Time</div></div>
          </div>
        </div>

        {/* Footer */}
        <div style={{ padding: "16px 24px", borderTop: `1px solid ${C.bdr}`, display: "flex", justifyContent: "space-between", background: C.bg }}>
          {step > 1 ? (
            <button style={mkBtn("outline")} onClick={() => setStep(step - 1)}>← Previous</button>
          ) : <div />}
          
          <button style={mkBtn("primary")} onClick={() => { if (step < 5) setStep(step + 1); else onSave(jsa); }}>
            {step === 5 ? "Save & Complete JSA" : "Next Step →"}
          </button>
        </div>
      </div>
    </div>
  );
}
