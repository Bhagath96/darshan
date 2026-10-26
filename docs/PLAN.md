# Darsan Web — Architecture & Execution Plan (v3)

**Project:** Darsan Web — temple Darshan and Vazhipadu booking portal with multiple user roles
**Repo:** `darsan-web` (local folder `C:\Users\hh\darsan-web`)
**Platform:** Web, mobile-first (360px and up), WCAG 2.2 AA, English / Malayalam
**Stack:** React 18+ · TypeScript (strict) · Vite · Tailwind CSS · shadcn/ui · Redux Toolkit + redux-saga · React Router · react-hook-form + zod · Vitest + React Testing Library

v3 changes: renamed to **darsan-web**; one repo for all user roles with a **mock login** (users in JSON, served by the mock API); **Darshan module is built first** (P1–P5), then Vazhipadu (V1–V5), then admin extras.

v2 merged the TDB Portal architecture document into the first plan. Where the document conflicted with the requirements or with the chosen stack, §11 lists the change and the reason. That list is also the record of "places where the AI was corrected" for the walkthrough.

---

## 1. Goals

One lightweight, accessible portal that joins **Darshan** (slot tickets) and **Vazhipadu** (temple offerings) in a single repo for several user roles:

| Role                      | Can do                                                                                                                |
| ------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| **Guest** (not logged in) | Home, browse temples, view Darshan slots and offerings. Booking redirects to login.                                   |
| **Devotee**               | Book Darshan slots, My Bookings + cancel, Vazhipadu cart and orders, own profile (name/phone prefilled), switch EN/ML |
| **Staff**                 | Everything a devotee sees, plus the bookings and orders lists for their temple (filter, search, paging, cancel)       |
| **Admin**                 | All temples, dashboard metrics, slot management (capacity, block), offering rates and active flag, CSV export         |

### Authentication & roles (mock)

- `src/api/data/users.json` holds demo users: `{ id, username, password, name, phone, role, templeId? }`, e.g. `devotee / devotee123`, `staff / staff123` (one temple), `admin / admin123`. The demo credentials are shown on the login page. Plain-text passwords are acceptable **only** because this is a mock.
- Static catalogue data is also JSON: `temples.json`, `offerings.json`. Time-relative data (slots, orders, bookings) is generated in code from "now".
- `authApi.login({ username, password })` → `{ token, user }` (same latency/failure engine). `authApi.me(token)` restores the session on reload. `authApi.logout()`.
- `auth` slice: `{ user, token, status, error }`; the token is persisted in localStorage (`darsan:session:v1`) and validated through `me()` at start-up.
- Permissions live in one map (`lib/permissions.ts`): `can(role, 'booking:create' | 'booking:viewAll' | 'order:cancelAny' | 'catalog:manage' | ...)`. UI and route guards both use it.
- Routes: `/login` (with `?redirect=`), `RequireAuth` and `RequireRole([...])` guards, a 403 page, and a header user menu with logout. The mock API also checks the token/role on staff/admin calls, so security does not rely on hidden buttons.

Principles: minimal UI with low cognitive load, URL-driven state for deep links, double-submit safety, optimistic updates with rollback, keyboard-first accessibility, and the same pattern repeated everywhere so every file can be explained.

---

## 2. High-level architecture

```
┌──────────────────────────────── React 18 + TS ─────────────────────────────────┐
│  Customer Layout            Admin Layout               Shared UI (shadcn/ui)   │
│  • Temple / offerings       • Dashboard                • Button, Dialog, Sheet │
│  • Cart + order form        • Orders table             • Form fields, Toast    │
│  • Darshan slots + booking  • Slots / rates            • Live-region announcer │
│  • My bookings              • Filters (URL)            • Loading/Empty/Error   │
│               └───────────────────┬──────────────────────┘                     │
│                                   ▼                                            │
│  ┌──────────────── Redux Toolkit store + redux-saga ──────────────────────┐    │
│  │ slices: auth(session+role) · i18n · temples · offerings · cart · checkout      │    │
│  │         adminOrders · slots · booking · myBookings · adminCatalog      │    │
│  │ sagas : takeLatest(fetch) · takeLeading(submit) · optimistic cancel    │    │
│  │         cart/locale persistence → localStorage                         │    │
│  └────────────────────────────────┬───────────────────────────────────────┘    │
│  URL (useSearchParams) = source of truth for filters, page, temple, date       │
└───────────────────────────────────┼────────────────────────────────────────────┘
                                    ▼
┌──────────────────────────── Mock API service layer ────────────────────────────┐
│ In-memory DB (3 temples, 8–10 offerings each, 7-day slots, ~50 orders, bookings)│
│ Latency engine · configurable failure rate · idempotency store · reset()       │
└────────────────────────────────────────────────────────────────────────────────┘
```

Data flow: component → `dispatch(action)` → saga → `call(api)` → `put(success | failure)` → slice → selector → component. Components never call the API directly.

---

## 3. Directory structure

Based on the document's layer layout, with `context/` and `hooks/useMockQuery` replaced by `store/` (Redux-Saga).

```
darsan-web/
├── .github/pull_request_template.md
├── public/                     favicon, og image
├── src/
│   ├── api/                    Typed mock API (static seed data in api/data/*.json)
│   │   ├── mockClient.ts       latency / failure / idempotency engine
│   │   ├── data/               users.json, temples.json, offerings.json
│   │   ├── authApi.ts          login, me, logout (token + role checks)
│   │   ├── db.ts               in-memory tables + reset()
│   │   ├── seedData.ts         temples, offerings, slots, orders, bookings
│   │   ├── templeApi.ts        getTemples, getOfferings, updateOffering (admin)
│   │   ├── orderApi.ts         createOrder, getOrders, cancelOrder
│   │   ├── bookingApi.ts       getSlots, createBooking, getBookings, cancelBooking, updateSlot (admin)
│   │   ├── errors.ts           ApiError { code, message, retryable }
│   │   └── index.ts
│   ├── store/
│   │   ├── index.ts            configureStore + saga middleware + preloaded state
│   │   ├── rootSaga.ts
│   │   ├── hooks.ts            useAppDispatch / useAppSelector
│   │   ├── persistence.ts      localStorage load/save (versioned, try/catch)
│   │   ├── auth/               session slice (user, token, role), persisted
│   │   ├── i18n/               language slice, persisted
│   │   ├── temples/            slice + saga
│   │   ├── offerings/          slice + saga + selectors (search, active)
│   │   ├── cart/               slice + persistence saga + selectors (total)
│   │   ├── checkout/           slice + saga (takeLeading, idempotency key)
│   │   ├── adminOrders/        slice + saga (query, cancel)
│   │   ├── slots/              slice + saga (takeLatest = race-safe)
│   │   ├── booking/            slice + saga (safe submit)
│   │   ├── myBookings/         slice + saga (optimistic cancel + rollback)
│   │   └── adminCatalog/       slice + saga (rates, active flag, slot capacity)
│   ├── components/
│   │   ├── ui/                 shadcn generated (button, card, dialog, alert-dialog, sheet,
│   │   │                       select, input, form, badge, table, tabs, skeleton, sonner)
│   │   ├── common/             Header, Footer, SkipLink, RoleSwitcher, LanguageToggle,
│   │   │                       Announcer, LoadingState, EmptyState, ErrorState, Price, TempleSelect
│   │   ├── customer/           OfferingCard, OfferingGrid, OfferingSearch, CategoryTabs,
│   │   │                       CartDrawer, CartLine, CartSummaryBar, OrderForm, OrderReceipt,
│   │   │                       SlotPicker, BookingForm, BookingCard
│   │   └── admin/              StatsCards, FilterBar, OrderTable, OrderCardList (mobile),
│   │                           Pagination, CancelOrderDialog, SlotManager, RateManager
│   ├── i18n/                   en.ts, ml.ts (typed), useT(), format helpers
│   ├── hooks/                  useUrlState, useDebounce, useFocusOnMount
│   ├── lib/                    cn.ts, currency.ts, date.ts (IST), constants.ts (27 nakshatras,
│   │                           categories), validators.ts (zod), csv.ts, id.ts
│   ├── pages/
│   │   ├── customer/           HomePage, OfferingListPage, CheckoutPage, ConfirmationPage,
│   │   │                       SlotBookingPage, MyBookingsPage
│   │   ├── admin/              AdminDashboardPage, AdminOrdersPage, AdminSlotsPage, AdminRatesPage
│   │   └── NotFoundPage.tsx
│   ├── layouts/                CustomerLayout, AdminLayout (RequireRole guard)
│   ├── types/index.ts          domain models (§4)
│   ├── assets/images/          WebP temple and offering photos
│   ├── router.tsx
│   ├── App.tsx
│   └── main.tsx
├── tests/
│   ├── setup.ts                jest-dom, localStorage reset, API reset
│   ├── utils/renderWithProviders.tsx   store + MemoryRouter + fast API config
│   ├── api/                    mock client, paging, idempotency
│   ├── store/                  selectors + saga tests (redux-saga-test-plan)
│   ├── components/             unit UI tests
│   └── integration/            P1–P5 + Darshan flows, keyboard, race, a11y
├── vite.config.ts              (Vitest config inside)
├── components.json             shadcn config
└── tsconfig*.json
```

Tailwind v4 is configured in CSS (`@theme` in `src/index.css`), so there is no `tailwind.config.js`.

---

## 4. Domain models (`src/types/index.ts`)

The document's models are kept, with the fixes noted inline.

```ts
export type UserRole = 'DEVOTEE' | 'STAFF' | 'ADMIN'
export type Language = 'en' | 'ml'
export type Localized = { en: string; ml: string }

export const NAKSHATRAS = [
  'Aswathy',
  'Bharani',
  'Karthika',
  'Rohini',
  'Makayiram',
  'Thiruvathira',
  'Punartham',
  'Pooyam',
  'Ayilyam',
  'Makam',
  'Pooram',
  'Uthram',
  'Atham',
  'Chithira',
  'Chothi',
  'Vishakam',
  'Anizham',
  'Thrikketta',
  'Moolam',
  'Pooradam',
  'Uthradam',
  'Thiruvonam',
  'Avittam',
  'Chathayam',
  'Puruttathi',
  'Uthrittathi',
  'Revathi',
] as const // single source of truth
export type Nakshatra = (typeof NAKSHATRAS)[number] // + ml labels in i18n

export type OfferingCategory = 'POOJA' | 'ABHISHEKAM' | 'NIVEDYAM' | 'SPECIAL'

export interface Temple {
  id: string
  name: Localized
  location: Localized
  deity: Localized
  image: string
  timings: string
}
export interface Offering {
  id: string
  templeId: string
  name: Localized
  price: number /* whole ₹ */
  isActive: boolean
  category: OfferingCategory
  image?: string
}

export interface CartItem {
  offeringId: string
  templeId: string
  name: Localized
  unitPrice: number
  quantity: number
} // devotee details live on the order

export interface DevoteeDetails {
  devoteeName: string
  phone: string
  star: Nakshatra
  offeringDate: string /* YYYY-MM-DD, IST */
}

export type OrderStatus = 'CONFIRMED' | 'CANCELLED' | 'COMPLETED'
export interface OrderLine {
  offeringId: string
  offeringName: Localized
  quantity: number
  unitPrice: number
}
export interface Order extends DevoteeDetails {
  id: string
  orderNumber: string
  templeId: string
  items: OrderLine[]
  totalAmount: number
  status: OrderStatus
  createdAt: string /* ISO UTC */
}

export interface DarshanSlot {
  id: string
  templeId: string
  date: string
  startsAt: string
  endsAt: string // ISO UTC instants, shown in IST
  totalCapacity: number
  remainingTickets: number
  isBlocked: boolean
}

export type BookingStatus = 'BOOKED' | 'CANCELLED'
export interface Booking {
  id: string
  bookingRef: string
  templeId: string
  slotId: string
  startsAt: string
  date: string
  devoteeName: string
  phone: string
  ticketCount: number
  status: BookingStatus
  createdAt: string
}

export interface Paged<T> {
  items: T[]
  total: number
  page: number
  pageSize: number
}
export interface OrderQuery {
  status?: OrderStatus
  date?: string
  phone?: string
  templeId?: string
  page: number
  pageSize: number
}
```

---

## 5. Mock API engine (`src/api/mockClient.ts`)

```ts
export interface MockConfig {
  minDelay: number
  maxDelay: number
  failureRate: number
  random: () => number
}

export const vazhipaduConfig: MockConfig = {
  minDelay: 200,
  maxDelay: 1000,
  failureRate: 0.1,
  random: Math.random,
}
export const darshanConfig: MockConfig = {
  minDelay: 200,
  maxDelay: 1500,
  failureRate: 0.2,
  random: Math.random,
}

const idempotencyStore = new Map<string, unknown>() // key → original result

export async function simulate<T>(
  cfg: MockConfig,
  action: () => T,
  opts?: { idempotencyKey?: string },
): Promise<T> {
  await sleep(cfg.minDelay + Math.floor(cfg.random() * (cfg.maxDelay - cfg.minDelay + 1)))

  // Failure before the server is reached
  if (cfg.random() < cfg.failureRate / 2)
    throw new ApiError('NETWORK', 'Network error. Please try again.')

  const key = opts?.idempotencyKey
  const result =
    key && idempotencyStore.has(key)
      ? (idempotencyStore.get(key) as T) // replay: return the SAME order/booking
      : action()
  if (key) idempotencyStore.set(key, result)

  // Failure after the server committed ("response lost") — the retry must not duplicate
  if (cfg.random() < cfg.failureRate / 2)
    throw new ApiError('TIMEOUT', 'No response from server. Please try again.')

  return structuredClone(result)
}
```

- Config is per domain and injectable. Tests use `{ minDelay: 0, maxDelay: 0, failureRate: 0 }`, or a scripted `random` to force a failure. A dev-only `?fail=0.5` query or a debug panel can change the rate at runtime.
- `db.reset()` re-seeds between tests.
- Seed data uses a seeded RNG, so it is the same on every load. Slots are generated relative to "now" in IST: today + 6 days, about 6 slots/day, some `remainingTickets: 0`, and today's earlier slots already started.
- Seeds: 3 temples, 8–10 offerings each, including **Pushpanjali ₹30** and **Archana ₹50** and 1–2 inactive offerings per temple, plus about 50 orders and about 20 bookings.
- Server-side rules in the mock: no booking of started, full or blocked slots; `tickets ≤ remaining`; cancel only `CONFIRMED` / `BOOKED`; Darshan cancel blocked once the slot has started; order must have ≥1 line from one temple; offering date ≥ today IST. Unknown ids → `ApiError('NOT_FOUND')`.

---

## 6. State management (Redux Toolkit + redux-saga)

Every async slice has the same shape: `{ data, status: 'idle'|'loading'|'success'|'error', error?: string }`.

| Concern                                           | Saga technique                                                                                                                                                                        |
| ------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Fetch temples / offerings / slots / orders        | `takeLatest` → `call` → `put`. **Try again** re-dispatches the same action.                                                                                                           |
| Stale response after a fast temple/date switch    | `takeLatest` cancels the old task. The reducer also ignores results whose `requestId` ≠ the current one.                                                                              |
| Double-click / double-tap submit                  | `takeLeading(submitOrder)` + button disabled while submitting + one idempotency key per checkout attempt (new key only after success or after the cart/form changes).                 |
| Failure keeps cart + form                         | The cart is cleared only on success. Form values stay in react-hook-form and are not reset on error.                                                                                  |
| Optimistic cancel (staff order + devotee booking) | Snapshot → `put(markCancelled)` → `call(api)` → success: keep **CANCELLED**; error: `put(revert(snapshot))` + toast + live announcement.                                              |
| Cart / language / role persistence                | A saga watches the matching actions → `localStorage` (versioned keys `darsan:cart:v1`, `darsan:lang`, `darsan:session:v1`); hydrated through `preloadedState`, with bad JSON ignored. |
| Admin catalog edits                               | `takeEvery(updateOffering)` with optimistic update + rollback. Customer views refetch on their next visit.                                                                            |

---

## 7. Feature specification (by PR)

Build order: **A0 login → Darshan P1–P5 → Vazhipadu V1–V5 → admin extras.**

### A0 – Login & roles (`feature/auth-login`)

- Login page (username, password, show/hide password), validation, error on bad credentials, loading state, `?redirect=` back to where the user was.
- Session restore on refresh, logout, role-aware header navigation, `RequireAuth` / `RequireRole`, 403 page.
- Tests: wrong password shows an error; devotee is redirected away from admin routes; refresh keeps the session.

### Darshan P1–P5 (Grade I brief)

- **P1** `feature/p1-slot-list-booking`: temple + date pickers, that day's slots with IST start time and remaining tickets, Full/Started badges, booking form (name, phone, tickets ≤ remaining; prefilled from the profile). Booking 3 of 10 shows 7 remaining. Loading/empty/error states. Tests.
- **P2** `feature/p2-shareable-filters`: `?temple=&date=` in the URL (shareable, survives refresh), Back returns to the previous selection, `takeLatest` + request-id guard so stale responses are ignored. Race test with deferred promises resolved out of order.
- **P3** `feature/p3-safe-submit`: `takeLeading` + disabled button + idempotency key; failure keeps form values; mock fails after commit sometimes, and a retry with the same key returns the original booking. Tests: double-click → one booking; lost-response retry → no duplicate.
- **P4** `feature/p4-my-bookings`: phone lookup (prefilled for devotees; staff can search any phone), temple/date/start time/tickets/status in IST, confirm → optimistic cancel → rollback + error on failure, started slots show the reason instead of a cancel button.
- **P5** `feature/p5-a11y-malayalam`: keyboard-only booking flow (test + written walkthrough), result announced through a live region, focus moves to the confirmation, EN/ML switch for labels, buttons and dates, remembered in localStorage.

### Vazhipadu V1–V5 (Grade II brief) — sections below, branches renamed `feature/v1-…` to `feature/v5-…`

### V1 – Offerings list (`feature/v1-offerings-list`)

- Temple select (in the URL: `?temple=`), offerings grid with photo, name (EN/ML), category and ₹ price.
- Search box (label "Search offerings"), case-insensitive "contains" on the EN + ML name, 200ms debounce, `?q=` in the URL.
- Category tabs (All / Pooja / Abhishekam / Nivedyam / Special).
- Inactive offerings are **hidden** from devotees (decision recorded in the PR).
- States: skeleton cards while loading; "No offerings match 'xyz'" + clear-search button; error alert + **Try again**.
- Tests: "push" shows only Pushpanjali; failure → retry → list.

### V2 – Cart & order form (`feature/v2-cart-and-form`)

- Add, change quantity (1–10 stepper) and remove lines. Line totals + grand total in ₹ (`en-IN`).
- Cart drawer (Sheet) on mobile with a sticky bottom total bar; sticky side column on desktop.
- One temple per cart: adding from another temple asks to replace the cart.
- Persisted to localStorage (`darsan:cart:v1`).
- Order form (react-hook-form + zod): name (2–60 letters/spaces/dots), phone (`^(\+91)?[6-9]\d{9}$`, normalised to 10 digits), nakshatra select (27), offering date (today IST to +90 days). Per-field messages + error summary.
- Tests: 2×₹30 + 1×₹50 = ₹110; each invalid field shows its message; past date rejected; cart restored from storage.

### V3 – Order confirmation (`feature/v3-order-confirmation`)

- "Place order" → `createOrder({ ...details, templeId, items, idempotencyKey })`.
- Disabled + spinner + "Placing order…" while submitting; `takeLeading` + idempotency key guard against double taps.
- On failure: inline alert with **Try again**; cart and form unchanged.
- On success: `/vazhipadu/orders/:orderNumber` receipt page (order number, lines, total, date, star), cart emptied, focus moved to the heading.
- Tests: `dblClick` → exactly one order in the DB; fail once → values intact → retry succeeds (and produces no duplicate after a "lost response").

### V4 – Staff orders (`feature/v4-orders-list-staff`)

- Uses the login roles from A0: `RequireRole(['STAFF','ADMIN'])`; staff see only their temple's orders.
- `/admin/orders?status=&date=&phone=&page=`: the URL is the source of truth, so filters survive refresh and Back works. Any filter change resets `page=1`.
- Table columns: Order # · Devotee & phone · Offerings · Offering date · Total · Status badge · Actions. Becomes cards below `md`.
- Pagination: 10 per page, "Page 2 of 5", Previous/Next; out-of-range page clamps to the last page.
- Cancel: AlertDialog confirm → optimistic CANCELLED → revert on failure.
- Dashboard: counts by status, today's orders, total revenue (confirmed + completed).
- CSV export of the current filtered result (generated in the browser).
- Tests: status filter shows only matches and resets to page 1; initial URL restores filters + page; cancel shows CANCELLED without refetch; failed cancel reverts.

### V5 – Mobile, accessibility & i18n (`feature/v5-mobile-and-a11y`)

- 360px audit for every page: no fixed widths, `min-w-0` on flex children, long names wrap, tables become cards. Fixed at the layout, not hidden with `overflow-x-hidden`.
- Keyboard: skip link, logical tab order, visible focus ring (`ring-2 ring-offset-2`), Radix focus traps in dialogs/sheets, Esc closes, focus returns to the trigger.
- Forms: every field has a `<label>`; errors use `aria-invalid` + `aria-describedby`; an error summary with `role="alert"` gets focus on a failed submit.
- Announcer (`aria-live="polite"`): result counts, cart changes, order/booking success or failure.
- EN / മലയാളം toggle: all UI strings, status badges, nakshatra names; dates via `Intl.DateTimeFormat('ml-IN' | 'en-IN', { timeZone: 'Asia/Kolkata' })`; `<html lang>` updated; choice persisted.
- Contrast checked against AA (§8 palette); targets ≥ 24×24px (WCAG 2.2 2.5.8), 44px preferred.
- Tests: fields found with `getByLabelText`; full keyboard-only booking flow with `user.tab()` / `user.keyboard()`; Malayalam switch changes labels + dates. The PR also has a written keyboard walkthrough.

### Admin extras (after the core is done)

- `feature/admin-slots`: change capacity, block/unblock slots.
- `feature/admin-rates`: edit price, toggle active.

Multi-day Vazhipadu booking (one order repeated over a date range) is **out of scope for v1**, because the brief defines one offering date per order. It is listed as a follow-up.

---

## 8. UI and visual design

Inspired by the Guruvayur Devaswom and Sree Tali Maha Kshethram portals: calm, traditional, minimal.

- **Palette** (shadcn CSS variables, AA-checked):
  - `--primary` maroon `#7A1F1F` on cream `--background #FBF7F0` (contrast ≈ 10:1)
  - `--accent` temple gold `#B7791F` for borders/icons only, never body text on cream
  - `--foreground #1F1A17`, `--muted-foreground #5B524B`, success `#2F6B3A`, destructive `#B42318`
- **Type:** Noto Serif (headings), Noto Sans (body), Noto Sans Malayalam (ML); 16px base.
- **Customer layout:**
  - Header: logo · temple select · EN | മലയാളം · cart button with count · role switch
  - Hero: temple photo, name, deity, daily timings
  - Main: search + category tabs + offering grid (1 / 2 / 3 columns), with a sticky cart and order form on `lg`; on mobile, a drawer + sticky total bar
- **Admin layout:** sidebar on desktop (Dashboard, Orders, Slots, Rates) that becomes a top menu on mobile. Control bar holds stats, status pills, date, phone/order search and Export CSV. Table + pagination footer.
- **Photos:** freely licensed images from Unsplash / Pexels / Wikimedia Commons: Kerala temple gopurams, nilavilakku lamps, flowers (Pushpanjali), payasam, ghee lamp, abhishekam. WebP, ≤150 KB, lazy-loaded below the fold, `alt` text in both languages, credits in the README. **Nothing is copied from the devaswom sites** (copyright).

---

## 9. Testing strategy

| Test file                                  | Covers                                                                      |
| ------------------------------------------ | --------------------------------------------------------------------------- |
| `tests/api/mockClient.test.ts`             | latency bounds, failure rate, idempotent replay, post-commit failure        |
| `tests/api/orderApi.test.ts`               | filters, paging, cancel rules                                               |
| `tests/store/cart.test.ts`                 | totals (₹110), quantity bounds, one-temple rule, persistence                |
| `tests/store/sagas.test.ts`                | takeLatest cancel, takeLeading, optimistic rollback                         |
| `tests/integration/OfferingsList.test.tsx` | P1 search "push", empty state, error + retry                                |
| `tests/integration/CartAndForm.test.tsx`   | P2 total, per-field errors, past date, refresh keeps cart                   |
| `tests/integration/SafeSubmit.test.tsx`    | P3 double-click → one order, failure keeps values, retry                    |
| `tests/integration/AdminOrders.test.tsx`   | P4 filter → page 1, URL restore, cancel, revert                             |
| `tests/integration/Accessibility.test.tsx` | P5 label queries, keyboard-only flow, EN→ML labels + dates                  |
| `tests/integration/Darshan*.test.tsx`      | 10→7 remaining, stale response, lost-response retry, IST, optimistic cancel |

Optional: `vitest-axe` for automated a11y checks on each page.
Scripts: `dev`, `build` (`tsc -b && vite build`), `test`, `test:watch`, `coverage`, `lint`, `typecheck`.

---

## 10. Execution plan

| Step                | Branch               | Scope                                                                                                                                                                       | Time budget |
| ------------------- | -------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------- |
| Setup               | `main`               | Vite react-ts, strict TS, Tailwind v4, shadcn + theme, RTK + saga store, router + layout, Vitest/RTL, mock API + JSON seed (users, temples, offerings), PR template, README | —           |
| PR A0               | `feature/auth-login` | Login, session restore, logout, roles + permissions, guards                                                                                                                 | —           |
| PR 1–5              | `feature/p1…p5`      | Darshan: slots + booking, shareable filters, safe submit, my bookings, a11y + Malayalam                                                                                     | —           |
| **Stop for review** |                      |                                                                                                                                                                             |             |
| PR V1–V5            | `feature/v1…v5`      | Vazhipadu: offerings, cart + form, confirmation, staff orders, mobile/a11y                                                                                                  | —           |
| Then                | `feature/admin-*`    | Dashboard, slot and rate management                                                                                                                                         | —           |
| Final               | —                    | README with all PR links, build + tests green                                                                                                                               | —           |

Per PR: small descriptive commits → `npm run build && npm test` → `gh pr create` with the template (Problem / Assumptions / Decisions & trade-offs / How to test) → at least one line review comment (own or `/code-review`) addressed by a commit or reply → merge → `git pull` on `main`.

The time budgets apply to the timed assessment. For this full-scale build, the time goes to quality; the same branch/PR discipline still applies.

---

## 11. Corrections to the architecture document

| #   | In the document                                                              | Change                                                                            | Reason                                                                                                 |
| --- | ---------------------------------------------------------------------------- | --------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| 1   | A repeat idempotency key **throws** `DUPLICATE_SUBMISSION_DETECTED`          | Return the **original result**                                                    | A retry after a lost response must show the booking that was made, not an error.                       |
| 2   | The key is saved only after a success that happens before any failure check  | Add a failure **after** commit                                                    | Without it, the "request reached the server" case never happens, so the retry requirement is untested. |
| 3   | One global `MOCK_CONFIG` with `maxDelay: 1000`, while the text says 200–1500 | Per-domain configs (Vazhipadu 200–1000 / 10%, Darshan 200–1500 / 20%), injectable | Matches both briefs and makes tests fast and deterministic.                                            |
| 4   | Optimistic cancel: "if API succeeds, state stays **confirmed**"              | Stays **CANCELLED** on success, reverts on failure                                | Typo in the document; as written it would be a logic bug.                                              |
| 5   | `CartItem` carries devoteeName / star / date per item                        | Devotee details are on the **order**                                              | The brief has one order form; per-line details would need a different form.                            |
| 6   | Contexts (Auth / Cart / Language) + `useMockQuery`                           | RTK slices + sagas                                                                | The chosen stack is redux-saga; one state system, not two.                                             |
| 7   | `overflow-x-hidden` to stop horizontal scroll                                | Fix the layout                                                                    | Hiding overflow hides cut-off content, and the 360px check must pass for real.                         |
| 8   | Translations as JSON in `public/locales` (fetched at runtime)                | Typed TS dictionaries in `src/i18n`                                               | Missing keys become type errors, there is no extra network call, and nothing flashes untranslated.     |
| 9   | `startTime: 'HH:mm IST'` strings                                             | ISO instants, formatted in IST                                                    | "Slot has started" needs a real time comparison on any device time zone.                               |
| 10  | `isSubmitting` local state as the double-submit guard                        | Button disable + `takeLeading` + idempotency key                                  | React state updates are async, so two fast clicks can both pass a state check.                         |
| 11  | `tailwind.config.js`                                                         | CSS-first `@theme` (Tailwind v4)                                                  | Current Tailwind/shadcn setup.                                                                         |
| 12  | Category "Feeds" / "Prasad" mismatch                                         | `POOJA / ABHISHEKAM / NIVEDYAM / SPECIAL`                                         | One consistent list.                                                                                   |
| 13  | Multi-day bookings in scope                                                  | Deferred to a follow-up                                                           | Not in either brief; it would change the order model.                                                  |

---

## 12. Assumptions (copy into PRs)

- Prices are whole rupees. Quantity 1–10 per line. One temple per order.
- Phone: Indian mobile, 10 digits starting 6–9, optional `+91`.
- "Today" and all displayed times are IST (`Asia/Kolkata`), whatever the device time zone.
- Inactive offerings are hidden from devotees and still visible to staff.
- Orders: 10 per page; phone search is a partial match; the date filter is on offering date.
- Only CONFIRMED orders / BOOKED bookings can be cancelled; Darshan bookings can't be cancelled after the slot starts.
- The role switch is a mock (no real authentication); this is noted as a known limitation.
- Mock data resets on a full page reload (in-memory); only the cart, language and role persist.
