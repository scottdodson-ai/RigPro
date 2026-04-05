import React, { useState, useEffect } from 'react';

const C = { bg:"#f8fafc", sur:"#ffffff", txt:"#1e293b", txtM:"#475569", txtS:"#94a3b8", bdr:"#e2e8f0", acc:"#2563eb", accL:"#eff6ff", grn:"#10b981", amb:"#f59e0b", red:"#ef4444", blu: "#3b82f6" };
const inp = { padding: "8px 12px", border: `1px solid ${C.bdr}`, borderRadius: 6, fontSize: 13, color: C.txt, width: "100%", boxSizing: "border-box" };

function PhiConfigPanel({ token }) {
  const [config, setConfig] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');

  useEffect(() => {
    fetch('/api/admin/phi-config', { headers: { 'Authorization': `Bearer ${token}` } })
      .then(res => res.json())
      .then(data => { setConfig(data || {}); setLoading(false); })
      .catch(e => { setErr('Failed to load PHI settings.'); setLoading(false); });
  }, [token]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setConfig(c => ({ ...c, [name]: Number(value) }));
  };

  const handleSave = () => {
    setErr('');
    setMsg('');
    const { blend_company, blend_industry, w_aging, w_winrate, w_volume, w_margin, w_speed, band_atrisk, band_fair, band_good, band_excellent } = config;

    if (blend_company + blend_industry !== 100) {
      setErr('Blend Ratio must equal 100%.');
      return;
    }
    if (w_aging + w_winrate + w_volume + w_margin + w_speed !== 100) {
      setErr('Component Weights must equal 100%.');
      return;
    }
    if (!(band_atrisk < band_fair && band_fair < band_good && band_good < band_excellent)) {
      setErr('Score Band Thresholds must strictly ascend (At Risk < Fair < Good < Excellent).');
      return;
    }

    setSaving(true);
    fetch('/api/admin/phi-config', {
      method: 'PUT',
      headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(config)
    })
      .then(res => {
        if (!res.ok) throw new Error('Save failed');
        return res.json();
      })
      .then(data => {
        setConfig(data);
        setMsg('Saved successfully!');
        setTimeout(() => setMsg(''), 3000);
      })
      .catch(e => setErr('Failed to save settings.'))
      .finally(() => setSaving(false));
  };

  if (loading) return <div>Loading PHI Settings...</div>;
  if (!config) return null;

  return (
    <div style={{ background: C.sur, border: `1px solid ${C.bdr}`, borderRadius: 8, padding: 16, marginTop: 16 }}>
      <h3 style={{ margin: "0 0 16px 0", fontSize: 16 }}>Pipeline Health Index (PHI) Settings</h3>
      {err && <div style={{ background: "#fef2f2", color: C.red, padding: 8, borderRadius: 6, marginBottom: 12, fontSize: 13 }}>{err}</div>}
      {msg && <div style={{ background: "#ecfdf5", color: C.grn, padding: 8, borderRadius: 6, marginBottom: 12, fontSize: 13 }}>{msg}</div>}

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
        {/* Baselines */}
        <div>
          <h4 style={{ margin: "0 0 8px 0", fontSize: 13, borderBottom: `1px solid ${C.bdr}`, paddingBottom: 4 }}>Company Baselines</h4>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, alignItems: "center", fontSize: 12 }}>
            <label>Win Rate %</label> <input type="number" name="win_base" style={inp} value={config.win_base||0} onChange={handleChange} />
            <label>RFQ Volume</label> <input type="number" name="vol_base" style={inp} value={config.vol_base||0} onChange={handleChange} />
            <label>Margin %</label> <input type="number" name="margin_base" style={inp} value={config.margin_base||0} onChange={handleChange} />
            <label>Stale Target %</label> <input type="number" name="stale_pct_base" style={inp} value={config.stale_pct_base||0} onChange={handleChange} />
            <label>Response Days</label> <input type="number" name="response_days_base" style={inp} value={config.response_days_base||0} onChange={handleChange} />
          </div>
        </div>

        {/* Industry */}
        <div>
          <h4 style={{ margin: "0 0 8px 0", fontSize: 13, borderBottom: `1px solid ${C.bdr}`, paddingBottom: 4 }}>Industry Benchmarks</h4>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, alignItems: "center", fontSize: 12 }}>
            <label>Win Rate %</label> <input type="number" name="win_ind" style={inp} value={config.win_ind||0} onChange={handleChange} />
            <label>RFQ Volume</label> <input type="number" name="vol_ind" style={inp} value={config.vol_ind||0} onChange={handleChange} />
            <label>Margin %</label> <input type="number" name="margin_ind" style={inp} value={config.margin_ind||0} onChange={handleChange} />
            <label>Stale Target %</label> <input type="number" name="stale_pct_ind" style={inp} value={config.stale_pct_ind||0} onChange={handleChange} />
            <label>Response Days</label> <input type="number" name="response_days_ind" style={inp} value={config.response_days_ind||0} onChange={handleChange} />
          </div>
        </div>

        {/* Blend Ratio */}
        <div style={{ gridColumn: "1 / -1", background: C.bg, padding: 12, borderRadius: 6, border: `1px solid ${C.bdr}` }}>
          <h4 style={{ margin: "0 0 8px 0", fontSize: 13 }}>Blend Ratio</h4>
          <div style={{ display: "flex", gap: 16, alignItems: "center", fontSize: 12 }}>
            <label style={{display:"flex", alignItems:"center", gap: 8}}>
              Company % <input type="number" name="blend_company" style={{...inp, width: 80}} value={config.blend_company||0} onChange={handleChange} />
            </label>
            <label style={{display:"flex", alignItems:"center", gap: 8}}>
              Industry % <input type="number" name="blend_industry" style={{...inp, width: 80}} value={config.blend_industry||0} onChange={handleChange} />
            </label>
            <span style={{color: (config.blend_company+config.blend_industry)!==100?C.red:C.grn}}>Sum: {config.blend_company+config.blend_industry}%</span>
          </div>
        </div>

        {/* Component Weights */}
        <div style={{ gridColumn: "1 / -1", background: C.bg, padding: 12, borderRadius: 6, border: `1px solid ${C.bdr}` }}>
          <h4 style={{ margin: "0 0 8px 0", fontSize: 13 }}>Component Weights</h4>
          <div style={{ display: "flex", gap: 16, alignItems: "center", fontSize: 12, flexWrap: "wrap" }}>
            <label style={{display:"flex", alignItems:"center", gap: 8}}>Aging (Stale) <input type="number" name="w_aging" style={{...inp, width: 60}} value={config.w_aging||0} onChange={handleChange} /></label>
            <label style={{display:"flex", alignItems:"center", gap: 8}}>Win Rate <input type="number" name="w_winrate" style={{...inp, width: 60}} value={config.w_winrate||0} onChange={handleChange} /></label>
            <label style={{display:"flex", alignItems:"center", gap: 8}}>Volume <input type="number" name="w_volume" style={{...inp, width: 60}} value={config.w_volume||0} onChange={handleChange} /></label>
            <label style={{display:"flex", alignItems:"center", gap: 8}}>Margin <input type="number" name="w_margin" style={{...inp, width: 60}} value={config.w_margin||0} onChange={handleChange} /></label>
            <label style={{display:"flex", alignItems:"center", gap: 8}}>Speed <input type="number" name="w_speed" style={{...inp, width: 60}} value={config.w_speed||0} onChange={handleChange} /></label>
            <span style={{color: (config.w_aging+config.w_winrate+config.w_volume+config.w_margin+config.w_speed)!==100?C.red:C.grn, fontWeight: 700}}>Sum: {config.w_aging+config.w_winrate+config.w_volume+config.w_margin+config.w_speed}%</span>
          </div>
        </div>

        {/* Score Band Thresholds & Advanced */}
        <div style={{ gridColumn: "1 / -1", display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
          <div>
            <h4 style={{ margin: "0 0 8px 0", fontSize: 13, borderBottom: `1px solid ${C.bdr}`, paddingBottom: 4 }}>Score Band Floors</h4>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, alignItems: "center", fontSize: 12 }}>
              <label>Poor / At Risk</label> <input type="number" name="band_atrisk" style={inp} value={config.band_atrisk||0} onChange={handleChange} />
              <label>Fair</label> <input type="number" name="band_fair" style={inp} value={config.band_fair||0} onChange={handleChange} />
              <label>Good</label> <input type="number" name="band_good" style={inp} value={config.band_good||0} onChange={handleChange} />
              <label>Excellent</label> <input type="number" name="band_excellent" style={inp} value={config.band_excellent||0} onChange={handleChange} />
            </div>
          </div>
          <div>
            <h4 style={{ margin: "0 0 8px 0", fontSize: 13, borderBottom: `1px solid ${C.bdr}`, paddingBottom: 4 }}>Thresholds & Alerts</h4>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, alignItems: "center", fontSize: 12 }}>
              <label>Stale Quote Days</label> <input type="number" name="stale_days" style={inp} value={config.stale_days||0} onChange={handleChange} />
              <label>Red Flag Response Hrs</label> <input type="number" name="response_flag_hrs" style={inp} value={config.response_flag_hrs||0} onChange={handleChange} />
            </div>
          </div>
        </div>
      </div>
      
      <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 16 }}>
        <button onClick={handleSave} disabled={saving} style={{ background: C.acc, color: "#fff", border: "none", padding: "8px 16px", borderRadius: 6, cursor: "pointer", fontWeight: 700 }}>{saving ? "Saving..." : "Save Configuration"}</button>
      </div>

    </div>
  );
}

export default PhiConfigPanel;
