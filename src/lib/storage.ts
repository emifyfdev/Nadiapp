// src/lib/storage.ts
// Helpers para subir/bajar archivos médicos en Supabase Storage

import { createClient } from './supabase/client'

const BUCKET = 'medical-files'
const MAX_FILE_SIZE_MB = 10

export type UploadResult = {
  path: string
  url: string
} | null

export async function uploadMedicalFile(
  file: File,
  doctorId: string,
  patientId: string,
  consultationId: string
): Promise<UploadResult> {
  // Validar tamaño
  if (file.size > MAX_FILE_SIZE_MB * 1024 * 1024) {
    throw new Error(`El archivo no puede superar ${MAX_FILE_SIZE_MB}MB`)
  }

  // Validar tipo
  const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/heic', 'image/webp']
  if (!allowedTypes.includes(file.type)) {
    throw new Error('Tipo de archivo no permitido. Usá PDF o imagen.')
  }

  const supabase = createClient()
  const timestamp = Date.now()
  const ext = file.name.split('.').pop()
  // Estructura: doctorId/patientId/consultationId/timestamp.ext
  // RLS en storage usa el primer segmento (doctorId) para aislar por médico
  const path = `${doctorId}/${patientId}/${consultationId}/${timestamp}.${ext}`

  const { error, data } = await supabase.storage
    .from(BUCKET)
    .upload(path, file, {
      cacheControl: '3600',
      upsert: false,
    })

  if (error) throw error

  // URL firmada (válida 1 hora) — no URLs públicas para archivos médicos
  const { data: signedUrl } = await supabase.storage
    .from(BUCKET)
    .createSignedUrl(path, 3600)

  return {
    path,
    url: signedUrl?.signedUrl || '',
  }
}

export async function getSignedUrl(storagePath: string): Promise<string | null> {
  const supabase = createClient()
  const { data } = await supabase.storage
    .from(BUCKET)
    .createSignedUrl(storagePath, 3600)
  return data?.signedUrl || null
}

export async function deleteFile(storagePath: string): Promise<void> {
  const supabase = createClient()
  const { error } = await supabase.storage.from(BUCKET).remove([storagePath])
  if (error) throw error
}

// Registrar adjunto en la base de datos
export async function saveAttachmentRecord(params: {
  consultationId: string
  doctorId: string
  patientId: string
  file: File
  storagePath: string
}) {
  const supabase = createClient()
  const { error } = await supabase.from('attachments').insert({
    consultation_id: params.consultationId,
    doctor_id: params.doctorId,
    patient_id: params.patientId,
    file_name: params.file.name,
    file_type: params.file.type.includes('pdf') ? 'pdf' : 'image',
    storage_path: params.storagePath,
    file_size_kb: Math.round(params.file.size / 1024),
  })

  if (error) throw error

  // Marcar la consulta como que tiene adjuntos
  await supabase.from('consultations')
    .update({ has_attachments: true })
    .eq('id', params.consultationId)
}
