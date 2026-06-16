-- ============================================================
-- Fix: permitir borrar pacientes que ya tienen adjuntos cargados
-- Ejecutar en Supabase SQL Editor
-- ============================================================

alter table public.attachments
  drop constraint attachments_patient_id_fkey;

alter table public.attachments
  add constraint attachments_patient_id_fkey
  foreign key (patient_id) references public.patients(id) on delete cascade;
