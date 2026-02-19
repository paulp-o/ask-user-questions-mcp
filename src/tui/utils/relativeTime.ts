/**
 * Format a timestamp as a concise relative time string.
 *
 * @param date - A Date object or a numeric epoch-ms timestamp
 * @returns Human-readable label such as "just now", "12s ago", "3m ago"
 */
export function formatRelativeTime(date: Date | number): string {
  const now = Date.now();
  const then = typeof date === "number" ? date : date.getTime();
  const diffMs = Math.max(0, now - then);
  const diffSec = Math.floor(diffMs / 1000);

  if (diffSec < 5) return "just now";
  if (diffSec < 60) return `${diffSec}s ago`;

  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;

  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;

  const diffDay = Math.floor(diffHr / 24);
  return `${diffDay}d ago`;
}
