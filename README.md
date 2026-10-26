# Darsan — temple darshan and vazhipadu booking

A mobile-first, bilingual (English / മലയാളം) web portal for Kerala temples:

- **Website** — temple pages with daily pooja schedules and contact details, and temple notices (festivals, timing changes, closures) with a "new notices" bell.
- **Darshan** — pick a temple, a day and a time slot, and book up to 10 tickets; see and cancel your bookings.
- **Vazhipadu** — choose offerings (Pushpanjali, Archana, Palpayasam…), fill in the devotee's name, birth star and date, place the order and get a printable receipt.
- **Admin portal** — dashboard, darshan booking search, vazhipadu orders (filters, paging, CSV export), slot capacity, offering prices, and notice publishing. Staff are limited to their own temple.

All data comes from an **in-browser mock API** that behaves like a real one: random latency, a configurable failure rate, "saved but the response was lost" failures, idempotency keys, token checks and role checks. Nothing is sent anywhere and no real payments are made.

## Demo accounts

| Login page     | Username  | Password     | Role                               |
| -------------- | --------- | ------------ | ---------------------------------- |
| `/login`       | `devotee` | `devotee123` | Devotee (Anil Kumar, has bookings) |
| `/login`       | `lakshmi` | `lakshmi123` | Devotee                            |
| `/admin/login` | `staff`   | `staff123`   | Staff, Sree Krishna Temple only    |
| `/admin/login` | `admin`   | `admin123`   | Admin, all temples                 |

Devotees can also create an account at `/register`. Plain-text passwords are acceptable only because this is a mock.

## Quick start

Requires Node.js 22.12+ (CI uses 24, see `.nvmrc`).

```bash
npm ci
npm run dev        # http://localhost:5173
```

Useful URL switches in development: `?fail=0.5` (50% of requests fail) and `?latency=0` (no delay), e.g. `http://localhost:5173/darshan?fail=0.5`.

## Scripts

| Command                           | What it does                                          |
| --------------------------------- | ----------------------------------------------------- |
| `npm run dev`                     | Dev server with hot reload                            |
| `npm run build`                   | Type check, then production build into `dist/`        |
| `npm run preview`                 | Serve the production build locally                    |
| `npm test`                        | All tests once (Vitest + Testing Library)             |
| `npm run test:watch`              | Tests in watch mode                                   |
| `npm run coverage`                | Tests with coverage (HTML report in `coverage/`)      |
| `npm run typecheck`               | TypeScript, strict                                    |
| `npm run lint`                    | oxlint                                                |
| `npm run format` / `format:check` | Prettier                                              |
| `npm run check`                   | Everything CI runs: format, types, lint, tests, build |

## Tech stack

React 19 · TypeScript (strict) · Vite 8 · Tailwind CSS v4 · shadcn/ui on Radix · Redux Toolkit + redux-saga · React Router · react-hook-form + zod · Vitest + React Testing Library · oxlint · Prettier.

## How it is built

```
component ──dispatch──▶ saga ──call──▶ mock API ──▶ saga ──put──▶ slice ──select──▶ component
```

- **Components never call the API.** Sagas do, through `callApi()`, which logs the user out everywhere if the server says the session has expired.
- **Every async slice** has `{ data, status: 'idle' | 'loading' | 'success' | 'error', error }`.
- **Lists use `takeLatest` plus a request id**, so a slow answer to an old filter never replaces a newer one.
- **Submits use `takeLeading` plus an idempotency key.** The key is kept across retries of the same details, so a retry after a lost response returns the original booking or order instead of creating a duplicate.
- **Cancels and admin edits are optimistic.** The change shows at once and rolls back with an error message if the server refuses.
- **The URL is the source of truth for filters** (temple, date, status, page, search). Links can be shared, survive a refresh, and Back works.
- **Persisted in localStorage** (versioned, validated on load): session, language, cart, last-seen notices, and sign-ups. The mock data itself resets on a full reload by design.
- **Pages outside the public website load on demand** (`src/pages/lazyPages.tsx`), so a first visit downloads only the website.

### Folder structure

```
src/
  api/          mock API: mockClient (latency/failures/idempotency), db, seed, session,
                authApi, templeApi, noticeApi, bookingApi, orderApi, adminApi; data/*.json
  store/        Redux slices + sagas per feature (auth, notices, temples, darshan,
                vazhipadu, orders, admin), callApi, notify, persistence
  components/   ui/ (shadcn), common/, temples/, notices/, darshan/, vazhipadu/, admin/, auth/
  pages/        public pages, darshan/, vazhipadu/, admin/, lazyPages.tsx
  layouts/      AppLayout, AdminLayout, route guards
  i18n/         en.ts, ml.ts (typed: a missing Malayalam key is a type error), useT()
  hooks/  lib/  types/
tests/          api/, store/, lib/, integration/ (full app in a memory router)
docs/           PLAN.md (architecture and decisions), EXECUTION_PLAN.md
```

## Mock API settings

| Variable                 | Default                                | Meaning                                          |
| ------------------------ | -------------------------------------- | ------------------------------------------------ |
| `VITE_MOCK_FAILURE_RATE` | darshan 0.2, vazhipadu 0.1, other 0.05 | Share of requests that fail (0–1)                |
| `VITE_MOCK_LATENCY_MS`   | random 200–1500 ms                     | Fixed delay instead                              |
| `VITE_MOCK_URL_PARAMS`   | `false`                                | Allow `?fail=` / `?latency=` on a deployed build |

These are read at **build time**. Copy `.env.example` to `.env.local` for local builds, or set them in your host's build settings. The included Netlify and Docker configs use a failure rate of 0.05, so a public demo fails 1 request in 20 rather than 1 in 5 (darshan's default).

## Deployment

`npm run build` produces a static site in `dist/`. Any static host works if it:

1. **serves `index.html` for unknown paths** (single-page app fallback), and
2. ideally **sends the security headers** below.

Configs for both are included:

| Host                    | How                                                                                                                                                                          |
| ----------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Netlify**             | Connect the repo. `netlify.toml` sets the build, SPA fallback, headers and caching.                                                                                          |
| **Vercel**              | Import the repo. `vercel.json` sets rewrites and headers. Set `VITE_MOCK_FAILURE_RATE=0.05` under Environment Variables.                                                     |
| **Docker / any server** | `docker build -t darsan-web . && docker run -p 8080:8080 darsan-web` builds with Node and serves with unprivileged nginx (`nginx.conf`). Put HSTS on the TLS proxy in front. |

**Security headers** (in all three configs):

- **Content-Security-Policy:**
  - Scripts only from the site itself (no inline or `eval`). Zod runs in its no-eval mode for this, and lint enforces it.
  - Fonts from Google Fonts only.
  - No framing.
- **Also:** `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, a strict `Referrer-Policy`, a `Permissions-Policy`, and HSTS (on Netlify and Vercel).

The production build was checked under this policy in headless Chrome: every page, including the lazy admin pages after login, ran with no violations.

**Caching:** files in `/assets/` have content hashes in their names and are cached for a year. `index.html` is always revalidated, so a new deploy shows up immediately.

**CI:** `.github/workflows/ci.yml` runs format, type check, lint, tests and build on every push and pull request, and uploads `dist/` as an artifact.

## Testing

217 tests (about 92% of statements are covered):

- **API** — latency bounds, failure rate, forced failures, idempotent replay, "failed after save", booking and order rules, permissions, paging, sign-up.
- **Store** — stale-response guard, unread notice count, cart totals and limits, cart persistence and price sync.
- **Integration** — the whole app, rendered with real routes, store and sagas, covering:
  - website pages and Malayalam switching
  - login portals and route guards
  - the admin portal
  - darshan P1–P5: 3 of 10 → 7 left, Back restores the selection, slow-vs-fast response race, double click → one booking, lost response → no duplicate, optimistic cancel and rollback, IST on a New York device, keyboard-only booking
  - vazhipadu: "push" → Pushpanjali, ₹110 total, per-field errors, cart survives reload, one temple per cart, safe submit and receipt

## Accessibility and language

- **Keyboard:**
  - A skip link, then a logical tab order.
  - The day picker is one tab stop with arrow keys; dialogs trap focus and return it to the button that opened them.
  - Focus moves to the new page's content on navigation, and to the confirmation after a booking or order.
- **Forms:**
  - Every field has a label, and errors are linked with `aria-describedby`.
  - An error summary takes focus after a failed submit.
- **Screen readers:** results and errors are announced through a live region.
- **Language:** English and Malayalam for all interface text, nakshatras, dates and times. Times are always IST (`Asia/Kolkata`) whatever the device time zone. `<html lang>` follows the choice, and the choice is remembered.
- **Layout and colour:** works from 360 px wide with no sideways scrolling. Tap targets are at least 44 px. Text colours meet WCAG AA contrast.

## Photo credits

Photos are freely licensed and listed with their authors and licences in the site footer (from `src/assets/images/credits.json`). The five offering photos are from Wikimedia Commons. The hero and temple photos were added before credits were recorded, so their sources should be filled into `credits.json` before a public launch.

## Known limitations

- The "server" runs in the browser: bookings and orders reset on a full page reload (by design). Sign-ups, the session, the cart and the language choice persist.
- Mock authentication with plain-text passwords. Don't reuse it as a real login.
- No real payments, SMS or email.
- Multi-day vazhipadu (one order repeated over a date range) is out of scope (see `docs/PLAN.md`).
