# Reimbursement Manager

Expense reimbursement system with multi-level approval workflows.
Built for Odoo Hackathon 2026.

## Team
- Nirmayee — Frontend, UI, UX
- Jaideep — Backend, Supabase, Approval Engine

## Tech Stack
- React + Vite + Tailwind + shadcn/ui
- Supabase (Auth, Postgres, Storage, Realtime)
- Gemini 2.5 Flash API (OCR receipt scanning)
- ExchangeRate API (currency conversion)

## Features
- Admin: company setup, user management, approval rule configuration
- Employee: expense submission with OCR receipt scanning, status tracking
- Manager: real-time approval queue with approve/reject + comments
- Supports sequential, percentage-based, required approver, and hybrid approval modes
- Real-time manager queue updates via Supabase Realtime

## How to Run
npm install && cp .env.example .env && npm run dev

## Environment Variables
VITE_SUPABASE_URL
VITE_SUPABASE_ANON_KEY
VITE_GEMINI_API_KEY
VITE_EXCHANGE_RATE_KEY