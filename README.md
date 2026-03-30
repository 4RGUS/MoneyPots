# 🏺 Money Pots

Save with purpose. A virtual envelope-budgeting app where every rupee has a goal.

## Features
- Create saving pots with a target amount and track progress
- Add multiple bank accounts (salary or savings) with minimum balance rules
- Smart top-up: automatically allocates from the account with the highest available balance first, while respecting minimum balance requirements
- Transaction history showing which accounts funded each top-up
- Google sign-in — your data is private to you
- Syncs in real time across devices via Firestore

---

## Setup

### 1. Firebase project

1. Go to [console.firebase.google.com](https://console.firebase.google.com) and create a new project
2. In **Authentication → Sign-in method**, enable **Google**
3. In **Firestore Database**, create a database in production mode
4. Paste the Firestore security rules from `firestore.rules` into the Firestore Rules tab
5. In **Project settings → Your apps**, add a Web app and copy the config values

### 2. Local development

```bash
npm install
cp .env.example .env.local
# Fill in your Firebase values in .env.local
npm run dev
```

### 3. Deploy to Vercel

**Option A — Vercel dashboard (recommended)**

1. Push this repo to GitHub
2. Go to vercel.com → New Project → Import the repo
3. In Environment Variables, add all 6 VITE_FIREBASE_* keys
4. Click Deploy

**Option B — Vercel CLI**

```bash
npm i -g vercel
vercel
vercel env add VITE_FIREBASE_API_KEY
vercel env add VITE_FIREBASE_AUTH_DOMAIN
vercel env add VITE_FIREBASE_PROJECT_ID
vercel env add VITE_FIREBASE_STORAGE_BUCKET
vercel env add VITE_FIREBASE_MESSAGING_SENDER_ID
vercel env add VITE_FIREBASE_APP_ID
vercel --prod
```

### 4. Add your Vercel domain to Firebase

After deploying, copy your Vercel URL (e.g. moneypots.vercel.app) and add it to:
Firebase console → Authentication → Settings → Authorized domains

---

## How smart allocation works

When you top up a pot with an amount:

1. Compute available balance per account:
   - Salary account: full balance
   - Savings account: balance minus minimum balance requirement
2. Sort by available balance, highest first
3. Greedily deduct from top account, spill over to next if needed
4. If total available is less than requested, adds what it can and warns about shortfall
