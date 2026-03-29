-- ============================================================
-- Reimbursement Manager — Supabase Schema
-- Run this in Supabase SQL Editor
-- ============================================================

-- Companies
create table companies (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  country text not null,
  currency_code text not null,
  created_at timestamptz default now()
);

-- Users (extends Supabase auth.users)
create table users (
  id uuid primary key references auth.users(id) on delete cascade,
  company_id uuid references companies(id) on delete cascade,
  name text not null,
  email text not null,
  role text not null check (role in ('admin', 'manager', 'employee')),
  manager_id uuid references users(id) on delete set null,
  is_manager_approver boolean default false,
  created_at timestamptz default now()
);

-- Approval Rules
create table approval_rules (
  id uuid primary key default gen_random_uuid(),
  company_id uuid references companies(id) on delete cascade,
  name text not null,
  description text,
  sequential boolean default true,
  min_approval_pct int default 0 check (min_approval_pct between 0 and 100),
  created_at timestamptz default now()
);

-- Approvers assigned to a rule (ordered)
create table rule_approvers (
  id uuid primary key default gen_random_uuid(),
  rule_id uuid references approval_rules(id) on delete cascade,
  approver_id uuid references users(id) on delete cascade,
  step_order int not null,
  unique(rule_id, step_order)
);

-- Expenses
create table expenses (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid references users(id) on delete cascade,
  rule_id uuid references approval_rules(id) on delete set null,
  amount numeric not null,
  currency text not null,
  converted_amount numeric,
  company_currency text,
  category text not null,
  description text,
  date date not null,
  receipt_url text,
  status text not null default 'draft' check (status in ('draft', 'pending', 'approved', 'rejected')),
  current_step int default 0,
  created_at timestamptz default now()
);

-- Approval Actions (one row per approver per expense, pre-inserted on submit)
create table approval_actions (
  id uuid primary key default gen_random_uuid(),
  expense_id uuid references expenses(id) on delete cascade,
  approver_id uuid references users(id) on delete cascade,
  step_order int not null,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  comment text,
  acted_at timestamptz,
  created_at timestamptz default now()
);

-- ============================================================
-- Row Level Security (RLS)
-- ============================================================

alter table companies enable row level security;
alter table users enable row level security;
alter table approval_rules enable row level security;
alter table rule_approvers enable row level security;
alter table expenses enable row level security;
alter table approval_actions enable row level security;

-- Helper: get current user's role
create or replace function my_role()
returns text as $$
  select role from users where id = auth.uid();
$$ language sql security definer;

-- Helper: get current user's company
create or replace function my_company()
returns uuid as $$
  select company_id from users where id = auth.uid();
$$ language sql security definer;

-- Users: see only people in same company
create policy "users_same_company" on users
  for select using (company_id = my_company());

-- Users: admin can insert/update
create policy "admin_manage_users" on users
  for all using (my_role() = 'admin');

-- Expenses: employee sees own, manager sees team, admin sees all
create policy "employee_own_expenses" on expenses
  for select using (employee_id = auth.uid());

create policy "admin_all_expenses" on expenses
  for all using (my_role() = 'admin');

-- Approval actions: approver sees their own actions
create policy "approver_own_actions" on approval_actions
  for select using (approver_id = auth.uid());

create policy "admin_all_actions" on approval_actions
  for all using (my_role() = 'admin');

-- Approval rules: company-wide read, admin write
create policy "read_rules" on approval_rules
  for select using (company_id = my_company());

create policy "admin_write_rules" on approval_rules
  for all using (my_role() = 'admin');
