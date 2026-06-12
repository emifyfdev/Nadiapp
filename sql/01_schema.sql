-- ============================================================
-- SCHEMA PRINCIPAL — Historia Clínica Digital
-- Ejecutar en Supabase SQL Editor en orden
-- ============================================================

-- Extensión para UUIDs
create extension if not exists "uuid-ossp";

-- ============================================================
-- TABLA: profiles (extiende auth.users de Supabase)
-- ============================================================
create table public.profiles (
  id uuid references auth.users(id) on delete cascade primary key,
  email text not null,
  full_name text,
  avatar_url text,
  role text not null default 'pending' check (role in ('pending', 'approved', 'rejected', 'superadmin')),
  specialty text,                    -- ej: "Clínica Médica", "Pediatría"
  license_number text,               -- matrícula
  phone text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  approved_at timestamptz,
  approved_by uuid references public.profiles(id),
  last_seen_at timestamptz
);

-- ============================================================
-- TABLA: institutions (instituciones precargadas + custom)
-- ============================================================
create table public.institutions (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  type text check (type in ('hospital', 'clinica', 'consultorio', 'sanatorio', 'otro')),
  address text,
  is_default boolean default false,   -- precargadas por superadmin
  created_by uuid references public.profiles(id),
  created_at timestamptz default now()
);

-- ============================================================
-- TABLA: patients (pacientes por médico)
-- ============================================================
create table public.patients (
  id uuid primary key default uuid_generate_v4(),
  doctor_id uuid not null references public.profiles(id) on delete cascade,
  first_name text not null,
  last_name text not null,
  dni text,
  birth_date date,
  gender text check (gender in ('masculino', 'femenino', 'otro', 'no_especifica')),
  email text,
  phone text,
  address text,
  -- Obra social
  insurance_name text,               -- nombre obra social
  insurance_number text,             -- nro afiliado
  insurance_plan text,
  -- Antecedentes
  allergies text,
  chronic_conditions text,
  previous_symptoms text,
  medications text,                  -- medicación habitual
  notes text,                        -- notas generales
  is_active boolean default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- ============================================================
-- TABLA: consultations (consultas / visitas)
-- ============================================================
create table public.consultations (
  id uuid primary key default uuid_generate_v4(),
  patient_id uuid not null references public.patients(id) on delete cascade,
  doctor_id uuid not null references public.profiles(id) on delete cascade,
  institution_id uuid references public.institutions(id),
  consultation_date timestamptz not null default now(),
  -- Clínica
  reason text not null,              -- motivo de consulta
  symptoms text,
  physical_exam text,
  diagnosis text,
  treatment text,
  prescriptions text,
  follow_up text,                    -- indicaciones seguimiento
  notes text,
  -- Facturación
  billing_code text,                 -- código prestación (ej: OSDE 010)
  billing_description text,
  billing_amount numeric(10,2),
  billing_status text default 'pendiente' check (billing_status in ('pendiente', 'auditado', 'facturado', 'cobrado')),
  -- Adjuntos
  has_attachments boolean default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- ============================================================
-- TABLA: attachments (PDFs, estudios, imágenes)
-- ============================================================
create table public.attachments (
  id uuid primary key default uuid_generate_v4(),
  consultation_id uuid not null references public.consultations(id) on delete cascade,
  doctor_id uuid not null references public.profiles(id),
  patient_id uuid not null references public.patients(id),
  file_name text not null,
  file_type text,                    -- 'pdf', 'image', 'lab_result', etc.
  storage_path text not null,        -- path en Supabase Storage
  file_size_kb integer,
  description text,
  uploaded_at timestamptz default now()
);

-- ============================================================
-- TABLA: audit_log (log de acciones del superadmin)
-- ============================================================
create table public.audit_log (
  id uuid primary key default uuid_generate_v4(),
  actor_id uuid references public.profiles(id),
  action text not null,              -- 'approve_user', 'reject_user', etc.
  target_id uuid,
  target_type text,
  metadata jsonb,
  created_at timestamptz default now()
);

-- ============================================================
-- TABLA: app_errors (errores del sistema para superadmin)
-- ============================================================
create table public.app_errors (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references public.profiles(id),
  error_type text,
  message text,
  stack text,
  url text,
  metadata jsonb,
  created_at timestamptz default now()
);

-- ============================================================
-- ÍNDICES
-- ============================================================
create index idx_patients_doctor on public.patients(doctor_id);
create index idx_patients_dni on public.patients(dni);
create index idx_consultations_patient on public.consultations(patient_id);
create index idx_consultations_doctor on public.consultations(doctor_id);
create index idx_consultations_date on public.consultations(consultation_date);
create index idx_consultations_institution on public.consultations(institution_id);
create index idx_consultations_billing_status on public.consultations(billing_status);
create index idx_attachments_consultation on public.attachments(consultation_id);
