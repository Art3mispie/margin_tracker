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
