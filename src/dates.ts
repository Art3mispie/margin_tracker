export function dayKey(ts: number): string {
  const d = new Date(ts);
  return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
}

export function todayKey(): string {
  return dayKey(Date.now());
}

export function fmtShort(ts: number): string {
  const d = new Date(ts);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export function fmtFull(ts: number): string {
  const d = new Date(ts);
  return d.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
}

// Start-of-week (Sunday) for a given timestamp, normalised to midnight.
function startOfWeek(ts: number): number {
  const d = new Date(ts);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - d.getDay());
  return d.getTime();
}

/**
 * A coarse, human "which week" bucket label for grouping a list by recency.
 * Anything older than a month collapses into its calendar month so the list
 * doesn't sprout an endless run of "5 weeks ago" headers.
 */
export function weekGroup(ts: number): string {
  const weekMs = 7 * 86400000;
  const diff = Math.round((startOfWeek(Date.now()) - startOfWeek(ts)) / weekMs);
  if (diff <= 0) return 'This week';
  if (diff === 1) return 'Last week';
  if (diff <= 4) return `${diff} weeks ago`;
  const d = new Date(ts);
  const sameYear = d.getFullYear() === new Date().getFullYear();
  return d.toLocaleDateString('en-US', {
    month: 'long',
    ...(sameYear ? {} : { year: 'numeric' }),
  });
}

export function dueInfo(
  ts: number
): { label: string; overdue: boolean; diff: number } | null {
  // Compare calendar days, not raw timestamps, so labels don't flip with the time of day.
  const due = new Date(ts);
  due.setHours(0, 0, 0, 0);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const diff = Math.round((due.getTime() - today.getTime()) / 86400000);

  if (diff < -1) {
    return { label: `${Math.abs(diff)} days overdue`, overdue: true, diff };
  } else if (diff < 0) {
    return { label: 'Overdue', overdue: true, diff };
  } else if (diff === 0) {
    return { label: 'Due today', overdue: false, diff };
  } else if (diff === 1) {
    return { label: 'Due tomorrow', overdue: false, diff };
  } else if (diff <= 7) {
    return { label: `Due in ${diff} days`, overdue: false, diff };
  } else {
    const d = new Date(ts);
    return {
      label: `Due ${d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`,
      overdue: false,
      diff,
    };
  }
}
