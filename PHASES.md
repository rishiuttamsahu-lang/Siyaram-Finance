# PHASES.md — Implementation Roadmap

Expands the high-level roadmap from `Product-explanation.md` §10 into gated, verifiable phases. Each phase has an explicit **exit criteria** — do not start the next phase until the current one's exit criteria are demonstrably true.

---

## Phase 0 — Foundations & Environment

**Goal:** Nothing user-facing yet; get the ground truth right so every later phase builds on a correct schema and a correct set of rules.

- [ ] Provision Firebase project (Firestore + Auth), configure multi-region if available.
- [ ] Define and freeze the Firestore data model from `Architecture.md` §3 (seasons, members, buildings/floors/flats, transactions, audit_logs).
- [ ] Write Firestore Security Rules: public `read` on all collections, `write` restricted to authenticated Admin UID(s) **and** a server-side service identity used by the Cloudflare Worker.
- [ ] Create Google Cloud service account + enable Sheets API for the mirror sync.
- [ ] Set up the repo: web app scaffold (Next.js/React + Tailwind) and a separate Worker project (Cloudflare Workers) for the Telegram bot.
- [ ] Seed one test season with 2–3 dummy members and 1 building for development use.

**Exit criteria:** A Firestore write from a local script succeeds under the deployed security rules when authenticated as Admin, and fails when unauthenticated; a Google Sheet updates from that same script.

---

## Phase 1 — Telegram Bot: Core Ingestion Engine

**Goal:** The fastest, highest-leverage part of the system — field data entry — works end-to-end before any UI exists.

- [ ] Implement Cloudflare Worker webhook listener for the Telegram Bot API.
- [ ] Implement the message-routing state machine from `Architecture.md` §5 (slash command vs. `-` expense vs. building-code collection vs. member/chanda name match).
- [ ] Implement case-insensitive member name matching against Firestore.
- [ ] Implement the `O`-suffix online/offline detection rule (final standalone token only).
- [ ] Implement `/1`–`/9` slash commands (finance summary, dues list, offline/online income/expense lists, combined lists, help menu).
- [ ] Implement `<id> undo` reversal (status flip to `REVERSED`, not deletion).
- [ ] Implement immutable `audit_logs` writes on every CREATE/UPDATE/UNDO.
- [ ] Wire every successful mutation to append/update the mirrored Google Sheet.
- [ ] Restrict bot command execution to authorized Telegram user ID(s) only.

**Exit criteria:** Every example command from the PRD §6.6 and the field-data-entry syntax table produces the correct Firestore write, the correct Sheets row, and a correctly formatted reply — verified against a manual test script covering: member payment, chanda (no match), building/flat collection, expense, undo, and all nine slash commands.

---

## Phase 2 — Payment Logic & Season Engine (headless)

**Goal:** The hardest business logic — dues, waterfall allocation, live-month capping, season rollover — is correct and testable before it's wrapped in UI.

- [ ] Implement the Live Month Due Rule (dues never include unactivated future months).
- [ ] Implement the Payment Allocation Waterfall (Previous Year Pending → Current Season Live Due → Carry-forward to next unblocked month).
- [ ] Implement month blocking (global) and per-member overrides/exemptions/honorary/paused flags.
- [ ] Implement the Season Rollover Engine: closing balance → new opening balance; unpaid dues → new season's `previousYearPending`.
- [ ] Implement recalculation-on-undo across season boundaries (undoing a past-season transaction must correctly ripple into the current season's derived balances).
- [ ] Write a battery of scenario tests directly against the worked examples in `Product-explanation.md` §5.4 (the Piyush waterfall table) and the conversation-locked example (₹200 pending + ₹300 payment).

**Exit criteria:** All worked examples from the source spec reproduce exactly, including edge cases: exact-payoff, overpayment cascading two months forward, payment received during a blocked month, and undo of a cross-season transaction.

---

## Phase 3 — Web Dashboard: Read Layer (Public View)

**Goal:** Public transparency — every module renders correctly from live Firestore data, read-only, no login required. Design system from `DESIGN.md` is applied here for the first time.

- [ ] Scaffold Next.js app, Tailwind config with the `DESIGN.md` color tokens and typography scale.
- [ ] Members tab: matrix view (desktop) + card view (mobile), live via `onSnapshot`, summary bar (Collected/Dues/Prev Balance), sort by due.
- [ ] Buildings tab: wing cards with progress bars, drill-down elevation grid (floor-by-floor), paid/pending tile states.
- [ ] Income/Chanda tab: reverse-chronological log, Split View toggle.
- [ ] Expense tab: reverse-chronological log, Split View toggle.
- [ ] Global "Total Festival Balance" and Khajanchi separation figures (read-only display) surfaced somewhere sensible (Admin panel or a small public summary card).
- [ ] Live-update polish: number count-up animation and new-row insert animation per `DESIGN.md` §6.

**Exit criteria:** A transaction sent via Telegram bot appears on the deployed web dashboard within a couple of seconds, correctly categorized, with correct running totals, with zero page refresh.

---

## Phase 4 — Admin Panel & Write Operations

**Goal:** Everything an Admin needs to manage the system without touching Telegram or Firestore console directly.

- [ ] Firebase Google Authentication gate on `/admin` routes.
- [ ] Member Settings: add/edit member, set monthly quota + per-month overrides, toggle Honorary/Paused.
- [ ] Wing Setup: create building/code, add floors, add flats.
- [ ] Block Month control (global) with confirmation (irreversible-looking action, should warn clearly).
- [ ] Inline click-to-edit on Members matrix cells and ledger rows, writing through the same audit-logged edit path as the bot (single shared logic layer — see `Agent-rules.md`).
- [ ] Manual "Add Entry" forms for Income/Chanda and Expense tabs (parity with Telegram entry, for desk use).
- [ ] Season Rollover UI: "Create New Season" wizard showing computed opening balance and previous-year-pending preview before committing.
- [ ] One-click Firestore export (JSON/CSV) and a Sheets sync-status indicator.

**Exit criteria:** An Admin can perform a full end-of-festival season close and next-season open entirely from the web UI, with the resulting numbers matching a manual hand-calculation on the same test data.

---

## Phase 5 — Hardening, Audit UX & Launch Readiness

**Goal:** Make the system trustworthy under real festival load and real human error.

- [ ] Audit trail viewer: given any transaction ID, show its full history (create → edits → undo) in the Admin panel.
- [ ] Reconciliation view: side-by-side Firestore-derived totals vs. the latest Google Sheets mirror, flagging any drift.
- [ ] Rate-limit / duplicate-message guard on the Telegram Worker (protect against double-sends on flaky field connectivity).
- [ ] Error-path UX: unmatched building code, unmatched flat number, malformed amount — bot replies with a clear, short correction message rather than silently failing.
- [ ] Load rehearsal: simulate a full festival day's volume of Telegram messages against the Worker + Firestore to confirm sub-100ms responses hold up.
- [ ] Final walkthrough of `PRD.md` §9 Success Criteria against the live system with real (or realistic mock) data.
- [ ] Backup/export verified: a full Firestore export can be re-imported or independently audited without the live system.

**Exit criteria:** All `PRD.md` §9 success criteria pass on a full dry run with the previous season's real historical numbers loaded as the "previous season," immediately before the live festival window opens.

---

## Post-Launch (v2 candidates — not scheduled)
See `PRD.md` §8 for the explicit deferral list (volunteer partial-write roles, UPI auto-reconciliation, notifications, multi-language UI).
