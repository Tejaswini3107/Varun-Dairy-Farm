export function shouldDeliverOn(
  frequency: string,
  subscriptionStart: Date,
  targetDate: Date,
  deliveryDays?: string | null,
): boolean {
  const dayMs = 24 * 60 * 60 * 1000;
  const start = new Date(subscriptionStart);
  start.setHours(0, 0, 0, 0);
  const target = new Date(targetDate);
  target.setHours(0, 0, 0, 0);

  if (target < start) return false;

  // Custom delivery days override frequency (e.g. ["1","3","5"] = Mon, Wed, Fri)
  if (deliveryDays) {
    try {
      const days: number[] = JSON.parse(deliveryDays);
      return days.includes(target.getDay());
    } catch {
      // fall through to frequency logic
    }
  }

  const daysSinceStart = Math.round((target.getTime() - start.getTime()) / dayMs);

  switch (frequency) {
    case "daily":     return true;
    case "alternate": return daysSinceStart % 2 === 0;
    case "weekly":    return target.getDay() === start.getDay();
    case "monthly":   return target.getDate() === start.getDate();
    default:          return true;
  }
}

export function computeNextDeliveryDate(
  frequency: string,
  fromDate: Date,
  deliveryDays?: string | null,
): Date {
  const d = new Date(fromDate);
  d.setHours(0, 0, 0, 0);

  if (deliveryDays) {
    try {
      const days: number[] = JSON.parse(deliveryDays);
      if (days.length > 0) {
        // Find the next matching weekday
        for (let i = 1; i <= 7; i++) {
          const next = new Date(d);
          next.setDate(next.getDate() + i);
          if (days.includes(next.getDay())) return next;
        }
      }
    } catch { /* fall through */ }
  }

  switch (frequency) {
    case "daily":     d.setDate(d.getDate() + 1); break;
    case "alternate": d.setDate(d.getDate() + 2); break;
    case "weekly":    d.setDate(d.getDate() + 7); break;
    case "monthly":   d.setMonth(d.getMonth() + 1); break;
  }
  return d;
}
