-- ============================================================
-- ROW LEVEL SECURITY — Historia Clínica Digital
-- ============================================================

-- Habilitar RLS en todas las tablas
alter table public.profiles enable row level security;
alter table public.institutions enable row level security;
alter table public.patients enable row level security;
alter table public.consultations enable row level security;
alter table public.attachments enable row level security;
alter table public.audit_log enable row level security;
alter table public.app_errors enable row level security;

-- ============================================================
-- HELPER: función para obtener el rol del usuario actual
-- ============================================================
create or replace function public.get_my_role()
returns text
language sql
security definer
stable
as $$
  select role from public.profiles where id = auth.uid();
$$;

-- ============================================================
-- PROFILES
-- ============================================================
-- Cada usuario ve y edita solo su propio perfil
create policy "profiles: ver el propio" on public.profiles
  for select using (id = auth.uid());

create policy "profiles: editar el propio" on public.profiles
  for update using (id = auth.uid());

-- Superadmin ve todos los perfiles (para dashboard y aprobaciones)
create policy "profiles: superadmin ve todos" on public.profiles
  for select using (public.get_my_role() = 'superadmin');

create policy "profiles: superadmin edita todos" on public.profiles
  for update using (public.get_my_role() = 'superadmin');

-- Al registrarse, el trigger crea el perfil automáticamente
create policy "profiles: insertar propio al registrarse" on public.profiles
  for insert with check (id = auth.uid());

-- ============================================================
-- INSTITUTIONS
-- ============================================================
-- Todos los usuarios aprobados pueden ver instituciones
create policy "institutions: ver si aprobado" on public.institutions
  for select using (public.get_my_role() in ('approved', 'superadmin'));

-- Solo superadmin crea/edita instituciones default
create policy "institutions: superadmin gestiona" on public.institutions
  for all using (public.get_my_role() = 'superadmin');

-- Médico aprobado puede crear sus propias instituciones
create policy "institutions: médico crea propias" on public.institutions
  for insert with check (
    public.get_my_role() = 'approved'
    and created_by = auth.uid()
  );

-- ============================================================
-- PATIENTS — aislamiento total por médico
-- ============================================================
create policy "patients: solo el médico dueño" on public.patients
  for all using (doctor_id = auth.uid());

-- Superadmin NO puede ver pacientes (privacidad clínica)
-- (el select de superadmin no está habilitado aquí intencionalmente)

-- ============================================================
-- CONSULTATIONS — aislamiento total por médico
-- ============================================================
create policy "consultations: solo el médico dueño" on public.consultations
  for all using (doctor_id = auth.uid());

-- ============================================================
-- ATTACHMENTS — aislamiento total por médico
-- ============================================================
create policy "attachments: solo el médico dueño" on public.attachments
  for all using (doctor_id = auth.uid());

-- ============================================================
-- AUDIT LOG — solo superadmin
-- ============================================================
create policy "audit_log: solo superadmin" on public.audit_log
  for select using (public.get_my_role() = 'superadmin');

create policy "audit_log: insertar sistema" on public.audit_log
  for insert with check (true); -- controlado desde funciones server-side

-- ============================================================
-- APP ERRORS — solo superadmin lee, cualquier usuario inserta
-- ============================================================
create policy "app_errors: superadmin lee" on public.app_errors
  for select using (public.get_my_role() = 'superadmin');

create policy "app_errors: cualquiera reporta" on public.app_errors
  for insert with check (true);

-- ============================================================
-- TRIGGER: crear perfil automáticamente al registrarse con Google
-- ============================================================
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name, avatar_url, role)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name'),
    new.raw_user_meta_data->>'avatar_url',
    'pending'    -- todos empiezan como pendientes hasta que el superadmin aprueba
  );
  return new;
end;
$$;

create or replace trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ============================================================
-- TRIGGER: updated_at automático
-- ============================================================
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger set_updated_at_profiles
  before update on public.profiles
  for each row execute procedure public.set_updated_at();

create trigger set_updated_at_patients
  before update on public.patients
  for each row execute procedure public.set_updated_at();

create trigger set_updated_at_consultations
  before update on public.consultations
  for each row execute procedure public.set_updated_at();

-- ============================================================
-- SEED: instituciones por default
-- ============================================================
insert into public.institutions (name, type, is_default) values
  ('Hospital El Cruce', 'hospital', true),
  ('Fundación Favaloro', 'hospital', true),
  ('Hospital Británico', 'hospital', true),
  ('Hospital CEMIC', 'hospital', true),
  ('Hospital Blas Dubarry', 'hospital', true);

-- ============================================================
-- STORAGE: bucket para adjuntos médicos
-- Ejecutar en Supabase Dashboard > Storage > New Bucket
-- O via SQL:
-- ============================================================
-- insert into storage.buckets (id, name, public) values ('medical-files', 'medical-files', false);
-- 
-- Política storage: solo el dueño puede subir/ver sus archivos
-- create policy "storage: solo dueño" on storage.objects
--   for all using (
--     bucket_id = 'medical-files'
--     and (storage.foldername(name))[1] = auth.uid()::text
--   );
