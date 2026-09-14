# TUIP — Tehran Urban Planning Intelligence Platform (Frontend)

A working, Persian-native, right-to-left React frontend for the urban planning
intelligence platform described in the Product Definition, PRD and FSD documents.

This is not a click-through mockup. Every screen is wired to a typed API layer,
a deterministic analytical engine and a realistic in-memory dataset, so the
whole product story — data ingest → rules → scenario → analysis → evidence →
review → decision package — can be walked end to end.

---

## 1. Overview

The platform helps municipal planners answer one question honestly: *what
happens if we build this here, and how much of that answer can we defend?*

The interface is built around four commitments taken directly from the
specification:

1. **A missing result is never shown as zero.** Every analytical result carries
   an availability state (`computed`, `proxy`, `not_available`, `not_applicable`,
   `suppressed`) and, when empty, a machine-readable reason code.
2. **An estimate never borrows the authority of a calculation.** Method class and
   subtype travel with the number, everywhere it appears.
3. **Every number can be traced.** The "منشأ و پشتوانه نتیجه" (provenance) panel
   walks the full chain: result → method → method version → parameters → input
   data → data version → rules → models → human decisions.
4. **Approval is a workflow event, not a legal blessing.** The UI says so
   explicitly wherever an approval is recorded.

### Feature coverage

| Area | Screens |
| --- | --- |
| Access | one-time-code sign-in, role selection, guided-path overview |
| Dashboard | operational home, my work, blockers, region readiness, recent activity |
| Studies | list, creation, workspace with Chapter Zero, structure, data, map, rules, scenarios, analyses, evidence, report, review, history |
| Regions | region list, region pack, readiness by measure |
| Data | catalogue, dataset detail (versions / quality / analytical fitness / events), ingest wizard, connectors, quality console, quarantine queue, version comparison |
| GIS | map workspace with layer control and feature inspector, existing vs proposed comparison |
| Rules | repository with conflict handling, rule detail with interpretation notes |
| Scenarios | list, six-step builder, detail with run monitor and results, multi-scenario comparison |
| Analysis | analysis centre plus a dedicated page for each of the twelve modules (M01–M12) |
| Models | specialist model registry and model detail with validity limits |
| Evidence | evidence register with access-restricted handling |
| Governance | reports, decision packages, review inbox, review detail, approvals |
| Assistant | grounded copilot with citations and explicit action confirmation |
| Administration | roles, users, regions, audit trail, environment configuration |

---

## 2. Tech stack

- **React 18** + **TypeScript 5.5** (strict, `noUnusedLocals`, `noUnusedParameters`)
- **Vite 5** for dev server and build
- **Tailwind CSS 3.4** driven by CSS custom properties (semantic design tokens)
- **React Router 6** with lazy-loaded route modules
- **TanStack Query 5** for server state, caching, polling and invalidation
- **Zustand** for the small amount of genuine client state (session, UI, workspace)
- **lucide-react** for icons, **@fontsource/vazirmatn** for the Persian typeface

No component library was used. All UI primitives are local, so RTL behaviour,
Persian numerals and the trust-related states are correct by construction rather
than patched over a Latin-first library.

---

## 3. Getting started

Requirements: Node.js 18+ and npm 9+.

```bash
npm install
npm run dev        # http://localhost:5173
npm run build      # type-checks and produces dist/
npm run preview    # serves the production build
```

There is no backend to run. The app boots with `VITE_API_MODE=mock` and serves
everything from the in-memory store.

### Environment variables

Copy `.env.example` to `.env` to change any of these:

| Variable | Default | Purpose |
| --- | --- | --- |
| `VITE_API_MODE` | `mock` | `mock` uses the local store; `real` routes the same calls to the backend |
| `VITE_API_BASE_URL` | `/api/v1` | Base path for the real backend |
| `VITE_MOCK_LATENCY_MS` | `280` | Simulated latency, so loading states are actually visible |
| `VITE_DEMO_MODE` | `true` | Shows the «داده نمایشی» (demo data) badges |
| `VITE_DEFAULT_LOCALE` | `fa` | Default locale |

### Signing in (one-time code)

The app opens at `/login` and signs in with a one-time code, in three steps:

1. **شماره همراه** — enter any valid Iranian mobile number (`09` + nine digits).
   Persian, Arabic-Indic and Latin digits are all accepted. No SMS is sent.
2. **کد تأیید** — enter the six-digit code. The demo code **۱۲۳۴۵۶** is printed
   on screen. The boxes accept paste, move focus automatically, and backspace
   walks backwards; a wrong code shows an error instead of silently failing.
   A ninety-second countdown gates the resend link.
3. **انتخاب نقش** — choose the role the session runs as, and leave
   **مسیر راهنما** on the first time through.

The code is not checked against a server, because there is no server. The flow
is the real one — identify, verify, then choose the role — so the screens, the
states and the copy can be reviewed as they would ship. Replacing the mock check
with a real `POST /auth/otp` call touches one function in `LoginPage`.

The session is kept in `sessionStorage`: a reload keeps you signed in, closing
the tab ends the session.

### The guided path (happy path)

With guided mode on, a bar under the top bar tells you, on every screen, which
of the eleven steps you are on, what to do here, and where to go next. The full
map lives at `/journey`.

| # | Screen | What you do | Role |
| --- | --- | --- | --- |
| 1 | `/dashboard` | See your queue, blockers and region readiness | کارشناس شهرداری |
| 2 | `/studies/std-1001` | Open the study workspace and Chapter Zero | کارشناس شهرداری |
| 3 | `/datasets` | Find the quarantined and unpublished versions | دبیرخانه / کارشناس |
| 4 | `/gis` | Select parcel P-1042 and read its source and version | کارشناس شهرداری |
| 5 | `/rules` | Open the two rules with an unresolved conflict | کارشناس شهرداری |
| 6 | `/scenarios/new` | Walk the six-step builder and run the analysis | کارشناس شهرداری |
| 7 | `/scenarios/:id` | Read the results, open the provenance chain | کارشناس شهرداری |
| 8 | `/scenarios/compare` | Compare against the baseline; see what cannot be compared | کارشناس شهرداری |
| 9 | `/decision-packages` | Key changes, limitations, missing analyses | کارشناس شهرداری |
| 10 | `/reviews` | Switch persona to بازبین and record a decision with a reason | بازبین |
| 11 | `/approvals` | Switch to مرجع تأیید and see the scope of approval | مرجع تأیید |

The path is defined in `src/app/journey.ts`; each step carries both the task and
the product argument for why the step exists.

### What to notice along the way

1. The run finishes as `partial`, not `succeeded` — M07 and M09 cannot run, and
   thirteen indicators report *not produced* with a reason instead of `0`.
2. **منشأ و پشتوانه نتیجه** on any result card walks the full provenance chain.
3. In the comparison table, indicators missing on either side show
   «قابل مقایسه نیست» rather than a fabricated delta.
4. As بازبین, try to approve a bundle you submitted yourself — separation of
   duties blocks it and explains why.
5. Switch to حسابرس anywhere: every mutating action stays visible but disabled
   with the reason, instead of silently disappearing.

---

## 4. Project structure

```
src/
├── api/            # one module per resource; each declares its FSD route
├── app/            # App shell composition, router providers, navigation model
├── components/
│   ├── ui/         # primitives: Button, inputs, overlays, display, feedback
│   ├── tables/     # generic DataTable (sort, paginate, column visibility)
│   ├── maps/       # MapCanvas — SVG map renderer
│   ├── provenance/ # ResultCard, ResultValue, ProvenanceDrawer, badges
│   └── workflow/   # RunMonitor, PermissionGate, demo badges, scope notices
├── features/       # one folder per product area; screens live here
├── hooks/          # useScenarioResults, buildComparison
├── layouts/        # AppShell (sidebar, topbar, notifications, persona switcher)
├── mocks/          # deterministic engine + fixture data + in-memory store
├── routes/         # route table
├── services/       # config and HTTP transport
├── stores/         # zustand stores
├── styles/         # design tokens and global styles
├── types/          # domain model mirroring the FSD data dictionary
└── utils/          # dictionary (all Persian labels), format, jalali, permissions
```

Rule of thumb: **identifiers stay English, every user-facing string is Persian**
and lives in `src/utils/dictionary.ts`. Components never hard-code an enum label.

---

## 5. Design system

Tokens are CSS custom properties in `src/styles/tokens.css`, exposed to Tailwind
as semantic names (`bg-surface`, `text-muted`, `border-border-strong`,
`bg-warning-bg`). Components reference meaning, not colour, so a future dark
theme or a municipal palette change is a token edit.

- **Type scale** is tuned for Persian: larger line-height (`leading-7`) than a
  Latin-first scale, because Persian glyphs need vertical room.
- **Status is never colour-only.** `StatusBadge` always pairs a tone with an icon
  and a text label.
- **One hue is reserved for wayfinding.** The violet accent is used only by the
  guided path — never by a status — so a navigation hint can never be misread as
  a warning. This is why the accent is violet and not amber.
- **Numbers** use a `.num` class with tabular figures so columns align.
- **Motion** is subtle and fully disabled under `prefers-reduced-motion`.

Every state has a designed treatment: `LoadingState`, `SkeletonTable`,
`EmptyState`, `ErrorState`, `PermissionDeniedState`, `UnavailableState`. The last
two are deliberately distinct — "you may not see this" and "this was never
produced" are different facts and must not look the same.

---

## 6. Persian and RTL implementation

- `<html lang="fa" dir="rtl">`; the sidebar sits on the right because layout uses
  logical properties (`ps-`, `pe-`, `start-`, `end-`) throughout — there is not a
  single hard-coded `left`/`right` in layout code.
- Directional icons (chevrons, arrows) point the correct way for RTL reading.
- **Persian digits** everywhere via `formatNumber`, including a `NumberInput`
  that accepts Persian, Arabic-Indic or Latin digits and normalises them.
- **Jalali dates** are rendered by a local implementation in `src/utils/jalali.ts`
  (no external dependency). Canonical values stay Gregorian ISO in the model.
  The conversion is verified day by day over a twenty-year range against the
  platform's own Persian calendar: `npm run check:dates`.
- **Bidirectional isolation**: Latin tokens (IDs, hashes, version labels, CRS
  codes) render inside `<Ltr>`, which applies `unicode-bidi: isolate`, so they
  never scramble the surrounding Persian sentence.
- Persian thousands separator (٬) and decimal separator (٫) are used, not the
  Latin ones.

---

## 7. Mock data and determinism

`src/mocks/engine.ts` is a pure arithmetic core. Given the same overrides and
assumptions it always produces the same numbers — no randomness, no timestamps
in the maths.

It implements the synthetic fixture from **FSD-B14.2 / B14.3** exactly: a
1,000 m² parcel, 0.8 net residential efficiency, 80 m² mean dwelling, household
size 3, with scenarios S0 (500 m² footprint, 4 floors), S1 (600 / 5) and
S2 (600 / 6). The published expected outputs are reproduced to the digit —
GFA 2,000 / 3,000 / 3,600 m², dwellings 20 / 30 / 36, residents 60 / 90 / 108,
required parking 25 / 38 / 45, parking shortfall 7 / 8 / 9, operational
emissions 44,000 / 66,000 / 79,200 kgCO₂e per year.

Two modules are deliberately unavailable in the fixture: **M07 (access and
coverage)** because no published street-network version exists, and **M09
(shadow and irradiance)** because the 3-D model is not available. Runs that
include them therefore finish in state `partial`, not `succeeded` — which is the
point: the demo tells the truth about incompleteness.

The store in `src/mocks/db.ts` also simulates asynchronous run progression
(`queued → preparing → executing → validating → complete` over roughly eight
seconds), dataset publication, review decisions, notifications and an audit log,
so state transitions behave like a real system rather than a static fixture.

---

## 8. Backend integration

`src/api/client.ts` is the single seam:

```ts
export async function call<T>(path: string, mock: () => T, options = {}): Promise<T> {
  if (isMock()) {
    await wait(config.mockLatencyMs);
    return mock();
  }
  return http<T>(path, options);
}
```

Each API function declares the FSD-C01 route it will call and its mock
implementation side by side:

```ts
export const scenariosApi = {
  /** POST /scenario-versions/{id}/runs */
  execute: (scenarioId: string, modules: ModuleId[], actor: string) =>
    call<Run>(`/scenario-versions/${scenarioId}/runs`, () => db.createRun({ scenarioId, modules, actor }),
      { method: 'POST', body: { module_ids: modules } }),
};
```

To connect the real backend, set `VITE_API_MODE=real` and `VITE_API_BASE_URL`.
No component changes are required. The transport in `src/services/http.ts`
already unwraps the `{ data, meta: { request_id, revision } }` envelope and maps
HTTP status codes to Persian, actionable error messages.

---

## 9. Permissions model

`src/utils/permissions.ts` holds a permission matrix over the ten roles from the
PRD (مدیر سامانه, دبیرخانه, کارشناس شهرداری, کاربر منطقه‌ای, مشاور, متخصص مدل,
بازبین, مرجع تأیید, حسابرس, ناظر مدیریتی).

Two deliberate design choices:

- **Actions are disabled with a reason, not hidden.** A user who cannot publish a
  dataset still sees the button and learns that publication is the secretariat's
  authority. Hiding capability teaches people the system is arbitrary.
- **Separation of duties is enforced in the UI** (`violatesSeparationOfDuties`):
  the person who submitted a review bundle cannot decide it.

> This is presentation logic only. Real authorisation is enforced by the backend
> (PRD E01 / FSD C07). Nothing in the frontend may be treated as a security
> control.

---

## 10. Accessibility

- Semantic landmarks, one `h1` per page, logical heading order.
- All interactive elements reachable by keyboard; modals and drawers trap focus
  and restore it on close; `Escape` closes overlays.
- `aria-sort` on sortable table headers, `aria-expanded` on disclosures,
  `role="progressbar"` with live values on run progress.
- Toasts announce through an `aria-live="polite"` region.
- Status is conveyed by icon plus text, never colour alone.
- Colour contrast targets WCAG AA for text and UI boundaries.
- All motion respects `prefers-reduced-motion`.

---

## 11. Verification

Two checks ship with the project.

```bash
npm run check:dates          # 7,305 days of Jalali conversion vs Intl — no dependency
npx playwright install chromium
npx vite preview --port 4173 # in one shell
node e2e/smoke.mjs           # opens all 30 routes, asserts headings, fails on console errors
node e2e/happypath.mjs       # signs in, builds a scenario, runs it, opens provenance, creates a package
```

`e2e/` is not wired into `npm test` on purpose: Playwright is a heavy install and
this is a demo build, not a CI pipeline. The scripts are checked in because they
found three real defects that reading the code did not — a run that was invisible
while in progress, results that never refetched after completion, and a Jalali
conversion that used floor division where the algorithm needs truncation.

---

## 12. Frontend assumptions

Where the specification left room, these decisions were made and are worth
reviewing:

1. **The map is rendered as SVG, not MapLibre GL.** A tile-based map needs a tile
   server; without one, a demo shows an empty grey canvas, which would misrepresent
   the product. `MapCanvas` draws deterministic local geometry instead, and its
   prop interface (`parcels`, `layers`, `selectedId`, `onSelect`, `focusIds`,
   `variant`) is deliberately narrow so a MapLibre implementation can replace it
   without touching any feature screen. Coordinates shown in the scale bar are
   illustrative, and the UI says so.
2. **Jalali conversion is implemented locally** rather than pulling a date
   library, to keep the dependency surface small and the conversion auditable.
3. **The copilot is keyword-driven**, not a model call. It answers only from
   fixture data, always cites versioned sources, refuses to approve anything, and
   requires explicit confirmation before any proposed mutation — which is the
   behaviour the specification asks for, independent of the model behind it.
4. **Persona switching replaces authentication.** There is no login screen; the
   top-bar switcher exists so a reviewer of this demo can see how the same screen
   changes across roles.
5. **Ten demo users, three regions, six studies, six datasets, eight rules, six
   models, four scenarios** were chosen to cover every lifecycle state at least
   once — including the uncomfortable ones (quarantined data, conflicted rules,
   an expired model, a failed run, a rejected review).
6. **Export buttons do not produce files.** They explain that generation happens
   server-side against the recorded version, rather than fabricating a PDF that
   would not match a real export.
7. **Reports and decision packages are drafted, not published.** Publication
   requires backend workflow that does not exist here.
8. **Sign-in is a real OTP flow with a mock verifier.** There is no SMS gateway,
   no token and no identity provider; the demo code is shown on screen. The
   guard exists so the product has a proper entry point and so permissions have
   something to hang from.
9. **The guided path is opinionated.** It picks one route through the product —
   the one that shows the trust argument most clearly — and it can be switched
   off from the account menu at any time.

---

## 13. Known limitations

- No unit tests. The analytical engine is pure and should be covered against the
  FSD-B14.3 expected-value table; that is the first thing to add.
- Domain state resets on page reload — the store is in memory by design. Only
  the session and the guided-path progress survive, in `sessionStorage`.
- No internationalisation framework. Persian is the only locale; strings are
  centralised in `dictionary.ts`, which is the natural place to add a second one.
- The map has no real projection, geocoding, drawing tools or spatial queries.
- Large lists paginate client-side; server-side pagination arrives with the real
  API.
- Charts are rendered as simple comparison tables and delta pills rather than
  plotted graphics; Recharts is available in the dependency list for when the
  data justifies it.

---

## 14. Next steps

1. Unit-test the analytical engine against the FSD-B14.3 fixture table, then
   snapshot-test the provenance panel.
2. Swap `MapCanvas` for MapLibre GL against municipal tiles and a real CRS.
3. Point `VITE_API_MODE=real` at the FastAPI backend and reconcile the envelope
   and error codes against C01.
4. Add server-driven pagination, filtering and search.
5. Add report and decision-package export against the recorded version.
6. Introduce a design-token theme for each municipality tier, and validate the
   palette with planners under real screen conditions.
7. Accessibility audit with a screen reader in Persian, and a keyboard-only pass
   over the scenario builder and review flows.

---

## Disclaimer

This build is a demonstration environment. All data, coefficients and rules are
synthetic, labelled «داده نمایشی» in the interface, and are not an official basis
for municipal decisions. Approval recorded in this system is an organisational
workflow event and does not constitute legal validity, a permit, or scientific
certification.
