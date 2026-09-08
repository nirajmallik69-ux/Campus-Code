# Campus Code — Frontend

Silicon University's competitive coding leaderboard. This is the React/Vite frontend
that talks to the Campus Code backend (Express + MongoDB) already provided
separately — this project does **not** include or modify the backend.

**Code. Compete. Climb.**

---

## 1. Project overview

Campus Code tracks every registered student's LeetCode progress and turns it into a
single, live, campus-wide leaderboard — split by year, ranked by points
(Easy = 1pt, Medium = 2pt, Hard = 3pt), with individual student profiles, a student
dashboard, and an admin control panel for managing sync and searching students.

Every page is wired to the real backend API — there is no mock data, no fake
authentication, and no invented endpoints. See [`src/lib/api.js`](./src/lib/api.js)
for the single place every network call is made.

## 2. Requirements

- Node.js 18+ (Node 20 LTS recommended)
- npm 9+
- A running instance of the Campus Code backend (see the backend's own README/`.env.example`)

## 3. Installation

```bash
npm install
```

## 4. Environment variables

Copy `.env.example` to `.env` and point it at your backend:

```bash
cp .env.example .env
```

| Variable        | Required | Description                                             |
|-----------------|----------|-----------------------------------------------------------|
| `VITE_API_URL`  | Yes      | Base URL of the backend API, **including** `/api`. Example: `http://localhost:5000/api` |

Only variables prefixed `VITE_` are ever exposed to the browser by Vite. No backend
secrets (JWT secret, Mongo URI, Cloudinary keys, email credentials) belong here or
anywhere in this project.

## 5. Running locally

```bash
npm run dev
```

The app runs at `http://localhost:5173` by default. Make sure your backend is
running (default `http://localhost:5000`) and that its CORS `FRONTEND_URL` /
allowed dev origins include `http://localhost:5173`.

## 6. Backend URL configuration

All requests go through `VITE_API_URL`. To point the frontend at a deployed
backend, set `VITE_API_URL=https://your-backend-domain.com/api` in `.env` (or in
your hosting provider's environment variable settings) before building.

## 7. Production build

```bash
npm run build
```

Outputs static files to `dist/`. Preview the production build locally with:

```bash
npm run preview
```

## 8. Deployment notes

- This is a static single-page app — it can be deployed to Vercel, Netlify,
  Cloudflare Pages, GitHub Pages, or served from any static file host / CDN.
- Because it uses client-side routing (`react-router-dom`), configure your host to
  redirect all unknown paths to `index.html` (a SPA fallback rewrite rule),
  otherwise a hard refresh on `/dashboard` or `/student/:sicId` will 404.
- Set `VITE_API_URL` as a build-time environment variable on your hosting
  provider — Vite bakes `VITE_*` variables into the build at build time, not at
  runtime, so you must rebuild if the backend URL changes.
- Make sure the backend's `FRONTEND_URL` environment variable (CORS) includes
  your deployed frontend's origin.

---

## Project structure

```
src/
├── components/       Reusable UI building blocks
├── pages/            One file per route
├── lib/
│   ├── api.js        Central API layer (every fetch call lives here)
│   ├── auth.js        Access/refresh token storage helpers
│   └── utils.js        Formatting + validation helpers
├── context/
│   ├── AuthContext.jsx    Session state, login/logout, profile actions
│   └── ToastContext.jsx   Toast notifications
├── styles/global.css   Design system (CSS variables, components, responsive rules)
├── App.jsx              Routes + route guards
└── main.jsx             Entry point
```

## Authentication flow

The backend issues a short-lived **access token** (~15 min) and a longer-lived
**refresh token** (~7 days) via `POST /auth/verify-otp`. Both are bearer tokens
sent in request bodies/headers — the backend does not use cookies.

- `src/lib/auth.js` stores both tokens in `localStorage` so a page refresh doesn't
  log the user out.
- `src/lib/api.js` attaches `Authorization: Bearer <accessToken>` to every
  authenticated request. If a request comes back `401`/`403`, it silently calls
  `POST /auth/refresh` once and retries the original request. If the refresh
  itself fails, the session is cleared and the user is returned to `/auth`.
- `AuthContext` wraps all of this and exposes `sendOtp`, `verifyOtp`,
  `completeProfile`, `updateProfile`, `logout`, and the current `user`/`leetcode`
  state to the rest of the app.

## Route protection

- `ProtectedRoute` — requires a logged-in student with a completed profile
  (`/dashboard`, `/profile`).
- `OnboardingRoute` — requires a logged-in student **without** a completed
  profile (`/onboarding`); redirects completed students to `/dashboard`.
- `AdminRoute` — requires `user.role === "admin"` (`/admin`, `/admin/students/:id`).
- `GuestOnlyRoute` — keeps already-logged-in users off `/auth`.
- `/`, `/about`, and `/student/:sicId` are public with no guard.

---

## Backend endpoints used (verified against the uploaded backend)

### Auth (`/api/auth`)
- [x] `POST /auth/send-otp` — `{ email }`
- [x] `POST /auth/verify-otp` — `{ email, otp }` → `{ accessToken, refreshToken, user }`
- [x] `POST /auth/complete-profile` (auth) — `{ name, sicId, year, whatsappNumber, leetcodeUsername }`
- [x] `PATCH /auth/update-profile` (auth) — `{ name?, year?, whatsappNumber? }`. `leetcodeUsername` is intentionally not accepted here anymore — it's locked once set; only `PATCH /admin/students/:id` can change it.
- [x] `POST /auth/refresh` — `{ refreshToken }` → `{ accessToken }`
- [x] `POST /auth/logout` — `{ refreshToken }`
- [x] `GET /auth/me` (auth) → `{ user, leetcode }`

### LeetCode (`/api/leetcode`)
- [x] `GET /leetcode/stats` (auth) → `{ message, stats }` (cache-aware; may `503` if LeetCode is unreachable)

### Leaderboard (`/api/leaderboard`)
- [x] `GET /leaderboard/campus?page=&limit=`
- [x] `GET /leaderboard/campus/year/:year?page=&limit=`
- [x] `GET /leaderboard/me` (auth) — *not currently consumed; the dashboard uses the richer `GET /students/me` instead, which already includes campus/year rank in one call.*

### Students (`/api/students`)
- [x] `GET /students/me` (auth) → `{ user, leetcode, ranking }`
- [x] `GET /students/:sicId` (public) → `{ name, sicId, year, leetcodeUsername, profilePicture, ranking, leetcode }`
- [x] `PATCH /students/:sicId/profile-picture` (auth, multipart `profilePicture` field, ≤500 KB, JPG/PNG/WebP)

### Admin (`/api/admin`, all auth + admin role)
- [x] `GET /admin/stats`
- [x] `GET /admin/students?page=&limit=&search=&year=`
- [x] `GET /admin/students/:id`
- [x] `PATCH /admin/students/:id` — `{ name?, year?, whatsappNumber?, leetcodeUsername? }` (the only way to change a student's LeetCode username once set)
- [x] `DELETE /admin/students/:id` — permanently deletes the student, their cached stats, Cloudinary picture, and active sessions
- [x] `POST /admin/sync/student/:id`
- [x] `POST /admin/sync/all` — `{ force? }`

## Known backend gaps / mismatches discovered

1. **No server-side search on the public leaderboard.** `GET /leaderboard/campus`
   and `GET /leaderboard/campus/year/:year` accept only `page`/`limit` — there is
   no `search` query parameter (unlike `GET /admin/students`, which does support
   one). The landing-page leaderboard's search box therefore filters **only the
   currently loaded page** of results client-side; it does not — and cannot —
   search the entire campus. This is clearly noted in the UI's empty state and in
   a code comment at the top of `src/components/Leaderboard.jsx`. If full-campus
   search is wanted, the backend would need a `search` param added to those two
   routes (the same prefix-regex approach already used in `adminRoutes.js` would
   work).
2. **No exposed LeetCode contest rating.** The spec asked for "LeetCode Rating if
   available," but no read endpoint (`/auth/me`, `/students/me`, `/students/:sicId`,
   `/leaderboard/*`) returns a rating field — only `leetcodeRank` (global rank) is
   ever exposed, even though `syncStudentStats`/`leetcodeRoutes.js` only ever sets
   `leetcodeRank`, never a rating field. The frontend shows Global Rank where
   available and omits a rating field entirely rather than inventing one.
3. **Students cannot force a fresh sync.** Only `GET /leetcode/stats` is available
   to students, and it is cache-gated (6 hours) with no way to bypass the cache
   from the student side — only admins can force a sync (`force: true` is
   admin-only, via `/admin/sync/*`). The dashboard's "Sync LeetCode" button
   therefore calls the real cache-aware endpoint and honestly reports "already up
   to date" when the cache is still fresh, rather than pretending to force a sync
   it can't actually perform.

None of the above required inventing a fake endpoint — in each case the frontend
degrades to what the real backend actually supports and says so in the UI/code.

## Customizing the "Meet the developer" section

`src/pages/About.jsx` has a `DEVELOPER` config object at the top of the file —
edit `name`, `role`, `bio`, `linkedin`, and (optionally) `github`/`website`
there. Leave `github`/`website` as an empty string to hide those buttons
entirely. Drop a photo into `src/assets/` and point `photo` at it, or leave it
`null` to fall back to an initials avatar.

## What could not be tested

This project was built and hand-reviewed for syntax and API-contract correctness,
but **could not be run, installed, or built** in the environment it was written in
— that sandbox has no outbound network access, so `npm install` cannot reach the
npm registry and `npm run build` was never executed. Before relying on this in a
demo:

```bash
npm install
npm run build   # fix any errors this surfaces
npm run dev     # click through every flow against a real running backend
```

Please treat this as thoroughly hand-reviewed, contract-verified code rather than
a build-verified one, and budget time to run through the checklist above once
before your evaluation.
