# Darsan Web — Complete Execution Plan

This is the step-by-step plan for building **darsan-web**. The design reference (architecture, data models, mock API rules, UI palette, decisions) is [PLAN.md](./PLAN.md). This file says **what gets done, in what order, and when work stops for your review**.

**Rule for every phase:** work stops at each ⛔ checkpoint and waits for your "go". Nothing is pushed to GitHub, and no next phase starts, without your approval.

---

## 1. Project facts

| Item                | Value                                                                                                                                                                                    |
| ------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Project / repo name | `darsan-web` (public GitHub repo, your account)                                                                                                                                          |
| Local folder        | `C:\Users\hh\darsan-web`                                                                                                                                                                 |
| Old folder          | `C:\Users\hh\customer-app`: outdated copy. Couldn't be renamed while VS Code had it open. Delete it once you've switched folders.                                                        |
| Stack               | React 19 · TypeScript 6 (strict) · Vite 8 · Tailwind CSS v4 · shadcn/ui (Radix) · Redux Toolkit + redux-saga · React Router 8 · react-hook-form + zod 4 · Vitest + React Testing Library |
| Modules             | **Darshan** (slot tickets) first, then **Vazhipadu** (offerings), then admin tools                                                                                                       |
| Roles               | Guest (not logged in), DEVOTEE, STAFF (tied to one temple), ADMIN                                                                                                                        |
| Login               | Mock login; users stored in `src/api/data/users.json`                                                                                                                                    |
| Data                | Mock API in `src/api/`, in memory, random 200–1500 ms delay, configurable failure rate                                                                                                   |
| Languages           | English and Malayalam                                                                                                                                                                    |

### Demo users (`src/api/data/users.json`)

| Username  | Password     | Role    | Notes                                       |
| --------- | ------------ | ------- | ------------------------------------------- |
| `devotee` | `devotee123` | DEVOTEE | Anil Kumar, 9847012345; has seeded bookings |
| `lakshmi` | `lakshmi123` | DEVOTEE | Lakshmi Nair, 9995012345                    |
| `staff`   | `staff123`   | STAFF   | Ravi Menon, Sree Krishna Temple only        |
| `admin`   | `admin123`   | ADMIN   | All temples                                 |

### What each role can do

| Action                                 |  Guest  | Devotee  |        Staff         | Admin  |
| -------------------------------------- | :-----: | :------: | :------------------: | :----: |
| View temples, slots, offerings         |   ✅    |    ✅    |          ✅          |   ✅   |
| Book darshan / place vazhipadu order   | → login |    ✅    | ✅ (counter booking) |   ✅   |
| See own bookings / orders              |    —    |    ✅    |          ✅          |   ✅   |
| Search any devotee's bookings / orders |    —    |    —     |    ✅ own temple     | ✅ all |
| Cancel any booking / order             |    —    | own only |    ✅ own temple     | ✅ all |
| Dashboard, slot and rate management    |    —    |    —     |          —           |   ✅   |

---

## 2. Current status (when this plan was written)

Done in `C:\Users\hh\darsan-web` (nothing committed yet; no git repo yet):

- [x] Vite React-TS scaffold, strict TypeScript, `@/` path alias, npm scripts
- [x] Tailwind v4 + shadcn/ui (Radix) components + temple colour theme (`src/index.css`)
- [x] All dependencies installed
- [x] Domain types (`src/types/index.ts`), constants (27 nakshatras), date (IST) / currency (₹) / phone helpers, permissions map
- [x] JSON seed data: 4 users, 3 temples, 30 offerings (6 inactive)
- [x] Mock API: network simulator, idempotency, in-memory DB, auth, temples, darshan bookings, vazhipadu orders
- [x] Store skeleton (language + announcer slices), i18n (EN/ML), layout, header, footer, skip link, loading/empty/error components, home and 404 pages
- [x] 7 photos converted to WebP (hero, 3 temples, lamp, payasam, abhishekam), all ≤ 126 KB, with license credits
- [ ] **Not verified yet:** type check, build and dev server have not been run since the last files were written
- [ ] Not done: tests, README, PR template, git init, GitHub repo, offering photos for Pushpanjali / Archana / Nivedyam / Homam / Special

**First action when you approve:** Phase 1, step 1 (verify what exists), _before_ writing anything new.

---

## 3. Working rules (every phase)

### Git and PRs

1. `main` gets exactly **one** direct commit (Phase 1). Everything else goes branch → PR → review → merge.
2. Each branch starts from the latest `main`: `git switch main && git pull && git switch -c <branch>`.
3. Commits are small and describe the change ("Add slot list for selected temple"). Never "fix", "wip", "changes" or "final".
4. Before opening a PR, all must pass: `npm run typecheck`, `npm run lint`, `npm test`, `npm run build`.
5. PR description uses the template (§9): Problem / Assumptions / Decisions & trade-offs / How to test, plus "AI corrections" where relevant.
6. Review: read the full diff, leave **at least one comment on a specific line**, then address it with a follow-up commit or a reply.
7. Merge with **squash**, delete the branch, `git pull` on `main`.

### Code standards

- Components never call the API directly: component → action → saga → API → slice → selector.
- Every async slice uses `{ data, status: 'idle'|'loading'|'success'|'error', error }`.
- Fetches use `takeLatest`; submits use `takeLeading` + an idempotency key.
- Every user-visible string goes in `src/i18n/en.ts` **and** `ml.ts` (the type check fails if one is missing).
- Every form field has a `<label>`; tests find fields with `getByLabelText`.
- Mobile first; nothing wider than 360 px; tap targets ≥ 44 px.

### Checkpoint report (at every ⛔)

At each stop I report: what was done, test/build results, PR link, screenshots or what to click to check it, open questions.

---

## 4. Phase 0 — Prerequisites (you)

| #   | Task                                                          | Why                               |
| --- | ------------------------------------------------------------- | --------------------------------- |
| 0.1 | Install GitHub CLI: `winget install GitHub.cli`               | Needed to create the repo and PRs |
| 0.2 | Log in: `gh auth login` (GitHub.com → HTTPS → browser)        | Lets me push and open PRs as you  |
| 0.3 | Open `C:\Users\hh\darsan-web` in VS Code (File → Open Folder) | The project now lives there       |
| 0.4 | (Optional) delete `C:\Users\hh\customer-app` after switching  | It's an outdated copy             |

⛔ **Checkpoint 0:** tell me when 0.1–0.3 are done.

---

## 5. Phase 1 — Base project on `main`

**Goal:** a working, tested base that every feature builds on.

| Step | Task                                                                                                                                                                                                                                           | Output                           |
| ---- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------- |
| 1.1  | Verify existing work: `npm run typecheck`, `npm run build`, `npm run dev`; fix any errors                                                                                                                                                      | Clean build                      |
| 1.2  | Test setup: `tests/setup.ts` (jest-dom, reset localStorage, reset mock DB, fast mock config), `tests/utils/renderWithProviders.tsx` (store + memory router)                                                                                    | Test harness                     |
| 1.3  | Mock API tests: latency range, failure rate, `failNextCalls`, idempotent replay, "failed after save" case, slot/booking rules, order paging, permission checks                                                                                 | `tests/api/*.test.ts`            |
| 1.4  | Seed data tests: users/temples/offerings JSON match their types; each temple has 8–10 offerings; ~50 orders; 7 days of slots; some full, some started                                                                                          | `tests/api/seed.test.ts`         |
| 1.5  | Smoke test: app renders home page, skip link is first, 404 works                                                                                                                                                                               | `tests/integration/App.test.tsx` |
| 1.6  | Remaining offering photos (Pushpanjali flowers, Archana, Nivedyam, Homam fire, Special) from Wikimedia Commons, WebP ≤ 150 KB, credits added. **No photos of identifiable children.** If rate-limited, the existing lamp photo is the fallback | `src/assets/images/*`            |
| 1.7  | `.github/pull_request_template.md`                                                                                                                                                                                                             | PR template                      |
| 1.8  | `README.md`: about, demo users, how to run / test / build, folder structure, mock API settings (`?fail=`, `?latency=`), photo credits, PR links table (filled in later)                                                                        | README                           |
| 1.9  | `git init -b main`, one commit "Set up Vite React TypeScript project with mock API", `gh repo create darsan-web --public --source . --push`                                                                                                    | Repo on GitHub                   |

**Done when:** typecheck, lint, tests and build all pass; dev server shows the home page; repo is on GitHub.

⛔ **Checkpoint 1:** you open the dev server and the repo and approve.

---

## 6. Phase 2 — PR A0: Login and roles

**Branch:** `feature/auth-login`

| Area    | Work                                                                                                                                                                                                       |
| ------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Store   | `store/auth`: slice `{ user, token, status, error, restoring }`; saga: `login` (takeLeading), `restoreSession` on start-up (`authApi.me`), `logout`; saves the token to localStorage; calls `setAuthToken` |
| Pages   | `/login`: username, password (show/hide), errors under fields, "Incorrect username or password", loading button, demo users box, `?redirect=` back after login. `/403` page                                |
| Routing | `RequireAuth` (sends guests to `/login?redirect=…`), `RequireRole([...])` (sends wrong roles to `/403`)                                                                                                    |
| Header  | Login button for guests; user menu (name, role badge, Log out) for users; nav shows only allowed links                                                                                                     |
| Rules   | A network error during session restore keeps the user logged in and retries; only an "expired/invalid" answer logs them out                                                                                |

**Commits (planned):**

1. Add auth slice and session persistence
2. Add login and session restore sagas
3. Add login page with validation
4. Add route guards for login and roles
5. Show user menu and logout in header
6. Add login and route guard tests

**Tests:** wrong password shows error · correct login redirects back · devotee opening an admin route gets 403 · guest opening a protected page goes to login · refresh keeps the session · logout clears it.

⛔ **Checkpoint A0:** PR reviewed and merged; you try all 4 demo users.

---

## 7. Phase 3 — Darshan P1: Slot list and booking form

**Branch:** `feature/p1-slot-list-booking` · Brief: Grade I P1

| Area          | Work                                                                                                                                                                                                              |
| ------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Store         | `temples` slice + saga (shared by both modules); `slots` slice + saga (`getSlots`); `booking` slice + saga (`createBooking`)                                                                                      |
| Page          | `/darshan`: temple select, date select (today + 6 days, shown as buttons on desktop, select on mobile), slot cards: IST start time, remaining / capacity, badges **Full** and **Started** (disabled, with reason) |
| Form          | Opens for the chosen slot: name, phone (prefilled from the logged-in user, editable), tickets (1 to min(10, remaining)). zod validation with a message under each field. Guests are sent to login first           |
| After booking | Success panel with booking ref; slot list updates (3 booked of 10 → 7 remaining)                                                                                                                                  |
| States        | Skeleton while loading · "No slots for this day" · error with **Try again**                                                                                                                                       |
| Home          | Add the "Book Darshan" card; header gets a "Darshan" link                                                                                                                                                         |

**Commits:** Add temples and slots state with sagas · Add darshan page with temple and date pickers · Show slot cards with remaining tickets and status · Add booking form with validation · Update remaining tickets after booking · Add darshan home card and nav link · Add slot list and booking tests

**Tests (acceptance):** booking 3 in a slot with 10 left shows 7 · form rejects more tickets than remain · full and started slots can't be booked · load failure shows error, retry works · empty day shows empty state.

⛔ **Checkpoint P1**

---

## 8. Phase 4 — Darshan P2: Shareable filters

**Branch:** `feature/p2-shareable-filters` · Brief: Grade I P2

| Work        | Detail                                                                                                                                                              |
| ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| URL state   | `/darshan?temple=tm-sastha&date=2026-10-31`; the URL is the single source of truth; each change adds a history entry, so **Back** returns to the previous selection |
| Bad links   | Unknown temple or a date outside the 7 days → falls back to the default and shows a short notice                                                                    |
| Race safety | `takeLatest` cancels the old request; slice also stores a `requestId` and ignores late answers                                                                      |
| Share       | "Copy link" button (falls back to showing the link if the clipboard is blocked)                                                                                     |

**Commits:** Read and write temple and date from the URL · Ignore stale slot responses · Handle invalid temple or date in links · Add copy link button · Add shareable link and race tests

**Tests:** opening a link shows that temple and date · Back restores the previous selection · **slow first response arriving after a fast second one does not replace the slots** (deferred promises resolved out of order).

⛔ **Checkpoint P2**

---

## 9. Phase 5 — Darshan P3: Safe submit

**Branch:** `feature/p3-safe-submit` · Brief: Grade I P3

| Work         | Detail                                                                                                                                                                                                                       |
| ------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Double tap   | Button disabled + "Booking…" while sending; saga uses `takeLeading`, so extra clicks are ignored                                                                                                                             |
| Retry safety | One idempotency key per booking attempt, kept across retries and replaced only after success or when the form changes. The mock API sometimes saves and _then_ fails; a retry with the same key returns the original booking |
| Failure      | Error message above the form with **Try again**; every typed value stays                                                                                                                                                     |
| PR text      | Explains the mock API change (idempotency store + "failed after save" mode)                                                                                                                                                  |

**Commits:** Disable booking button while submitting · Ignore repeat submits in booking saga · Reuse idempotency key on retry · Keep form values after a failed booking · Add safe submit tests

**Tests:** double-click Book → exactly one booking · failure keeps values and retry succeeds · "saved but response lost" + retry → still one booking, remaining tickets dropped only once.

⛔ **Checkpoint P3**

---

## 10. Phase 6 — Darshan P4: My bookings and cancellation

**Branch:** `feature/p4-my-bookings` · Brief: Grade I P4

| Work      | Detail                                                                                                                               |
| --------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| Page      | `/darshan/my-bookings`: devotee sees their bookings straight away (own phone); staff/admin get a phone search box (`?phone=` in URL) |
| Columns   | Temple · date · start time (IST) · tickets · status · action. Cards on mobile                                                        |
| Cancel    | Confirm dialog → shows **Cancelled** at once (optimistic) → on API failure it goes back to **Booked** with an error message          |
| Started   | No active cancel button; text: "Darshan has started — it can no longer be cancelled"                                                 |
| Time zone | All times in Asia/Kolkata whatever the device setting                                                                                |

**Commits:** Add my bookings state and saga · Add my bookings page with phone search for staff · Add cancel confirmation dialog · Cancel optimistically and roll back on failure · Block cancelling started bookings with a reason · Add my bookings tests

**Tests:** cancel shows cancelled at once · failure reverts and shows error · started booking shows reason, no button · times correct when the device time zone is not India (`TZ=America/New_York`).

⛔ **Checkpoint P4**

---

## 11. Phase 7 — Darshan P5: Accessibility and Malayalam

**Branch:** `feature/p5-a11y-malayalam` · Brief: Grade I P5 (WCAG 2.2 AA)

| Work           | Detail                                                                                                                                   |
| -------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| Language       | EN / മലയാളം toggle in the header; all labels, buttons, statuses, nakshatras, dates and times switch; choice saved; `<html lang>` updated |
| Keyboard       | Whole flow (temple → date → slot → form → book) with Tab / Enter / Space / arrows; visible focus ring; dialogs trap focus and return it  |
| Screen readers | Booking success or error is announced through the live region; after success, focus moves to the confirmation heading                    |
| Forms          | Every field has a label; errors linked with `aria-describedby`; error summary focused on failed submit                                   |
| Layout         | 360 px check on all darshan pages; contrast check                                                                                        |
| PR text        | Written keyboard walkthrough                                                                                                             |

**Commits:** Add language toggle and save the choice · Translate darshan screens to Malayalam · Format dates and times by language · Announce booking result to screen readers · Move focus to confirmation after booking · Link field errors for screen readers · Fix layout at 360 px · Add keyboard flow and language tests

**Tests:** keyboard-only booking (user-event `tab` / `keyboard`, no clicks) · switching to Malayalam changes labels, buttons and date format · fields found by label in both languages.

⛔ **Checkpoint P5 — big review.** Darshan module complete. You review the whole app before Vazhipadu starts.

---

## 12. Phases 8–12 — Vazhipadu V1–V5 (after your approval)

Same workflow and level of detail; full scope is in PLAN.md §7.

| Phase | Branch                          | Scope                                                                                                                                         | Key tests                                                                  |
| ----- | ------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------- |
| 8     | `feature/v1-offerings-list`     | Temple select, offerings with photo + ₹ price, search, category tabs, inactive hidden, loading/empty/error                                    | "push" → only Pushpanjali; failure → retry                                 |
| 9     | `feature/v2-cart-and-form`      | Cart (add, quantity, remove), ₹ totals, saved in localStorage, one temple per cart, order form (name, phone, 27 nakshatras, date ≥ today IST) | 2×₹30 + 1×₹50 = ₹110; message per invalid field; refresh keeps cart        |
| 10    | `feature/v3-order-confirmation` | Place order with `takeLeading` + idempotency key, failure keeps cart + form, receipt page, cart emptied                                       | double-click → one order; failure → retry works                            |
| 11    | `feature/v4-orders-list-staff`  | Staff/admin orders table: date, status, phone filters in URL; pages; cancel with confirm, updates without reload                              | status filter → page 1; refresh keeps filters + page; cancel shows at once |
| 12    | `feature/v5-mobile-and-a11y`    | 360 px for offerings, cart, form; keyboard flow; labels; contrast; Malayalam for vazhipadu screens                                            | keyboard order flow; label queries                                         |

⛔ Checkpoint after each phase.

---

## 13. Phase 13 — Admin tools

| Branch                    | Scope                                                              |
| ------------------------- | ------------------------------------------------------------------ |
| `feature/admin-dashboard` | Counts by status, today's bookings and orders, revenue; admin only |
| `feature/admin-slots`     | Change capacity, block / unblock a slot                            |
| `feature/admin-rates`     | Edit offering price, turn offerings on / off                       |
| `feature/admin-export`    | CSV export of the filtered orders list                             |

⛔ Checkpoint after each.

---

## 14. Phase 14 — Final

1. Branch `docs/final-readme`: README PR links table, screenshots, final assumptions summary.
2. Full check: typecheck, lint, all tests, build, manual run at 360 px and desktop, keyboard-only run.
3. Repo check: every PR uses the template, has a line comment that was addressed, and is merged; no direct commits to `main` after Phase 1.

⛔ **Final checkpoint.**

---

## 15. Planned folder structure (end state)

```
darsan-web/
├── .github/pull_request_template.md
├── docs/                 PLAN.md, EXECUTION_PLAN.md
├── src/
│   ├── api/              mockClient, db, seed, session, authApi, templeApi, bookingApi, orderApi
│   │   └── data/         users.json, temples.json, offerings.json
│   ├── assets/images/    *.webp + credits.json
│   ├── components/
│   │   ├── ui/           shadcn components
│   │   ├── common/       Header, Footer, SkipLink, Announcer, states, Price, LanguageToggle, UserMenu
│   │   ├── darshan/      TemplePicker, DatePicker, SlotCard, BookingForm, BookingCard, CancelDialog
│   │   ├── vazhipadu/    OfferingCard, OfferingSearch, CartDrawer, CartLine, OrderForm, Receipt
│   │   └── admin/        FilterBar, OrdersTable, Pagination, StatsCards, SlotManager, RateManager
│   ├── hooks/            useUrlState, useDebounce
│   ├── i18n/             en.ts, ml.ts, index.ts (useT)
│   ├── layouts/          AppLayout, RequireAuth, RequireRole
│   ├── lib/              constants, date, currency, phone, permissions, images, utils, validators
│   ├── pages/            Home, Login, Forbidden, NotFound, darshan/*, vazhipadu/*, admin/*
│   ├── store/            index, rootReducer, rootSaga, hooks, persistence + one folder per slice
│   ├── types/            index.ts
│   ├── router.tsx, App.tsx, main.tsx, index.css
└── tests/                setup, utils, api/, store/, integration/
```

---

## 16. PR template (`.github/pull_request_template.md`)

```markdown
## Problem

What this PR solves (1–2 lines).

## Assumptions

Gaps in the problem statement and what I decided.

## Decisions & trade-offs

What I chose, and why over the alternatives.

## AI corrections

Places where AI-generated code or advice was wrong and how it was fixed.

## How to test

Commands, steps in the UI, test files.
```

---

## 17. Risks and open questions

| Risk / question                                                                 | Plan                                                                                                                            |
| ------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| Wikimedia rate-limits image downloads                                           | Download a few at a time with waits; the lamp photo is the fallback image                                                       |
| Mock data resets on a full reload (in-memory, as the brief requires)            | Bookings made in a session disappear after reload; login, language and cart are kept in localStorage. Written in README and PRs |
| Plain-text passwords in `users.json`                                            | Fine for a mock only; README says so                                                                                            |
| shadcn CLI generated broken `cn` imports and a Base UI style                    | Already fixed (Radix style, `@/lib/utils`); listed under "AI corrections" in the Phase 1 notes                                  |
| `@hookform/resolvers` v6 has a peer conflict                                    | Pinned to v5                                                                                                                    |
| **Open:** should guests be able to view slots without logging in?               | Plan says yes (login is asked only when booking). Tell me if you want login required for everything                             |
| **Open:** should staff be able to book on behalf of devotees (counter booking)? | Plan says yes. Tell me if not                                                                                                   |
