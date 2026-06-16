-- ============================================================
-- TABLA: appointments (agenda de turnos)
-- Ejecutar en Supabase SQL Editor
-- ============================================================
create table public.appointments (
  id uuid primary key default uuid_generate_v4(),
  doctor_id uuid not null references public.profiles(id) on delete cascade,
  patient_id uuid not null references public.patients(id) on delete cascade,
  institution_id uuid references public.institutions(id),
  scheduled_at timestamptz not null,
  reason text,
  status text not null default 'pendiente' check (status in ('pendiente', 'confirmado', 'cancelado', 'realizado')),
  created_at timestamptz default now()
);

create index idx_appointments_doctor on public.appointments(doctor_id);
create index idx_appointments_patient on public.appointments(patient_id);
create index idx_appointments_scheduled on public.appointments(scheduled_at);

alter table public.appointments enable row level security;

create policy "appointments: solo el médico dueño" on public.appointments
  for all using (doctor_id = auth.uid());
