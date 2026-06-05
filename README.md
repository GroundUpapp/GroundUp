# Ground Up

A mobile-first financial dashboard for contractors. Track cash on hand, outstanding
invoices, job profitability, AI alerts, and an overall financial health score —
powered by your QuickBooks data.

## Stack

| Layer    | Tech                                            |
|----------|-------------------------------------------------|
| Frontend | React (Vite), React Router, Tailwind CSS v3     |
| Backend  | Node.js, Express                                |
| Auth     | Supabase Auth (email + password)                |
| Database | Supabase (Postgres)                             |
| Data     | QuickBooks Online API (mock fallback included)  |

This first milestone delivers the **authentication flow** and the **basic dashboard
structure**. Dashboard metrics are served from the backend, which falls back to mock
data until QuickBooks OAuth credentials are configured — so the UI is fully usable today.

## Project structure

```
ground-up/
  client/   React + Vite frontend (mobile-first, dark amber / off-white)
  server/   Express API: Supabase JWT verification + QuickBooks service
```

## Getting started

### 1. Supabase

1. Create a project at https://supabase.com
2. Enable Email auth (Authentication → Providers → Email). Disable "Confirm email"
   while developing if you want instant logins.
3. Copy your Project URL, anon key, and service role key.

### 2. Backend

```bash
cd server
cp .env.example .env   # fill in values
npm install
npm run dev            # http://localhost:4000
```

### 3. Frontend

```bash
cd client
cp .env.example .env   # fill in values
npm install
npm run dev            # http://localhost:5173
```

Open the printed URL on your phone (same network) or in a narrow browser window —
the layout is designed mobile-first.

## QuickBooks

`server/src/services/quickbooks.js` is where real QuickBooks Online API calls go.
Until you add OAuth credentials it returns realistic mock data so the dashboard works
end-to-end. See the TODOs in that file for the integration points.
