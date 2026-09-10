# Agent-rules.md — Rules for AI Coding Agents

This file governs any AI coding agent (Claude Code, Cursor, Antigravity, Copilot Workspace, etc.) working on this codebase. It exists because this system moves real money records for real people — a plausible-looking but wrong calculation is worse than a visible bug. Read this before writing code in `/bot`, `/web`, `/lib` (shared logic), or `/firestore.rules`.

---

## 1. Non-Negotiable Financial Invariants

These must hold after **every** change, with no exceptions, no matter what the person asks for:

1. **No destructive writes on financial records.** Never `delete()` a transaction document, a season, or an audit log entry. Corrections and reversals are always additive (new audit log entry) or in-place field updates on the existing document — see `Architecture.md` §6. If a task seems to require deleting a transaction, stop and flag it — the correct operation is almost certainly `status: "REVERSED"` plus an audit log.
2. **Totals are always derived from `status == "ACTIVE"` transactions**, never from a manually incremented counter that isn't rebuildable from the transaction log. If you add a new aggregate (a new summary card, a new report), write it as a query/reduction over the transaction log, or as a cache that is provably re-derivable from it.
3. **The Live Month Due Rule is absolute.** A future month's configured quota must never appear in "Total Dues," "Current Due," or any due-badge, until that month becomes the season's tracked live month. If you touch due-calculation code, re-run the worked examples in `PRD.md` §5.4 and `Architecture.md` §3 before considering the change done.
4. **The Payment Allocation Waterfall order is fixed:** Previous Year Pending → Current Season Live Due → Next Active Unblocked Month carry-forward. Do not reorder this, do not make it configurable per-member without an explicit, separate instruction — it was locked deliberately after working through edge cases with the product owner.
5. **Business logic lives in one shared module** (`Architecture.md` §4), imported by both the Cloudflare Worker and the Next.js app. Never re-implement due calculation, allocation, or reversal logic inline in a bot handler or a React component "just for this one screen." If the shared module doesn't yet expose what a new feature needs, extend the shared module — don't fork the logic.
6. **Firestore is the source of truth.** Google Sheets writes happen *after* a successful Firestore write and must never gate, block, or roll back it. If a Sheets write fails, surface a sync-drift flag — do not retry-loop in a way that could delay or duplicate the Firestore-side confirmation to the user.
7. **Sequence numbers (transaction codes) are permanent and never reused**, even after undo. Don't "compact" or renumber them for tidiness.

## 2. Telegram Bot Parsing Rules

1. **The `O` online-flag rule is positional, not substring-based.** `O` only means "online" when it is the final, standalone, whitespace-delimited token. Never implement this as `message.includes("O")` or any case-insensitive substring check — that breaks on any item/name containing the letter O (the spec's own example: `- 500 Oil`).
2. **Member name matching is case-insensitive but exact** (after normalization) — do not implement fuzzy/typo-tolerant matching without being asked; an unintended fuzzy match silently misroutes someone's money to the wrong person.
3. **Unresolved routing must fail loud, not silent.** If a message looks like a building/flat collection but the building code or flat number doesn't exist, reply with a specific, correctable error — never silently fall through to "General Chanda" or drop the message.
4. **The Worker must check `authorizedTelegramUserIds` before executing any mutating command.** Read-only slash commands may be treated more leniently only if explicitly instructed; default to deny-by-default for both reads and writes from unrecognized senders.
5. **Reply latency matters more than reply prose.** Keep Telegram replies short, low-emoji, and computed after the Firestore write is confirmed — don't optimistically reply before the write succeeds.

## 3. Data & Schema Discipline

1. **Don't change the Firestore document shape in `Architecture.md` §3 without updating that section.** The schema is the contract between the bot and the web app; a silent field rename or restructure breaks the other client.
2. **Season documents are append-only at the collection level.** New seasons are created, never overwritten; `isActive` toggles, but historical seasons stay queryable forever.
3. **`monthlyOverrides` and `payments` are keyed by `"YYYY-MM"` strings**, not array indices — festival seasons have variable length and don't align to calendar years, so month-index assumptions (e.g. "month 0 = September") will break across seasons that start on a different month.
4. **Never hardcode "12 months" anywhere** — season length is variable by design (10, 12, 14+ months). Any loop, array size, or UI column count driven by month count must read the season's actual configured months.

## 4. Security

1. **Never embed the Telegram bot token, Google service account key, or any Firebase Admin credential in client-side (browser-shipped) code.** These belong only in Cloudflare Worker secrets or server-side environment config.
2. **Every new Firestore write path must be checked against `firestore.rules`** — if a new feature needs a new write pattern, update the rules deliberately and narrowly; don't loosen a rule broadly (e.g. `allow write: if true`) to unblock a feature during development and leave it that way.
3. **Admin-gated UI routes must also be Firestore-rule-gated.** Hiding an "Admin" button in the UI is not a security boundary — the actual write must be rejected server-side for non-admins regardless of what the client sends.
4. **Public read access is intentional and should not be narrowed** without being explicitly asked — read-only transparency for the community is a stated product goal, not an oversight to "fix."

## 5. Design & UI Conventions

1. Follow `DESIGN.md` tokens and components for any new screen — don't introduce a new color, radius, or card style ad hoc. If a new pattern is genuinely needed, propose an addition to `DESIGN.md` rather than a one-off.
2. Mobile-first: build and test the mobile layout before the desktop enhancement layer, per `PHASES.md` and the user's established mobile-first preference.
3. Currency formatting is always `₹` with Indian digit grouping (₹1,23,456), never `$` or Western thousands-grouping, even if a library's default differs.
4. Paid/positive states use the green tokens; pending/neutral states use muted gray-green; overdue/negative/expense states use red — never swap these semantics for stylistic reasons (e.g. don't make "Pending" red just because it visually "pops" more; that contradicts the color language fixed in `DESIGN.md`).

## 6. Working Process for Agents

1. **Before implementing a calculation change**, restate the relevant worked example from `PRD.md` or `Architecture.md` and confirm the change still produces the correct output for it. If it doesn't, the change is wrong, not the example.
2. **Before touching shared logic** (`/lib`), check both the Worker and the web app for existing call sites — a change there is cross-cutting by design.
3. **When a request is ambiguous about which of these documents it affects** (e.g., "add a new tab"), update `PRD.md` (scope) and this file's relevant section (if it introduces a new invariant) in the same change — don't let the docs drift from the shipped behavior.
4. **Never silently drop the audit trail to "simplify" a feature.** If a proposed simplification would remove the ability to reconstruct history, flag it explicitly rather than implementing it.
5. **When in doubt about a business rule not covered here**, prefer the interpretation that matches the worked examples in `PRD.md` over a generic/common-sense interpretation — this system was scoped through detailed back-and-forth with the product owner, and several rules (the waterfall order, the live-month cap, the audit-preserving edit model) are intentionally stricter than a naive implementation would be.
