// Central place for reading/writing the two tokens the backend issues.
//
// accessToken  -> short-lived (15m), sent as "Authorization: Bearer <token>"
// refreshToken -> long-lived (7d), sent only to POST /auth/refresh and
//                 POST /auth/logout
//
// Both are kept in localStorage so a page refresh doesn't log the user
// out. This is a student project leaderboard, not a banking app, so the
// simplicity/UX tradeoff of localStorage over in-memory-only storage is
// intentional and matches the backend's bearer-token design (no cookies
// are set by the API).

const ACCESS_TOKEN_KEY = "campuscode_access_token";
const REFRESH_TOKEN_KEY = "campuscode_refresh_token";

export function getAccessToken() {
  return localStorage.getItem(ACCESS_TOKEN_KEY);
}

export function getRefreshToken() {
  return localStorage.getItem(REFRESH_TOKEN_KEY);
}

export function setTokens({ accessToken, refreshToken }) {
  if (accessToken) localStorage.setItem(ACCESS_TOKEN_KEY, accessToken);
  if (refreshToken) localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
}

export function setAccessToken(accessToken) {
  localStorage.setItem(ACCESS_TOKEN_KEY, accessToken);
}

export function clearTokens() {
  localStorage.removeItem(ACCESS_TOKEN_KEY);
  localStorage.removeItem(REFRESH_TOKEN_KEY);
}

export function hasSession() {
  return Boolean(getRefreshToken());
}
