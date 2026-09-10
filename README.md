# Siyaram Finance — Next.js & Cloudflare Workers Architecture

A mobile-first, high-precision financial ledger and management system designed for **Siyaram Mandal (Ganesh Utsav)**.

## System Architecture

```
Telegram Mobile/Desktop Bot ──► Cloudflare Workers (V8 Edge) ──► Firebase Firestore (Realtime DB)
                                                                             │
Next.js 16 Web Dashboard ────────────────────────────────────────────────────┘
```

- **Web Portal**: Next.js 16 (Turbopack, React 19, Vanilla CSS + Tailwind, Mobile-first iOS aesthetic).
- **Telegram Bot**: Cloudflare Workers engine for ultra-fast, zero-friction field collection.
- **Database**: Google Cloud Firestore (Document model, real-time listeners).
- **Authentication**: Google OAuth with Admin role allowlist.

## Repository Structure

- `app/` — Next.js application routes, layout, and global styles.
- `components/` — Mobile-first glassmorphic components and tab views (Dashboard, Members, Dues, Buildings, Transactions, Sync, Users, Logs).
- `lib/` — Shared financial mathematics (`finance.ts`), Firebase configuration (`firebase.ts`), Firestore service (`firestoreService.ts`), and TypeScript data models (`types.ts`).
- `telegram-bot/` — Cloudflare Workers Telegram Bot edge engine.
- `firestore.rules` — Production Firestore security rules.
- `Product-explanation.md` — Master functional specification & mathematical invariants.
- `Agent-rules.md` — Rules for AI coding agents regarding financial integrity.

## Local Development

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Production build
npm run build
```

## Telegram Bot Deployment (Cloudflare Workers)

See [`telegram-bot/README.md`](./telegram-bot/README.md) for step-by-step instructions on setting up the Telegram Bot token and deploying to Cloudflare Workers via Wrangler.
