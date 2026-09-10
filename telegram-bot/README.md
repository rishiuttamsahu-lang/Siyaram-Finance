# Siyaram Finance — Cloudflare Workers Telegram Bot

Ultra-fast, zero-friction edge Telegram Bot for field volunteers and Mandal administrators to record contributions, flat collections, general chanda, and expenses in real time.

All entries sync sub-second directly to **Google Cloud Firestore** and reflect instantly on the Siyaram Next.js Web Dashboard.

---

## 🚀 Quick Setup & Deployment Guide

### Step 1: Create Your Bot on Telegram
1. Open Telegram and search for [@BotFather](https://t.me/BotFather).
2. Send `/newbot` and follow the prompts to name your bot (e.g. `SiyaramFinanceBot`).
3. BotFather will provide you with an **API Token** formatted like:
   `7123456789:AAHabcdef...`
   *Keep this token safe!*

---

### Step 2: Configure Secrets in Cloudflare Workers
Open PowerShell or your terminal in this directory (`telegram-bot/`):

```bash
# 1. Install dependencies
npm install

# 2. Login to your Cloudflare account (if not already logged in)
npx wrangler login

# 3. Add your Telegram Bot Token as a secure secret
npx wrangler secret put TELEGRAM_BOT_TOKEN
# Paste your BotFather token when prompted

# 4. (Optional) Set an authorized Telegram User ID allowlist
# Leave unset to allow all field volunteers, or restrict to specific Telegram user IDs (comma-separated):
npx wrangler secret put AUTHORIZED_TELEGRAM_IDS
```

---

### Step 3: Deploy to Cloudflare Workers

Run the deploy command:

```bash
npx wrangler deploy
```

Wrangler will output your live worker URL:
`https://siyaram-telegram-bot.<your-subdomain>.workers.dev`

---

### Step 4: Register the Telegram Webhook

Once deployed, simply open your browser and navigate to the helper endpoint:

```
https://siyaram-telegram-bot.<your-subdomain>.workers.dev/set-webhook
```

You will see:
```json
{"ok":true,"result":true,"description":"Webhook was set"}
```

🎉 **Your Telegram Bot is now 100% LIVE and connected to Firebase Firestore!**

---

## ⚡ Field Usage & Syntax Guide

Field workers and volunteers can type natural shorthand without complex menus:

| Scenario | Syntax | Example | Action |
| :--- | :--- | :--- | :--- |
| **Member Cash Payment** | `<Name> <Amount>` | `Rahul 200` | Logs ₹200 cash, clears previous year debt first, then live month. |
| **Member Online UPI** | `<Name> <Amount> O` | `Rahul 200 O` | Logs ₹200 UPI, marks payment Online. |
| **Building Flat Cash** | `<Wing> <Flat> <Amount>` | `A 101 500` | Marks Wing A Flat 101 as PAID, updates elevation matrix. |
| **Building Flat UPI** | `<Name> <Wing> <Flat> <Amount> O` | `Rahul A 001 500 O` | Logs ₹500 UPI for Flat A-001. |
| **General Chanda** | `<Name> <Amount> [O]` | `SumitKirana 101` | Non-member names are automatically logged as Extra Chanda. |
| **Expense (Kharcha)** | `- <Amount> <Item> [O]` | `- 500 Decoration` | Deducts ₹500 cash expense from Mandal pool. |
| **Immediate Undo** | `<SeqNo> undo` | `3 undo` | Non-destructive reversal of TXN #3 in Firestore & Web UI. |
| **Member Check** | `<Name>` | `Rahul` | Instant query of member's total paid and current pending dues. |

### 📊 Quick Slash Commands
- `/1` or `/summary` — Complete Financial Summary (Total Festival Balance, Online UPI Pool, Cash Box).
- `/2` or `/dues` — Member Dues List (sorted with highest dues on top).
- `/3` — Offline Inflows (Cash ledger).
- `/4` — Offline Expenses (Cash expenditures).
- `/5` — Online Inflows (UPI ledger).
- `/6` — Online Expenses (UPI expenditures).
- `/7` — Combined Inflows.
- `/8` — Combined Expenses.
- `/9` or `/help` — Reference Guide.

---

## 🔒 Financial Invariant Rules Adhered To

1. **The Positional `O` Rule**: The letter `O` only signifies Online UPI when it is the **last standalone token**. Items like `- 500 Oil` are safely logged as Cash expenses without false triggers.
2. **Waterfall Payment Allocation**: Previous Year Debt $\rightarrow$ Current Live Month Target $\rightarrow$ Next Month Carry-Forward Credit.
3. **Audit Preservation**: Transactions are never deleted (`status: "REVERSED"` plus immutable audit log).
4. **Sequence Numbers**: Permanent monotonically increasing IDs (`#1`, `#2`, `#3`...) that never collapse.
