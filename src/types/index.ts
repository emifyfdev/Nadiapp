// ============================================================
// TIPOS TYPESCRIPT — Historia Clínica Digital
// ============================================================

export type UserRole = 'pending' | 'approved' | 'rejected' | 'superadmin'

export interface Profile {
  id: string
  email: string
  full_name: string | null
  avatar_url: string | null
  role: UserRole
  specialty: string | null
  license_number: string | null
  phone: string | null
  created_at: string
  updated_at: string
  approved_at: string | null
  approved_by: string | null
  last_seen_at: string | null
}

export type InstitutionType = 'hospital' | 'clinica' | 'consultorio' | 'sanatorio' | 'otro'

export interface Institution {
  id: string
  name: string
  type: InstitutionType | null
  address: string | null
  is_default: boolean
  created_by: string | null
  created_at: string
}

export type Gender = 'masculino' | 'femenino' | 'otro' | 'no_especifica'

export interface Patient {
  id: string
  doctor_id: string
  first_name: string
  last_name: string
  dni: string | null
  birth_date: string | null
  gender: Gender | null
  email: string | null
  phone: string | null
  address: string | null
  insurance_name: string | null
  insurance_number: string | null
  insurance_plan: string | null
  allergies: string | null
  chronic_conditions: string | null
  previous_symptoms: string | null
  medications: string | null
  notes: string | null
  is_active: boolean
  created_at: string
  updated_at: string
}

export type BillingStatus = 'pendiente' | 'auditado' | 'facturado' | 'cobrado'

export interface Consultation {
  id: string
  patient_id: string
  doctor_id: string
  institution_id: string | null
  consultation_date: string
  reason: string
  symptoms: string | null
  physical_exam: string | null
  diagnosis: string | null
  treatment: string | null
  prescriptions: string | null
  follow_up: string | null
  notes: string | null
  billing_code: string | null
  billing_description: string | null
  billing_amount: number | null
  billing_status: BillingStatus
  has_attachments: boolean
  created_at: string
  updated_at: string
  // joins opcionales
  institution?: Institution
  patient?: Patient
}

export interface Attachment {
  id: string
  consultation_id: string
  doctor_id: string
  patient_id: string
  file_name: string
  file_type: string | null
  storage_path: string
  file_size_kb: number | null
  description: string | null
  uploaded_at: string
}

// ============================================================
// TIPOS PARA ADMIN DASHBOARD
// ============================================================

export interface AdminDoctorSummary {
  id: string
  email: string
  full_name: string | null
  role: UserRole
  specialty: string | null
  license_number: string | null
  created_at: string
  approved_at: string | null
  last_seen_at: string | null
  total_patients: number
  total_consultations: number
  consultations_this_month: number
  consultations_last_7_days: number
  last_consultation_at: string | null
  pending_billing_month: number
}

export interface AdminSystemMetrics {
  users_pending: number
  users_approved: number
  users_rejected: number
  users_active_30d: number
  users_active_7d: number
  users_new_this_month: number
}

export interface AdminActivityDaily {
  day: string
  consultations_count: number
  active_doctors: number
  billing_total: number
}

export interface AdminBillingByInstitution {
  institution_name: string
  institution_type: InstitutionType
  consultation_count: number
  doctor_count: number
  total_amount: number
  pending_amount: number
  billed_amount: number
}

export interface AdminRecentError {
  id: string
  error_type: string | null
  message: string | null
  url: string | null
  created_at: string
  user_email: string | null
  user_name: string | null
}

// ============================================================
// TIPOS PARA FORMULARIOS
// ============================================================

export interface PatientFormData {
  first_name: string
  last_name: string
  dni: string
  birth_date: string
  gender: Gender
  email: string
  phone: string
  address: string
  insurance_name: string
  insurance_number: string
  insurance_plan: string
  allergies: string
  chronic_conditions: string
  previous_symptoms: string
  medications: string
  notes: string
}

export interface ConsultationFormData {
  patient_id: string
  institution_id: string
  consultation_date: string
  reason: string
  symptoms: string
  physical_exam: string
  diagnosis: string
  treatment: string
  prescriptions: string
  follow_up: string
  notes: string
  billing_code: string
  billing_description: string
  billing_amount: string
}

// ============================================================
// TIPOS PARA AUDITORÍA / FACTURACIÓN
// ============================================================

export interface BillingAuditFilter {
  month: number
  year: number
  institution_id?: string
  billing_status?: BillingStatus
  doctor_id?: string
}

export interface BillingAuditRow {
  consultation_id: string
  consultation_date: string
  patient_name: string
  institution_name: string
  billing_code: string | null
  billing_description: string | null
  billing_amount: number | null
  billing_status: BillingStatus
}

export interface BillingAuditSummary {
  institution_name: string
  institution_id: string
  total_consultations: number
  total_amount: number
  by_status: Record<BillingStatus, number>
}
