create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  name text not null,
  email text,
  is_anonymous boolean not null default false,
  weekday_periods jsonb not null default '{"sleep":480,"morning":120,"work":540,"evening":180,"free":120}'::jsonb,
  weekend_periods jsonb not null default '{"sleep":540,"morning":180,"work":180,"evening":240,"free":300}'::jsonb,
  created_at timestamptz not null default now()
);

alter table public.profiles
  alter column weekday_periods set default '{"sleep":480,"morning":120,"work":540,"evening":180,"free":120}'::jsonb;

alter table public.profiles
  alter column weekend_periods set default '{"sleep":540,"morning":180,"work":180,"evening":240,"free":300}'::jsonb;

create table if not exists public.activities (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  type text not null,
  duration integer not null default 15,
  period text not null default 'morning',
  selected_days jsonb not null default '[]'::jsonb,
  weeks integer not null default 0,
  start_date date not null,
  end_date date not null,
  completions jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.diaries (
  id text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  entry_date date not null,
  text text not null default '',
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;
alter table public.activities enable row level security;
alter table public.diaries enable row level security;

drop policy if exists "profiles_select_own" on public.profiles;
drop policy if exists "profiles_insert_own" on public.profiles;
drop policy if exists "profiles_update_own" on public.profiles;
drop policy if exists "activities_select_own" on public.activities;
drop policy if exists "activities_insert_own" on public.activities;
drop policy if exists "activities_update_own" on public.activities;
drop policy if exists "activities_delete_own" on public.activities;
drop policy if exists "diaries_select_own" on public.diaries;
drop policy if exists "diaries_insert_own" on public.diaries;
drop policy if exists "diaries_update_own" on public.diaries;
drop policy if exists "diaries_delete_own" on public.diaries;

create policy "profiles_select_own" on public.profiles
for select using (auth.uid() = id);

create policy "profiles_insert_own" on public.profiles
for insert with check (auth.uid() = id);

create policy "profiles_update_own" on public.profiles
for update using (auth.uid() = id);

create policy "activities_select_own" on public.activities
for select using (auth.uid() = user_id);

create policy "activities_insert_own" on public.activities
for insert with check (auth.uid() = user_id);

create policy "activities_update_own" on public.activities
for update using (auth.uid() = user_id);

create policy "activities_delete_own" on public.activities
for delete using (auth.uid() = user_id);

create policy "diaries_select_own" on public.diaries
for select using (auth.uid() = user_id);

create policy "diaries_insert_own" on public.diaries
for insert with check (auth.uid() = user_id);

create policy "diaries_update_own" on public.diaries
for update using (auth.uid() = user_id);

create policy "diaries_delete_own" on public.diaries
for delete using (auth.uid() = user_id);
