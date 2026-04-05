// phiEngine.js
// Provides the core calculation logic for the Pipeline Health Index (PHI)

/**
 * Calculates the total Pipeline Health Index (PHI) score based on live data and dynamic configs.
 * 
 * @param {Object} config - The phi_config settings from the database
 * @param {Object} data - The real-time metric evaluation data (winRate, volume, margin, stalePct, speedDays)
 * @returns {Object} result - Structured object containing the raw score, the band label, and individual sub-scores
 */
export function calculatePHI(config, data) {
  // If config is missing or invalid, fail gracefully to 0
  if (!config || !data) return { totalScore: 0, band: "Unknown", components: {} };

  // Helper: Blend ratio application
  const ratioCo = (config.blend_company || 0) / 100;
  const ratioInd = (config.blend_industry || 0) / 100;

  const targetWin = (config.win_base * ratioCo) + (config.win_ind * ratioInd);
  const targetVol = (config.vol_base * ratioCo) + (config.vol_ind * ratioInd);
  const targetMargin = (config.margin_base * ratioCo) + (config.margin_ind * ratioInd);
  const targetStale = (config.stale_pct_base * ratioCo) + (config.stale_pct_ind * ratioInd);
  const targetSpeed = (config.response_days_base * ratioCo) + (config.response_days_ind * ratioInd);

  // Component Scorer Helper 
  function cap(val) {
    return Math.max(0, Math.min(100, val));
  }

  // 1. Win Rate Score = 100 - (\abs(Actual - Target) * 2) 
  const winRateScore = cap(100 - (Math.abs((data.winRate || 0) - targetWin) * 2));
  
  // 2. Volume Score = (Actual / Target) * 100
  const volScore = targetVol > 0 ? cap(((data.volume || 0) / targetVol) * 100) : 0;
  
  // 3. Margin Score = 100 - (\abs(Actual - Target) * 3)
  const marginScore = cap(100 - (Math.abs((data.margin || 0) - targetMargin) * 3));
  
  // 4. Aging/Stale Score = 100 - ((Actual Stale % / Target Stale %) * 50)
  const staleScore = targetStale > 0 ? cap(100 - (((data.stalePct || 0) / targetStale) * 50)) : cap(100 - ((data.stalePct || 0) * 10)); // pseudo fallback
  
  // 5. Speed Score = 100 - ((Actual Days - Target Days) * 10)
  const speedDiff = (data.speedDays || 0) - targetSpeed;
  const speedScore = speedDiff > 0 ? cap(100 - (speedDiff * 10)) : 100; // if faster, 100

  // Apply Weights
  const wWin = (config.w_winrate || 0) / 100;
  const wVol = (config.w_volume || 0) / 100;
  const wMargin = (config.w_margin || 0) / 100;
  const wAging = (config.w_aging || 0) / 100;
  const wSpeed = (config.w_speed || 0) / 100;

  const totalScore = Math.round(
    (winRateScore * wWin) +
    (volScore * wVol) +
    (marginScore * wMargin) +
    (staleScore * wAging) +
    (speedScore * wSpeed)
  );

  // Evaluate Bands
  let band = "Unknown";
  let color = "#cbd5e1"; // default slate

  if (totalScore >= config.band_excellent) {
    band = "Excellent";
    color = "#14b8a6"; // Teal
  } else if (totalScore >= config.band_good) {
    band = "Good";
    color = "#22c55e"; // Green
  } else if (totalScore >= config.band_fair) {
    band = "Fair";
    color = "#f59e0b"; // Amber
  } else {
    band = "At Risk";
    color = "#ef4444"; // Red
  }

  return {
    totalScore,
    band,
    color,
    components: {
      winRate: Math.round(winRateScore),
      volume: Math.round(volScore),
      margin: Math.round(marginScore),
      aging: Math.round(staleScore),
      speed: Math.round(speedScore)
    }
  };
}
