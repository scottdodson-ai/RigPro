export const getLeadTimeInfo = (createDateStr) => {
  if (!createDateStr) return { formatted: "Unknown", bDays: 0, ms: 0, isOld: false };
  const created = new Date(createDateStr);
  const now = new Date();
  
  const diffMs = Math.max(0, now - created);
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  
  let formatted = "";
  if (diffMs < 24 * 60 * 60 * 1000) {
    const hours = Math.floor(diffMs / (1000 * 60 * 60));
    const mins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
    formatted = `${hours}h ${mins}m`;
  } else {
    formatted = `${diffDays} day${diffDays === 1 ? '' : 's'}`;
  }

  // Calculate business days
  let bDays = 0;
  let current = new Date(created);
  current.setHours(0,0,0,0);
  const today = new Date();
  today.setHours(0,0,0,0);

  while (current < today) {
    const dayOfWeek = current.getDay();
    if (dayOfWeek !== 0 && dayOfWeek !== 6) { // Not Sunday or Saturday
      bDays++;
    }
    current.setDate(current.getDate() + 1);
  }
  
  return { formatted, bDays, ms: diffMs, isOld: diffDays > 30 };
};
