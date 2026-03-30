# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev       # Start Vite dev server at http://localhost:5173
npm run build     # Production build → ./dist/
npm run preview   # Preview production build locally
```

No test runner, linter, or formatter is configured.

## Environment Setup

Copy `.env.example` to `.env.local` and fill in the Firebase config values:

```
VITE_FIREBASE_API_KEY
VITE_FIREBASE_AUTH_DOMAIN
VITE_FIREBASE_PROJECT_ID
VITE_FIREBASE_STORAGE_BUCKET
VITE_FIREBASE_MESSAGING_SENDER_ID
VITE_FIREBASE_APP_ID
```

All env vars are prefixed with `VITE_` and accessed via `import.meta.env.*`.

## Architecture

**Money Pots** is an envelope-budgeting SPA. Users allocate real bank account balances into virtual saving pots. Authentication is Google OAuth only. All data is stored per-user in Firestore with real-time subscriptions.

### Data flow

```
Firebase onSnapshot subscriptions → Dashboard.jsx state → tab components → Firestore writes
```

`Dashboard.jsx` sets up three live subscriptions (pots, accounts, transactions) and passes data + write handlers down as props. There is no global state library — Firestore is the source of truth.

### Key library files

| File | Purpose |
|------|---------|
| [src/lib/firebase.js](src/lib/firebase.js) | Firebase app init, Google auth provider |
| [src/lib/db.js](src/lib/db.js) | All Firestore CRUD + `onSnapshot` subscriptions |
| [src/lib/allocation.js](src/lib/allocation.js) | Smart allocation algorithm |
| [src/hooks/useAuth.js](src/hooks/useAuth.js) | `user`, `login()`, `logout()` from Firebase auth |

### Allocation algorithm (`src/lib/allocation.js`)

`smartAllocate(accounts, amount)` distributes a requested amount across accounts greedily by highest available balance first.

- **Salary accounts:** full balance is available
- **Savings accounts:** available = balance − minBalance
- Returns `{ allocs, shortfall }` — shortfall > 0 if accounts can't cover the amount

`fmt(n)` formats numbers as Indian Rupee strings (₹, `en-IN` locale).

### Firestore schema

All collections live under `users/{userId}/`:

- **pots:** `{ name, target, saved, icon (emoji), color (hex), createdAt }`
- **accounts:** `{ name, bank, type ('salary'|'savings'), balance, minBalance, createdAt }`
- **transactions:** `{ potId, potName, amount, sources: [{accountId, accountName, deduct}], createdAt }`

Security rules in `firestore.rules` ensure each user can only access their own data.

### Styling

Pure CSS with custom properties (no framework). Design tokens are in [src/index.css](src/index.css):

- `--clay` / `--clay-dark` / `--clay-light` — primary warm brown palette
- `--sand` — body background
- `--ink` / `--ink-muted` / `--ink-faint` — text hierarchy

Fonts: **DM Sans** (body) and **Fraunces** serif (headings/amounts).

### Deployment

`vercel.json` rewrites all routes to `/index.html` for client-side routing. After deploying to Vercel, add the Vercel domain to Firebase's authorized domains list.
