# Telegram Bot Audit Report

**Target Project:** `C:\Users\Rishikesh\OneDrive\Documents\GitHub\cloudflare_worker`  
**Inspected Date:** September 11, 2026  
**Auditor:** Antigravity AI  
**Scope:** Architecture, Security, Webhooks, Firestore/Sheets Integration, Parsing Logic, and Migration Plan

---

## 1. System Identity & Runtime Environment

| Property | Details |
|---|---|
| **Bot Type** | Multi-channel Financial Assistant (Telegram Bot Webhook + WhatsApp Cloud API Gateway + Study Hub Notes Webhook) |
| **Runtime Platform** | Cloudflare Workers (V8 Serverless Edge) |
| **Configuration** | `wrangler.toml` (`name = "siyaram-mandal-bot"`, `compatibility_date = "2024-11-01"`, `main = "index.js"`) |
| **Deployment Mode** | Serverless Webhook (`POST /` and `POST /webhook`) |
| **Dependencies** | None at runtime (uses native Web Crypto, `fetch`, and Google REST APIs); devDependency `wrangler: ^3.100.0` |

---

## 2. Secrets & Environment Variables

Configured in Cloudflare Worker bindings (`settings.json` / `wrangler.toml`):
- `FIREBASE_PROJECT_ID`: Target Firebase project (`studio-3440483519-68ed7`)
- `GOOGLE_CLIENT_EMAIL`: Google Service Account email for OAuth2 Bearer token generation
- `GOOGLE_PRIVATE_KEY`: RSA-256 private key for signing Google OAuth2 JWTs
- `SPREADSHEET_ID`: Target Google Sheet ID for live mirroring
- `TELEGRAM_BOT_TOKEN`: Telegram Bot Father token
- `GEMINI_API_KEY`: Configured but unused in `index.js` (parser is deterministic regex)
- `WHATSAPP_VERIFY_TOKEN`: Webhook challenge token for Meta WhatsApp API

---

## 3. Webhook Endpoints & Inbound Message Handling

1. **Telegram Webhook (`POST /` & `POST /webhook`)**:
   - Parses `payload.message.text` and `payload.message.chat.id`.
   - Strips leading `/` if present.
   - Forwards to `processMandalMessage(env, userText)`.
   - Sends reply via `sendTelegramMessage(env, chatId, reply)`.
2. **WhatsApp Webhook (`GET /whatsapp` & `POST /whatsapp`)**:
   - Handles Meta challenge verification (`hub.challenge`).
   - Forwards inbound text messages to `processMandalMessage`.
3. **Delete Sync Webhook (`POST /delete-sync`)**:
   - Matches a Google Sheet row by name and amount and deletes the row index.

---

## 4. Supported Telegram Commands & Syntax

### A. Information Commands
- `/1` or `1` or `summary` or `dashboard`: Financial summary (Total Money, Online, Offline, Expenses, Net Balance)
- `/2` or `2` or `expense` or `expenses`: Paginated expense list (e.g. `2 2` for page 2)
- `/3` or `3` or `income` or `incomes`: Paginated income list (e.g. `3 2` for page 2)
- `/4` or `4` or `undo`: Dual undo (reverses latest entry)
- `/5` or `5` or `excel` or `sheet`: Returns Google Sheet direct web link
- `/6` or `6` or `redo`: Redo latest undone action
- `/7` or `7` or `online`: Online wallet breakdown (collections, online expenses, net UPI pool)
- `/8` or `8` or `dues` or `due`: Member dues list sorted by pending amount
- `/9` or `9` or `sync`: Data sync audit check between Sheet and Firestore
- `/0` or `menu` or `help`: Command help menu

### B. Transaction Entry Commands
- **Member Payment**: `Rahul 200` (Cash), `Rahul 200 O` (Online UPI)
- **Building / Flat Donation**: `Rohit A 101 500` or `Rohit A-101 500` or `Rohit B2 102 250 O`
- **Expense**: `Tape -100` or `-100 Tape` or `Tape 100 kharcha` or `* 500 Decoration O`
- **Direct Online Total Adjustment**: `100 O` (+₹100 to Online pool), `-100 O` (-₹100 from Online pool)
- **Specific Line Undo**: `3 undo` or `undo 3` (reverses specific entry)
- **Single Member Lookup**: `Rishi` or `due Rishi` (shows dues breakdown for that member)

### C. Positional `O` Rule
- `\b(o|online)\b$/i`: `O` is recognized **only when it is the trailing/final token** in the string.
- Words containing 'O' (e.g. `Oil -200`, `Orange -100`, `Photo -500`) are **not** treated as online.

---

## 5. Root Causes of Data Drift & Flaws in Old Bot

| Area | Old Bot Flaw | Impact |
|---|---|---|
| **Source of Truth** | Treated Google Sheet as source of truth (`// NOTE: Single source of truth = Google Sheet`) | When network lag or manual edit touched Sheets, Firestore became out of sync |
| **Fragmented Writes** | Flat payments sequentially wrote to 4 collections (`chanda_seasons`, `buildings`, `building_chanda`, Google Sheet) inside separate `try/catch` | If one write failed, data silently diverged |
| **Hard-Delete Undo** | Undo physically deleted documents from Firestore and moved them to `trash_bin` | Destroyed audit history and broke sequential numbering |
| **Incomplete Sync Check** | Command `9` only counted expense logs, ignoring members, flats, and general chanda | Gave false confidence that data was synced when it was drifting |
| **Hardcoded Quota Fallbacks** | Hardcoded ₹500 flat targets and ₹100/₹200 fallbacks | Overwrote dynamic season configurations |

---

## 6. Target Shared Architecture (Phase 3–9)

```text
               ┌───────────────────────────────┐
               │    UNIFIED TRANSACTION ENGINE │
               │   (Shared Rules & Invariants) │
               └───────────────┬───────────────┘
                               │
            ┌──────────────────┴──────────────────┐
            ▼                                     ▼
┌───────────────────────┐             ┌───────────────────────┐
│     NEW WEBSITE UI    │             │ CLOUDFLARE TG BOT     │
│ (Admin Panel / Forms) │             │ (Telegram / WhatsApp) │
└───────────┬───────────┘             └───────────┬───────────┘
            │                                     │
            └──────────────────┬──────────────────┘
                               │
                               ▼
            ┌─────────────────────────────────────┐
            │   CANONICAL FIRESTORE (Primary DB)  │
            │  seasons · members · buildings ·    │
            │  transactions · auditLogs           │
            └──────────────────┬──────────────────┘
                               │ (Fire-and-forget / Audit mirror)
                               ▼
            ┌─────────────────────────────────────┐
            │       GOOGLE SHEETS (Mirror)        │
            │      Passive append-only sheet      │
            └─────────────────────────────────────┘
```

### Key Unified Invariants:
1. **Single Database of Record**: Firestore collections (`seasons`, `members`, `buildings`, `transactions`, `auditLogs`) are the only source of truth.
2. **Sequential Human-Readable IDs**: Every transaction receives `#101`, `#102`, etc.
3. **Soft-Reversals (`status: 'REVERSED'`)**: Never hard-delete or reuse IDs.
4. **Source Attribution**: `source: 'WEBSITE' | 'TELEGRAM'`.
5. **Passive Google Sheet Mirror**: Written after Firestore commits; never used for financial calculations.
