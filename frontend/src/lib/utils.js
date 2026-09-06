// Shared formatting helpers used across pages/components.

export function formatNumber(value) {
  if (value === null || value === undefined || Number.isNaN(value)) return "—";
  return Number(value).toLocaleString("en-US");
}

export function formatOrdinalRank(rank) {
  if (!rank && rank !== 0) return "—";
  const n = Number(rank);
  const mod100 = n % 100;
  if (mod100 >= 11 && mod100 <= 13) return `${n}th`;
  switch (n % 10) {
    case 1:
      return `${n}st`;
    case 2:
      return `${n}nd`;
    case 3:
      return `${n}rd`;
    default:
      return `${n}th`;
  }
}

export function formatRelativeTime(dateInput) {
  if (!dateInput) return "Never synced";

  const date = new Date(dateInput);
  if (Number.isNaN(date.getTime())) return "Never synced";

  const diffMs = Date.now() - date.getTime();
  const diffSec = Math.round(diffMs / 1000);

  if (diffSec < 30) return "Just now";
  if (diffSec < 60) return `${diffSec} seconds ago`;

  const diffMin = Math.round(diffSec / 60);
  if (diffMin < 60) return `${diffMin} minute${diffMin === 1 ? "" : "s"} ago`;

  const diffHr = Math.round(diffMin / 60);
  if (diffHr < 24) return `${diffHr} hour${diffHr === 1 ? "" : "s"} ago`;

  const diffDay = Math.round(diffHr / 24);
  if (diffDay < 30) return `${diffDay} day${diffDay === 1 ? "" : "s"} ago`;

  return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export function getInitials(name) {
  if (!name) return "?";
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export function leetcodeProfileUrl(username) {
  if (!username) return null;
  return `https://leetcode.com/u/${encodeURIComponent(username)}/`;
}

export function isValidSiliconEmail(email) {
  return /^[^\s@]+@silicon\.ac\.in$/i.test(email.trim());
}

// Friendly network/API error message, since raw errors like
// "AxiosError 500" should never reach the user.
export function friendlyErrorMessage(error, fallback = "Something went wrong. Please try again.") {
  if (!error) return fallback;
  if (error.message === "Failed to fetch") {
    return "Unable to connect to Campus Code.";
  }
  return error.message || fallback;
}

export const MAX_PROFILE_PICTURE_BYTES = 500 * 1024;
export const ALLOWED_PROFILE_PICTURE_TYPES = ["image/jpeg", "image/png", "image/webp"];

export function validateProfilePicture(file) {
  if (!file) return "Please choose an image.";
  if (!ALLOWED_PROFILE_PICTURE_TYPES.includes(file.type)) {
    return "Only JPG, PNG and WebP images are allowed.";
  }
  if (file.size > MAX_PROFILE_PICTURE_BYTES) {
    return "Profile picture must be 500 KB or smaller.";
  }
  return null;
}
