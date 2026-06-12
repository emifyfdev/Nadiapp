-- ============================================================
-- VISTAS PARA SUPERADMIN DASHBOARD
-- Solo métricas agregadas — nunca datos de pacientes
-- ============================================================

-- Vista: resumen de médicos con métricas
create or replace view public.admin_doctors_summary as
select
  p.id,
  p.email,
  p.full_name,
  p.role,
  p.specialty,
  p.license_number,
  p.created_at,
  p.approved_at,
  p.last_seen_at,
  -- Métricas agregadas (sin exponer datos de pacientes)
  count(distinct pat.id) as total_patients,
  count(distinct c.id) as total_consultations,
  count(distinct c.id) filter (
    where c.created_at >= date_trunc('month', now())
  ) as consultations_this_month,
  count(distinct c.id) filter (
    where c.created_at >= now() - interval '7 days'
  ) as consultations_last_7_days,
  max(c.created_at) as last_consultation_at,
  -- Facturación (montos, no historias)
  coalesce(sum(c.billing_amount) filter (
    where c.billing_status = 'pendiente'
    and date_trunc('month', c.consultation_date) = date_trunc('month', now())
  ), 0) as pending_billing_month
from public.profiles p
left join public.patients pat on pat.doctor_id = p.id
left join public.consultations c on c.doctor_id = p.id
where p.role != 'superadmin'
group by p.id;

-- Acceso solo para superadmin
create policy "admin_doctors_summary: solo superadmin" on public.profiles
  for select using (public.get_my_role() = 'superadmin');

-- Vista: métricas globales del sistema
create or replace view public.admin_system_metrics as
select
  -- Usuarios
  count(*) filter (where role = 'pending') as users_pending,
  count(*) filter (where role = 'approved') as users_approved,
  count(*) filter (where role = 'rejected') as users_rejected,
  count(*) filter (where role = 'approved' and last_seen_at >= now() - interval '30 days') as users_active_30d,
  count(*) filter (where role = 'approved' and last_seen_at >= now() - interval '7 days') as users_active_7d,
  count(*) filter (where created_at >= date_trunc('month', now())) as users_new_this_month
from public.profiles
where role != 'superadmin';

-- Vista: actividad por día (últimos 30 días) — para gráficos
create or replace view public.admin_activity_daily as
select
  date_trunc('day', c.created_at)::date as day,
  count(*) as consultations_count,
  count(distinct c.doctor_id) as active_doctors,
  coalesce(sum(c.billing_amount), 0) as billing_total
from public.consultations c
where c.created_at >= now() - interval '30 days'
group by 1
order by 1;

-- Vista: errores recientes para superadmin
create or replace view public.admin_recent_errors as
select
  e.id,
  e.error_type,
  e.message,
  e.url,
  e.created_at,
  p.email as user_email,
  p.full_name as user_name
from public.app_errors e
left join public.profiles p on p.id = e.user_id
order by e.created_at desc
limit 100;

-- Vista: consultas por institución este mes (para billing overview)
create or replace view public.admin_billing_by_institution as
select
  i.name as institution_name,
  i.type as institution_type,
  count(c.id) as consultation_count,
  count(distinct c.doctor_id) as doctor_count,
  coalesce(sum(c.billing_amount), 0) as total_amount,
  coalesce(sum(c.billing_amount) filter (where c.billing_status = 'pendiente'), 0) as pending_amount,
  coalesce(sum(c.billing_amount) filter (where c.billing_status = 'facturado'), 0) as billed_amount
from public.institutions i
left join public.consultations c on c.institution_id = i.id
  and date_trunc('month', c.consultation_date) = date_trunc('month', now())
group by i.id, i.name, i.type
order by total_amount desc;
