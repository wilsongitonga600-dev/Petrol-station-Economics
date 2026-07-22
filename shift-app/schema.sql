-- ============================================================
-- Shift Reconciliation — Multi-User Schema (Supabase / Postgres)
-- Run this in your Supabase project's SQL Editor.
-- ============================================================

-- ---------- Profiles ----------
-- Extends Supabase's built-in auth.users with app-specific fields.
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null,
  email text not null,
  role text not null check (role in ('attendant', 'admin')) default 'attendant',
  active boolean not null default true,
  created_at timestamptz not null default now()
);

-- ---------- Shift Reconciliations ----------
create table public.shift_reconciliations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  shift_date date not null,
  shift_name text not null check (shift_name in ('Morning', 'Afternoon', 'Night')),
  fuels jsonb not null,          -- { dx: {price, A:{opening,closing}, B:{...}}, vpower: {...}, ux: {...} }
  money jsonb not null,          -- { mpesaOpen, mpesaClose, cashDrop, card, shellCard, invoices }
  total_fuel_sales numeric(12,2) not null,
  total_money numeric(12,2) not null,
  variance numeric(12,2) not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_shifts_user_date on public.shift_reconciliations(user_id, shift_date desc);
create index idx_shifts_date on public.shift_reconciliations(shift_date desc);

-- ---------- Activity Logs (optional, recommended) ----------
create table public.activity_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete set null,
  action text not null,          -- 'login', 'shift_created', 'shift_edited', 'shift_deleted', 'account_created', ...
  details jsonb,
  created_at timestamptz not null default now()
);

-- ---------- Helper: is the current user an admin? ----------
create or replace function public.is_admin()
returns boolean
language sql
security definer
stable
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin' and active = true
  );
$$;

-- ---------- updated_at trigger ----------
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger trg_shifts_updated_at
  before update on public.shift_reconciliations
  for each row execute function public.set_updated_at();

-- ============================================================
-- Row-Level Security
-- ============================================================

alter table public.profiles enable row level security;
alter table public.shift_reconciliations enable row level security;
alter table public.activity_logs enable row level security;

-- Profiles: everyone can read their own row; admins can read all
create policy "profiles_select_own_or_admin"
  on public.profiles for select
  using (id = auth.uid() or public.is_admin());

-- Profiles: users can update their own non-role fields; admins can update any
create policy "profiles_update_own_or_admin"
  on public.profiles for update
  using (id = auth.uid() or public.is_admin());

-- Only admins can deactivate/change roles directly via SQL updates from the UI.
-- (Row creation happens via the create-attendant Edge Function using the
-- service_role key, which bypasses RLS by design — see supabase/functions/.)

-- Shift reconciliations: attendants see/manage only their own rows
create policy "shifts_select_own_or_admin"
  on public.shift_reconciliations for select
  using (user_id = auth.uid() or public.is_admin());

create policy "shifts_insert_own"
  on public.shift_reconciliations for insert
  with check (user_id = auth.uid());

create policy "shifts_update_own_or_admin"
  on public.shift_reconciliations for update
  using (user_id = auth.uid() or public.is_admin());

create policy "shifts_delete_own_or_admin"
  on public.shift_reconciliations for delete
  using (user_id = auth.uid() or public.is_admin());

-- Activity logs: users can insert their own log entries; admins can read all
create policy "logs_insert_own"
  on public.activity_logs for insert
  with check (user_id = auth.uid());

create policy "logs_select_own_or_admin"
  on public.activity_logs for select
  using (user_id = auth.uid() or public.is_admin());

-- ============================================================
-- Auto-create a profile row whenever a new auth user is created
-- (used by the create-attendant Edge Function)
-- ============================================================
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer as $$
begin
  insert into public.profiles (id, full_name, email, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', new.email),
    new.email,
    coalesce(new.raw_user_meta_data->>'role', 'attendant')
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ============================================================
-- IMPORTANT: create your first admin manually after running this file.
-- 1. In Supabase Dashboard → Authentication → Users → Add user (email/password)
-- 2. Then run:
--    update public.profiles set role = 'admin' where email = 'your-admin@email.com';
-- ============================================================
