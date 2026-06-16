-- ============================================================
-- Integración con Google Calendar
-- Ejecutar en Supabase SQL Editor
-- ============================================================

alter table public.appointments
  add column if not exists google_event_id text,
  add column if not exists google_event_link text;

create table if not exists public.google_credentials (
  doctor_id uuid primary key references public.profiles(id) on delete cascade,
  refresh_token text not null,
  updated_at timestamptz not null default now()
);

alter table public.google_credentials enable row level security;

create policy "google_credentials: solo el dueño" on public.google_credentials
  for all using (doctor_id = auth.uid());
