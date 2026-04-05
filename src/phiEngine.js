export function calculatePHI(jobs, reqs, phiConfig) {
  if (!phiConfig || Object.keys(phiConfig).length === 0) {
    return { score: 0, band: "Unknown", color: "#ccc", phiCompany: 0, phiIndustry: 0, 
      actuals: { stale_pct:0, win_rate:0, vol:0, margin:0, speed:0 }, 
      ratios: { company: 50, industry: 50 }, error: true };
  }

  const {
    blend_company = 50, blend_industry = 50,
    w_aging = 30, w_winrate = 25, w_volume = 20, w_margin = 15, w_speed = 10,
    band_atrisk = 40, band_fair = 60, band_good = 75, band_excellent = 90,
    stale_days = 30, response_flag_hrs = 48,
    win_base = 0, vol_base = 0, margin_base = 0, stale_pct_base = 0, response_days_base = 0,
    win_ind = 0, vol_ind = 0, margin_ind = 0, stale_pct_ind = 0, response_days_ind = 0
  } = phiConfig;

  const openEsts = jobs.filter(q => !["Won", "Lost", "Dead"].includes(q.status));
  const now = new Date();
  
  let staleCount = 0;
  openEsts.forEach(q => {
    const d = new Date(q.last_activity || q.date || 0);
    const days = Math.floor((now - d) / 86400000);
    if (days > stale_days) staleCount++;
  });
  const act_stale_pct = openEsts.length > 0 ? (staleCount / openEsts.length) : 0;

  const wonCount = jobs.filter(q => q.status === "Won").length;
  const lostCount = jobs.filter(q => q.status === "Lost").length;
  const act_win_rate = (wonCount + lostCount) > 0 ? (wonCount / (wonCount + lostCount)) * 100 : 0;

  const act_vol = reqs.length;

  const wonJobs = jobs.filter(q => q.status === "Won");
  const totalRev = wonJobs.reduce((s,q) => s + (q.total||0), 0);
  const totalCost = wonJobs.reduce((s,q) => s + (q.labor||0)*0.6 + (q.equip||0)*0.7 + (q.hauling||0)*0.85 + (q.mats||0)*0.85 + (q.travel||0), 0);
  const act_margin = totalRev > 0 ? ((totalRev - totalCost) / totalRev) * 100 : 0;

  let respSum = 0, respCount = 0;
  reqs.filter(r => r.date).forEach(r => {
    const linked = jobs.find(q => q.fromReqId === r.id);
    if (linked && linked.date) {
      const days = Math.floor((new Date(linked.date) - new Date(r.date)) / 86400000);
      if (days >= 0) {
        respSum += days;
        respCount++;
      }
    }
  });
  const act_speed = respCount > 0 ? (respSum / respCount) : 0;

  const clamp = (v, min, max) => Math.max(min, Math.min(max, v));
  const scoreComponent = (actual, type, base) => {
    if (type === 'aging') {
      return Math.max(0, 30 * (1 - actual / 0.40));
    }
    if (type === 'winrate') {
      return clamp(17.5 + ((actual - base) / 5) * 5, 0, 25);
    }
    if (type === 'volume') {
      if (base === 0) return actual > 0 ? 20 : 0;
      return actual >= base ? 20 : Math.max(0, 20 * (actual / base));
    }
    if (type === 'margin') {
      return clamp(10 + (actual - base) * 1.5, 0, 15);
    }
    if (type === 'speed') {
      return actual <= 2 ? 10 : actual >= 7 ? 0 : (1 - (actual - 2)/5)*10;
    }
    return 0;
  };

  const cCompanyRaw = (
    scoreComponent(act_stale_pct, 'aging', stale_pct_base) * w_aging +
    scoreComponent(act_win_rate, 'winrate', win_base) * w_winrate +
    scoreComponent(act_vol, 'volume', vol_base) * w_volume +
    scoreComponent(act_margin, 'margin', margin_base) * w_margin +
    scoreComponent(act_speed, 'speed', response_days_base) * w_speed
  );
  
  const cIndRaw = (
    scoreComponent(act_stale_pct, 'aging', stale_pct_ind) * w_aging +
    scoreComponent(act_win_rate, 'winrate', win_ind) * w_winrate +
    scoreComponent(act_vol, 'volume', vol_ind) * w_volume +
    scoreComponent(act_margin, 'margin', margin_ind) * w_margin +
    scoreComponent(act_speed, 'speed', response_days_ind) * w_speed
  );

  const maxPossible = (30*w_aging) + (25*w_winrate) + (20*w_volume) + (15*w_margin) + (10*w_speed);
  
  const phiCompany = maxPossible > 0 ? (cCompanyRaw / maxPossible) * 100 : 0;
  const phiInd = maxPossible > 0 ? (cIndRaw / maxPossible) * 100 : 0;

  const blendScore = Math.round((phiCompany * (blend_company/100)) + (phiInd * (blend_industry/100)));

  let band = "Critical";
  let color = "#dc2626";
  if (blendScore >= band_excellent) { band = "Excellent"; color = "#16a34a"; }
  else if (blendScore >= band_good) { band = "Good"; color = "#16a34a"; }
  else if (blendScore >= band_fair) { band = "Fair"; color = "#d97706"; }
  else if (blendScore >= band_atrisk) { band = "At Risk"; color = "#d97706"; }

  return {
    score: blendScore,
    phiCompany: Math.round(phiCompany),
    phiIndustry: Math.round(phiInd),
    band,
    color,
    actuals: { stale_pct: act_stale_pct, win_rate: act_win_rate, vol: act_vol, margin: act_margin, speed: Math.round(act_speed * 10) / 10 },
    ratios: { company: blend_company, industry: blend_industry }
  };
}
