-- Wealth OS - Supabase schema and RLS policies
-- Run this in the Supabase SQL Editor to create tables and enable RLS

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- ========== Array tables (one row per item) ==========
create table if not exists accounts (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references auth.users(id) on delete cascade not null,
  data jsonb not null default '{}',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists transactions (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references auth.users(id) on delete cascade not null,
  data jsonb not null default '{}',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists transfers (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references auth.users(id) on delete cascade not null,
  data jsonb not null default '{}',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists goals (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references auth.users(id) on delete cascade not null,
  data jsonb not null default '{}',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists reminders (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references auth.users(id) on delete cascade not null,
  data jsonb not null default '{}',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists snapshots (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references auth.users(id) on delete cascade not null,
  data jsonb not null default '{}',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists recurring_items (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references auth.users(id) on delete cascade not null,
  data jsonb not null default '{}',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists properties (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references auth.users(id) on delete cascade not null,
  data jsonb not null default '{}',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists liabilities (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references auth.users(id) on delete cascade not null,
  data jsonb not null default '{}',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists insurance (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references auth.users(id) on delete cascade not null,
  data jsonb not null default '{}',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists networth_snapshots (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references auth.users(id) on delete cascade not null,
  data jsonb not null default '{}',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- ========== Singleton tables (one row per user) ==========
create table if not exists settings (
  user_id uuid primary key references auth.users(id) on delete cascade,
  data jsonb not null default '{}',
  updated_at timestamptz default now()
);

create table if not exists business (
  user_id uuid primary key references auth.users(id) on delete cascade,
  data jsonb not null default '{}',
  updated_at timestamptz default now()
);

create table if not exists tax (
  user_id uuid primary key references auth.users(id) on delete cascade,
  data jsonb not null default '{}',
  updated_at timestamptz default now()
);

create table if not exists uk_allowances (
  user_id uuid primary key references auth.users(id) on delete cascade,
  data jsonb not null default '{}',
  updated_at timestamptz default now()
);

create table if not exists investments (
  user_id uuid primary key references auth.users(id) on delete cascade,
  data jsonb not null default '{}',
  updated_at timestamptz default now()
);

-- ========== RLS ==========
alter table accounts enable row level security;
alter table transactions enable row level security;
alter table transfers enable row level security;
alter table goals enable row level security;
alter table reminders enable row level security;
alter table snapshots enable row level security;
alter table recurring_items enable row level security;
alter table properties enable row level security;
alter table liabilities enable row level security;
alter table insurance enable row level security;
alter table networth_snapshots enable row level security;
alter table settings enable row level security;
alter table business enable row level security;
alter table tax enable row level security;
alter table uk_allowances enable row level security;
alter table investments enable row level security;

-- Array tables: users see only their rows
create policy "users_own_accounts" on accounts for all using (auth.uid() = user_id);
create policy "users_own_transactions" on transactions for all using (auth.uid() = user_id);
create policy "users_own_transfers" on transfers for all using (auth.uid() = user_id);
create policy "users_own_goals" on goals for all using (auth.uid() = user_id);
create policy "users_own_reminders" on reminders for all using (auth.uid() = user_id);
create policy "users_own_snapshots" on snapshots for all using (auth.uid() = user_id);
create policy "users_own_recurring" on recurring_items for all using (auth.uid() = user_id);
create policy "users_own_properties" on properties for all using (auth.uid() = user_id);
create policy "users_own_liabilities" on liabilities for all using (auth.uid() = user_id);
create policy "users_own_insurance" on insurance for all using (auth.uid() = user_id);
create policy "users_own_networth_snapshots" on networth_snapshots for all using (auth.uid() = user_id);

-- Singleton tables
create policy "users_own_settings" on settings for all using (auth.uid() = user_id);
create policy "users_own_business" on business for all using (auth.uid() = user_id);
create policy "users_own_tax" on tax for all using (auth.uid() = user_id);
create policy "users_own_uk_allowances" on uk_allowances for all using (auth.uid() = user_id);
create policy "users_own_investments" on investments for all using (auth.uid() = user_id);
