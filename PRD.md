# PRD.md — Siyaram Mitra Mandal Financial & Operations Management System

**Version:** 1.0.0
**Status:** Locked for build
**Owner:** Rishikesh (Finance Head / Khajanchi, Siyaram Mitra Mandal)
**Source documents:** `Product-explanation.md`, `conversation.txt` (requirements walkthrough)

---

## 1. Problem Statement

The Mandal's Finance Head currently manages Ganesh Chaturthi festival finances manually across a personal bank account, WhatsApp messages, and memory. This creates five concrete pain points:

1. **Money entanglement** — Personal UPI QR is reused for Mandal donations, so personal savings and Mandal funds sit in one account with no clean separation.
2. **Fragmented inflows** — Money arrives via monthly member dues, door-to-door building/flat collections, and voluntary chanda (shop/resident donations), each needing different tracking rules.
3. **Slow field data entry** — Volunteers collecting cash/UPI on the ground need a zero-friction way to log a transaction in seconds, not a web form.
4. **Non-standard festival calendar** — Ganesh Chaturthi's date shifts every year (lunar calendar), so a "season" is not a fixed 12-month cycle, and unpaid dues must roll forward without being erased.
5. **Trust & auditability** — Corrections and reversals must never silently break historical totals; every rupee must be traceable.

## 2. Goals

- G1: Give the Finance Head a single real-time view of exactly how much Mandal money exists, split by online vs. offline, separate from personal funds.
- G2: Let field volunteers log any transaction type via a single Telegram message in under 5 seconds, with no app switching.
- G3: Automatically calculate each member's live dues, honouring custom amounts, blocked months, and prior-season carry-over — with zero manual arithmetic.
- G4: Preserve complete audit history — every edit and reversal must be reconstructable and must never require re-deriving totals by hand.
- G5: Support year-over-year continuity so closing a season and opening the next is a guided, low-risk action, not a manual re-entry exercise.

## 3. Non-Goals (v1)

- No payment gateway integration (UPI collection stays outside the system; the system only *records* that a payment happened).
- No multi-Mandal / multi-tenant support — this is a single-organization system.
- No mobile native app — the web dashboard must be responsive/mobile-first instead.
- No role tiers beyond "Public (read-only)" and "Admin (full write)" in v1 — no volunteer-level partial-write accounts yet.
- No SMS or WhatsApp bot in v1 — Telegram is the only field ingestion channel.

## 4. Users & Roles

| Role | Access | Primary Surface |
| :--- | :--- | :--- |
| **Public / Committee / Donors** | Read-only, no login required | Web dashboard (all tabs, view-only) |
| **Admin (Finance Head / Khajanchi)** | Full read/write, Google-authenticated | Web dashboard (Admin Panel) + Telegram Bot |
| **Field Volunteer** | Effectively write-access via bot, no login | Telegram Bot only (acting on Admin's behalf; bot itself is gated to authorized Telegram user ID(s)) |

> Decision (locked): Public users get complete financial transparency (read-only). Only authenticated Admin accounts — and the authorized Telegram bot channel — can create, edit, delete, or undo records.

## 5. Core Concepts & Business Rules

### 5.1 Seasons
- A **season** (e.g. `2026-2027`) is a custom date range, not a fixed 12 calendars. Duration can be shorter or longer than 12 months.
- Each season has an `openingBalance` = previous season's closing balance.
- Past seasons are archived and remain fully viewable, never deleted or overwritten.

### 5.2 The "Live Month" Due Rule (Golden Rule)
- A member's due is calculated **strictly up to the current tracked/live month**. A future month's configured quota (even if already set by Admin) is **never** included in "Total Dues" until that month becomes the live month.

### 5.3 Member Contribution Rules
- Each member has a default monthly quota, which Admin can override per member per month (e.g. a child pays ₹100 instead of ₹200).
- Members can be flagged **Honorary** (no dues ever) or **Paused** (dues stop accruing without deleting history).
- Admin can globally **block** a month (e.g. Dec–May lean period) — dues for *all* members are ₹0 for a blocked month, shown as `--`/🚫 in the table, not as an editable cell.

### 5.4 Payment Allocation Waterfall (locked rule)
When a member payment is recorded (via Telegram or web), it is applied in this strict order:
1. **Previous Year Pending** (oldest unpaid season balance) — cleared first.
2. **Current Season Live Due** (up to and including the live month) — cleared next.
3. **Remaining surplus** — carried forward automatically into the next active, unblocked month's target.

Example (locked in conversation): Piyush has ₹200 previous-year pending and pays ₹300 → ₹200 clears old pending, remaining ₹100 applies to the current live month's due; any leftover after that carries to the next unblocked month.

### 5.5 Total Dues Display Rule (locked)
The UI (web **and** Telegram) must always show:
`Previous Year Pending + Current Season Pending = Total Pending`
— both components visible, not just a merged number.

### 5.6 Reversal & Correction Integrity (locked)
- Edits **never** create a duplicate/offsetting row. The original transaction document is updated in place; an immutable entry is appended to `audit_logs` capturing old value → new value, who, when.
- `<id> undo` sets `status: "REVERSED"` on the transaction. All totals are computed by querying `status == "ACTIVE"` only — so an undone transaction disappears from every total instantly, everywhere (Firestore, web, Google Sheets), without deleting the record.
- Undoing a transaction from a **past, closed season** must recalculate that season's totals *and* the current season's opening/previous-pending balances that were derived from it.

### 5.7 Khajanchi Personal-Fund Separation
The system must let the Finance Head compute, at any moment:
`Actual Personal Savings = Current Bank Balance − Net Mandal Online Pool`
where `Net Mandal Online Pool = Σ(Online Inflows) − Σ(Online Expenses)`.

## 6. Functional Requirements by Module

### 6.1 Members Tab
- Excel-style matrix (desktop) / expandable cards (mobile): rows = members, columns = active season months.
- Summary bar: Collected (YTD), Total Dues, Previous Year Balance.
- Cell states: paid amount, editable amount, blocked (`🚫`, non-interactive), honorary (`--`).
- Sortable by due amount (desc/asc), trackable up to a selectable month.
- Inline click-to-edit on any cell (Admin only), with an audit-logged change.

### 6.2 Buildings & Flats Tab
- Hierarchy: Building (name + short code) → Floor → Flat.
- Summary gauges: total collection, total registered flats, paid vs. pending flat counts.
- Wing cards with progress bar; drilling into a wing shows a floor-by-floor elevation grid (top floor → Ground).
- Flat cell states: **Paid** (emerald, resident name + amount) vs **Pending** (neutral, gray "Pending" label).
- Admin manages the hierarchy (add wing/code/floor/flat) from the same tab.

### 6.3 Extra Income / General Chanda Tab
- Manual entry form (name/shop, amount, cash/online toggle) for Admin, in addition to Telegram-sourced entries.
- Reverse-chronological log with transaction code, timestamp, mode.
- **Split View** toggle: unified chronological list vs. two columns (Offline sub-ledger / Online sub-ledger), each with its own subtotal and count.
- Inline delete/undo per entry.

### 6.4 Expenses Tab
- Reverse-chronological expense log: item, timestamp, amount (shown as `-₹X`), mode, transaction ID.
- Split View (cash vs. UPI outflow) identical pattern to Income tab.
- Edit and `<id> undo` support for refunds/returns, restoring the balance automatically.

### 6.5 Admin Control Center
- System sync status indicator (Telegram / Firestore / Sheets).
- Active season summary (dates, opening surplus) + "Create New Season" flow (season rollover engine).
- Quick actions: Member Settings, Wing Setup, Block Month, Export.
- One-click full Firestore export (JSON/CSV) and Sheets sync verification.
- Google Sign-In gate for all of the above.

### 6.6 Telegram Bot
See `Architecture.md` §5 for the full parsing state machine and `Agent-rules.md` for inviolable parsing invariants. Functional summary:
- **Slash commands** `/1`–`/9`: finance summary, member dues list, offline income, offline expense, online income, online expense, combined income, combined expense, help menu.
- **Freeform shorthand** (no slash) for data entry:
  - Member payment: `Name Amount [O]`
  - Building/flat collection: `Name BuildingCode FlatNo Amount [O]`
  - Chanda (no member match): `Name Amount [O]` → auto-routed to Chanda ledger
  - Expense: `- Amount Item [O]`
  - Member lookup: typing just a member's name returns their paid total + current due
  - Reversal: `<id> undo`
- Name matching is case-insensitive.
- `O` must be the final standalone token to mark a transaction online (prevents false positives from words containing "o").
- Every bot action writes to Firestore, mirrors to Google Sheets, and replies instantly with a plain, low-emoji confirmation.

## 7. Non-Functional Requirements

| Requirement | Target |
| :--- | :--- |
| Telegram bot round-trip (message → reply) | Sub-100ms typical (edge compute) |
| Web dashboard first paint | Fast/near-instant on 3G-class mobile connections |
| Data consistency | Firestore is single source of truth; Sheets and UI must never disagree with it |
| Security | Public read-only; write access gated to Firebase Google Auth (Admin) + authorized Telegram bot |
| Auditability | Every mutation must be reconstructable from `audit_logs`; no destructive edits/deletes on financial records |
| Mobile-first | All tabs must be fully usable on a phone; desktop gets denser table views as an enhancement, not a requirement |
| Design | Premium, clean, glassmorphism-influenced fintech aesthetic — see `DESIGN.md` |

## 8. Open Items Explicitly Deferred to v2
- Volunteer-level partial write access (e.g., "can add income, cannot edit/delete").
- In-app UPI payment verification / auto-reconciliation (e.g. Razorpay webhook matching).
- Multi-language UI toggle beyond bot-level Hinglish tone.
- Push notifications for large or unusual entries.

## 9. Success Criteria
- Finance Head can answer "how much is actually mine vs. the Mandal's" in one glance, at any time.
- A volunteer in the field can log a building-flat collection in under 10 seconds with no training beyond the `/9` help menu.
- A season rollover produces a correct opening balance and correctly split previous-year-pending / current-season-due figures with zero manual reconciliation.
- An admin can fully explain any number on the dashboard by tracing it through `audit_logs`.
