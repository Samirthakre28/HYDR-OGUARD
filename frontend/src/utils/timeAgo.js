/**
 * HydroGuard - Relative Time Formatting Utility
 * Formats timestamps into human-readable relative time strings based on actual response timestamps.
 */

export function formatTimeAgo(dateInput) {
  if (!dateInput) return "just now";

  const timestamp = typeof dateInput === "number"
    ? dateInput
    : new Date(dateInput).getTime();

  if (isNaN(timestamp)) {
    return "just now";
  }

  const now = Date.now();
  const elapsedSec = Math.max(0, Math.floor((now - timestamp) / 1000));

  if (elapsedSec < 10) {
    return "just now";
  }
  if (elapsedSec < 60) {
    return `${elapsedSec} seconds ago`;
  }
  if (elapsedSec < 120) {
    return "1 minute ago";
  }
  if (elapsedSec < 3600) {
    const mins = Math.floor(elapsedSec / 60);
    return `${mins} minutes ago`;
  }
  if (elapsedSec < 7200) {
    return "1 hour ago";
  }
  if (elapsedSec < 86400) {
    const hours = Math.floor(elapsedSec / 3600);
    return `${hours} hours ago`;
  }

  const days = Math.floor(elapsedSec / 86400);
  return days === 1 ? "1 day ago" : `${days} days ago`;
}

export default formatTimeAgo;
