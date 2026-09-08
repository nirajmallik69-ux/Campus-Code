// ============================================================
// CAMPUS CODE — CENTRAL API LAYER
//
// Every network call in the app goes through `request()` below.
// No component should build a fetch URL by hand — this file is
// the single source of truth for how we talk to the backend.
//
// Endpoints mirror the uploaded backend exactly:
//   /api/auth/*         (routes/authRoutes.js)
//   /api/leetcode/*     (routes/leetcodeRoutes.js)
//   /api/leaderboard/*  (routes/leaderboardRoutes.js)
//   /api/students/*     (routes/studentRoutes.js)
//   /api/admin/*        (routes/adminRoutes.js)
// ============================================================

import {
  getAccessToken,
  getRefreshToken,
  setAccessToken,
  clearTokens
} from "./auth";

export const BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

export class ApiError extends Error {
  constructor(message, { status, data } = {}) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.data = data;
  }
}

// Fired when a refresh attempt fails so AuthContext can clear
// state and send the user back to /auth without every call site
// needing to know about token mechanics.
function announceSessionExpired() {
  window.dispatchEvent(new CustomEvent("campuscode:session-expired"));
}

let refreshPromise = null;

async function performRefresh() {
  const refreshToken = getRefreshToken();
  if (!refreshToken) return null;

  // Multiple 401s can land at once (e.g. a page firing several
  // requests on mount) - make sure we only ever refresh once.
  if (!refreshPromise) {
    refreshPromise = fetch(`${BASE_URL}/auth/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refreshToken })
    })
      .then(async (res) => {
        if (!res.ok) return null;
        const data = await res.json();
        if (data?.accessToken) {
          setAccessToken(data.accessToken);
          return data.accessToken;
        }
        return null;
      })
      .catch(() => null)
      .finally(() => {
        refreshPromise = null;
      });
  }

  return refreshPromise;
}

async function parseBody(res) {
  const contentType = res.headers.get("content-type") || "";
  if (!contentType.includes("application/json")) return null;
  try {
    return await res.json();
  } catch {
    return null;
  }
}

/**
 * @param {string} path        e.g. "/auth/send-otp"
 * @param {object} options
 * @param {string} options.method
 * @param {object} options.body        plain object -> sent as JSON
 * @param {FormData} options.formData  sent as multipart/form-data
 * @param {boolean} options.auth       attach the access token (default true)
 * @param {boolean} options.isRetry    internal - prevents infinite refresh loops
 */
export async function request(
  path,
  { method = "GET", body, formData, auth = true, isRetry = false } = {}
) {
  const headers = {};
  let requestBody;

  if (formData) {
    requestBody = formData; // browser sets the multipart boundary itself
  } else if (body !== undefined) {
    headers["Content-Type"] = "application/json";
    requestBody = JSON.stringify(body);
  }

  const token = auth ? getAccessToken() : null;
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  let res;
  try {
    res = await fetch(`${BASE_URL}${path}`, {
      method,
      headers,
      body: requestBody
    });
  } catch {
    throw new ApiError("Unable to connect to Campus Code. Check your connection and try again.");
  }

  // Expired/invalid access token on an authenticated call -> try a
  // single silent refresh, then retry the original request once.
  if ((res.status === 401 || res.status === 403) && auth && token && !isRetry) {
    const newToken = await performRefresh();
    if (newToken) {
      return request(path, { method, body, formData, auth, isRetry: true });
    }
    clearTokens();
    announceSessionExpired();
    throw new ApiError("Your session has expired. Please log in again.", { status: 401 });
  }

  const data = await parseBody(res);

  if (!res.ok) {
    const message = data?.message || "Something went wrong. Please try again.";
    throw new ApiError(message, { status: res.status, data });
  }

  return data;
}

// ------------------------------------------------------------
// AUTH
// ------------------------------------------------------------

export const authApi = {
  sendOtp: (email) => request("/auth/send-otp", { method: "POST", body: { email }, auth: false }),

  verifyOtp: (email, otp) =>
    request("/auth/verify-otp", { method: "POST", body: { email, otp }, auth: false }),

  completeProfile: (payload) =>
    request("/auth/complete-profile", { method: "POST", body: payload }),

  updateProfile: (payload) =>
    request("/auth/update-profile", { method: "PATCH", body: payload }),

  refresh: (refreshToken) =>
    request("/auth/refresh", { method: "POST", body: { refreshToken }, auth: false }),

  logout: (refreshToken) =>
    request("/auth/logout", { method: "POST", body: { refreshToken }, auth: false }),

  me: () => request("/auth/me")
};

// ------------------------------------------------------------
// LEETCODE
// ------------------------------------------------------------

export const leetcodeApi = {
  getStats: () => request("/leetcode/stats")
};

// ------------------------------------------------------------
// LEADERBOARD
// ------------------------------------------------------------

export const leaderboardApi = {
  campus: ({ page = 1, limit = 20 } = {}) =>
    request(`/leaderboard/campus?page=${page}&limit=${limit}`, { auth: false }),

  year: (year, { page = 1, limit = 20 } = {}) =>
    request(`/leaderboard/campus/year/${year}?page=${page}&limit=${limit}`, { auth: false }),

  me: () => request("/leaderboard/me")
};

// ------------------------------------------------------------
// STUDENTS
// ------------------------------------------------------------

export const studentApi = {
  me: () => request("/students/me"),

  publicProfile: (sicId) => request(`/students/${encodeURIComponent(sicId)}`, { auth: false }),

  uploadProfilePicture: (sicId, file) => {
    const formData = new FormData();
    formData.append("profilePicture", file);
    return request(`/students/${encodeURIComponent(sicId)}/profile-picture`, {
      method: "PATCH",
      formData
    });
  }
};

// ------------------------------------------------------------
// ADMIN
// ------------------------------------------------------------

export const adminApi = {
  stats: () => request("/admin/stats"),

  listStudents: ({ page = 1, limit = 20, search = "", year } = {}) => {
    const params = new URLSearchParams({ page, limit });
    if (search) params.set("search", search);
    if (year) params.set("year", year);
    return request(`/admin/students?${params.toString()}`);
  },

  studentDetail: (id) => request(`/admin/students/${id}`),

  updateStudent: (id, payload) =>
    request(`/admin/students/${id}`, { method: "PATCH", body: payload }),

  deleteStudent: (id) => request(`/admin/students/${id}`, { method: "DELETE" }),

  syncStudent: (id) => request(`/admin/sync/student/${id}`, { method: "POST" }),

  syncAll: (force = false) =>
    request("/admin/sync/all", { method: "POST", body: { force } })
};
