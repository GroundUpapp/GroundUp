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
4. Secure the QuickBooks tokens table: run
   `supabase/migrations/20260605120000_quickbooks_tokens_rls.sql` in the Supabase
   SQL Editor (or `supabase db push`). It enables RLS with deny-by-default for all
   client roles — these rows are OAuth secrets touched only by the backend's
   service-role key — and adds the `user_id` unique constraint the token upsert needs.

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

## Deploy to Vercel

`vercel.json` (project root) builds the client as a static site and runs the Express
app as a serverless function, serving both from one origin:

- `/api/*` → the Express app (`server/src/index.js`, exported as the handler)
- everything else → the built SPA (`client/dist`), with an `/index.html` fallback so
  client-side routes like `/dashboard` resolve.

```bash
vercel        # preview deploy
vercel --prod # production
```

### Required environment variables (Vercel → Project → Settings → Environment Variables)

Server (runtime):

| Variable | Notes |
|----------|-------|
| `SUPABASE_URL` | Supabase project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | Service role key (secret) — also signs the OAuth `state` |
| `QUICKBOOKS_CLIENT_ID` | Intuit app client id |
| `QUICKBOOKS_CLIENT_SECRET` | Intuit app client secret |
| `QUICKBOOKS_REDIRECT_URI` | `https://<your-domain>/api/auth/quickbooks/callback` (must match the Intuit app exactly) |
| `QUICKBOOKS_ENVIRONMENT` | `production` or `sandbox` |
| `APP_BASE_URL` | Optional. Leave blank for same-origin relative redirects |

Client (**build-time** — Vite inlines these, so they must be set before the build):

| Variable | Notes |
|----------|-------|
| `VITE_SUPABASE_URL` | Same as `SUPABASE_URL` |
| `VITE_SUPABASE_ANON_KEY` | Supabase anon (public) key |
| `VITE_API_URL` | Leave blank — the SPA calls `/api` on the same origin |
