# Reimbursement Manager

Multi-level expense reimbursement system with configurable approval workflows.

## Stack
- **Frontend:** React + Vite + Tailwind CSS
- **Backend/DB/Auth:** Supabase (Postgres + Auth + RLS)
- **OCR:** Anthropic Claude API
- **Currency:** restcountries + exchangerate-api

## Setup

```bash
npm install
cp .env.example .env   # fill in your keys
npm run dev
```

## Supabase Setup
1. Create a new project at supabase.com
2. Go to SQL Editor → paste contents of `supabase/schema.sql` → Run
3. Copy your project URL and anon key into `.env`

## Environment Variables
| Variable | Where to get it |
|---|---|
| VITE_SUPABASE_URL | Supabase → Settings → API |
| VITE_SUPABASE_ANON_KEY | Supabase → Settings → API |
| VITE_ANTHROPIC_API_KEY | console.anthropic.com |

## Features
- Role-based auth: Admin / Manager / Employee
- Company auto-created on admin signup with country currency
- Multi-level sequential approval chains
- Conditional approval (% threshold)
- OCR receipt scanning → auto-fill expense form
- Real-time currency conversion

## Team
- Person A: Backend logic (approvalEngine, Supabase schema, auth)
- Person B: Frontend UI (pages, components, forms)
