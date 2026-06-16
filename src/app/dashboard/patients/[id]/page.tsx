'use client'

import { useState, useEffect, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { differenceInYears, format, parseISO } from 'date-fns'
import { Modal } from '@/components/ui/Modal'
import { ConsultationForm } from '@/components/consultations/ConsultationForm'
import { uploadMedicalFile, saveAttachmentRecord, getSignedUrl } from '@/lib/storage'
import type { Patient, Consultation, ConsultationFormData, Attachment } from '@/types'

export default function PatientDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const supabase = createClient()

  const [patient, setPatient] = useState<Patient | null>(null)
  const [consultations, setConsultations] = useState<Consultation[]>([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [pendingFile, setPendingFile] = useState<File | null>(null)
  const [selectedConsultation, setSelectedConsultation] = useState<Consultation | null>(null)
  const [attachments, setAttachments] = useState<Attachment[]>([])
  const [attachmentsLoading, setAttachmentsLoading] = useState(false)

  const fetchData = useCallback(async () => {
    setLoading(true)
    const { data: patientData } = await supabase.from('patients').select('*').eq('id', id).single()
    const { data: consultationsData } = await supabase
      .from('consultations')
      .select('*, institution:institutions(name, type)')
      .eq('patient_id', id)
      .order('consultation_date', { ascending: false })

    setPatient(patientData || null)
    setConsultations(consultationsData || [])
    setLoading(false)
  }, [id])

  useEffect(() => { fetchData() }, [fetchData])

  const handleCreateConsultation = async (data: ConsultationFormData) => {
    setSaving(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setSaving(false); return }

    const { data: created, error } = await supabase.from('consultations').insert({
      patient_id: id,
      doctor_id: user.id,
      institution_id: data.institution_id,
      consultation_date: data.consultation_date,
      reason: data.reason,
      symptoms: data.symptoms || null,
      physical_exam: data.physical_exam || null,
      diagnosis: data.diagnosis || null,
      treatment: data.treatment || null,
      prescriptions: data.prescriptions || null,
      follow_up: data.follow_up || null,
      notes: data.notes || null,
      billing_code: data.billing_code || null,
      billing_description: data.billing_description || null,
      billing_amount: data.billing_amount ? Number(data.billing_amount) : null,
    }).select().single()

    if (!error && created && pendingFile) {
      const result = await uploadMedicalFile(pendingFile, user.id, id, created.id)
      if (result) {
        await saveAttachmentRecord({
          consultationId: created.id,
          doctorId: user.id,
          patientId: id,
          file: pendingFile,
          storagePath: result.path,
        })
      }
    }

    setSaving(false)
    setPendingFile(null)
    if (!error) {
      setModalOpen(false)
      fetchData()
    }
  }

  const openConsultation = async (c: Consultation) => {
    setSelectedConsultation(c)
    setAttachmentsLoading(true)
    const { data } = await supabase.from('attachments').select('*').eq('consultation_id', c.id)
    setAttachments(data || [])
    setAttachmentsLoading(false)
  }

  const handleViewAttachment = async (storagePath: string) => {
    const url = await getSignedUrl(storagePath)
    if (url) window.open(url, '_blank')
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="w-6 h-6 border-2 border-teal-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (!patient) {
    return <p className="text-slate-500">Paciente no encontrado.</p>
  }

  return (
    <div className="max-w-4xl mx-auto">
      <button
        onClick={() => router.push('/dashboard')}
        className="text-sm text-slate-500 hover:text-slate-900 mb-4 inline-flex items-center gap-1"
      >
        ← Volver a pacientes
      </button>

      <div className="bg-white rounded-xl border border-slate-200 p-6 mb-6">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-teal-100 text-teal-700 flex items-center justify-center font-semibold">
              {patient.first_name[0]}{patient.last_name[0]}
            </div>
            <div>
              <h1 className="text-xl font-semibold text-slate-900">{patient.last_name}, {patient.first_name}</h1>
              <p className="text-sm text-slate-500">
                DNI {patient.dni || '—'}
                {patient.birth_date && ` · ${differenceInYears(new Date(), parseISO(patient.birth_date))} años`}
                {patient.insurance_name && ` · ${patient.insurance_name}`}
              </p>
            </div>
          </div>
          <button
            onClick={() => setModalOpen(true)}
            className="px-4 py-2 bg-teal-600 text-white text-sm font-medium rounded-lg hover:bg-teal-700 transition-colors whitespace-nowrap"
          >
            + Nueva consulta
          </button>
        </div>

        {(patient.allergies || patient.chronic_conditions || patient.medications) && (
          <div className="mt-5 pt-5 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
            {patient.allergies && (
              <div>
                <p className="text-xs font-medium text-slate-400 uppercase mb-1">Alergias</p>
                <p className="text-slate-700">{patient.allergies}</p>
              </div>
            )}
            {patient.chronic_conditions && (
              <div>
                <p className="text-xs font-medium text-slate-400 uppercase mb-1">Enfermedades crónicas</p>
                <p className="text-slate-700">{patient.chronic_conditions}</p>
              </div>
            )}
            {patient.medications && (
              <div>
                <p className="text-xs font-medium text-slate-400 uppercase mb-1">Medicación habitual</p>
                <p className="text-slate-700">{patient.medications}</p>
              </div>
            )}
          </div>
        )}
      </div>

      <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-3">
        Historial de consultas ({consultations.length})
      </h2>

      {consultations.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 text-center py-12 text-slate-400">
          <p className="text-sm">Todavía no hay consultas registradas</p>
        </div>
      ) : (
        <div className="space-y-3">
          {consultations.map(c => (
            <div
              key={c.id}
              onClick={() => openConsultation(c)}
              className="bg-white rounded-xl border border-slate-200 p-5 cursor-pointer hover:border-teal-300 hover:shadow-sm transition-all"
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="font-medium text-slate-900">{c.reason}</p>
                  <p className="text-xs text-slate-400 mt-0.5">
                    {format(new Date(c.consultation_date), 'd MMM yyyy, HH:mm')}
                    {c.institution?.name && ` · ${c.institution.name}`}
                  </p>
                </div>
                {c.billing_amount != null && (
                  <span className="text-sm font-medium text-slate-700 whitespace-nowrap">
                    ${c.billing_amount.toLocaleString('es-AR')}
                  </span>
                )}
              </div>
              {c.diagnosis && <p className="text-sm text-slate-600 mt-3"><span className="text-slate-400">Diagnóstico: </span>{c.diagnosis}</p>}
              {c.treatment && <p className="text-sm text-slate-600 mt-1"><span className="text-slate-400">Tratamiento: </span>{c.treatment}</p>}
            </div>
          ))}
        </div>
      )}

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Nueva consulta"
        maxWidth="max-w-2xl"
      >
        <ConsultationForm
          patientId={id}
          patientName={`${patient.first_name} ${patient.last_name}`}
          onSubmit={handleCreateConsultation}
          onCancel={() => setModalOpen(false)}
          isLoading={saving}
          onUploadFile={async (file) => setPendingFile(file)}
        />
      </Modal>

      <Modal
        open={!!selectedConsultation}
        onClose={() => setSelectedConsultation(null)}
        title={selectedConsultation?.reason || 'Consulta'}
        subtitle={selectedConsultation ? format(new Date(selectedConsultation.consultation_date), 'd MMM yyyy, HH:mm') : undefined}
        maxWidth="max-w-2xl"
      >
        {selectedConsultation && (
          <div className="space-y-5">
            {selectedConsultation.institution?.name && (
              <DetailField label="Institución" value={selectedConsultation.institution.name} />
            )}
            <DetailField label="Síntomas" value={selectedConsultation.symptoms} />
            <DetailField label="Examen físico" value={selectedConsultation.physical_exam} />
            <DetailField label="Diagnóstico" value={selectedConsultation.diagnosis} />
            <DetailField label="Tratamiento" value={selectedConsultation.treatment} />
            <DetailField label="Prescripciones" value={selectedConsultation.prescriptions} />
            <DetailField label="Seguimiento" value={selectedConsultation.follow_up} />
            <DetailField label="Notas" value={selectedConsultation.notes} />

            {(selectedConsultation.billing_code || selectedConsultation.billing_amount != null) && (
              <div className="pt-4 border-t border-slate-100 grid grid-cols-3 gap-4">
                <DetailField label="Código" value={selectedConsultation.billing_code} />
                <DetailField label="Descripción" value={selectedConsultation.billing_description} />
                <DetailField
                  label="Monto"
                  value={selectedConsultation.billing_amount != null ? `$${selectedConsultation.billing_amount.toLocaleString('es-AR')}` : null}
                />
              </div>
            )}

            <div className="pt-4 border-t border-slate-100">
              <p className="text-xs font-medium text-slate-400 uppercase mb-2">Adjuntos</p>
              {attachmentsLoading ? (
                <div className="w-4 h-4 border-2 border-teal-500 border-t-transparent rounded-full animate-spin" />
              ) : attachments.length === 0 ? (
                <p className="text-sm text-slate-400">Sin archivos adjuntos</p>
              ) : (
                <div className="space-y-2">
                  {attachments.map(a => (
                    <button
                      key={a.id}
                      onClick={() => handleViewAttachment(a.storage_path)}
                      className="flex items-center gap-2 text-sm text-teal-700 hover:underline"
                    >
                      📎 {a.file_name}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}

function DetailField({ label, value }: { label: string; value?: string | null }) {
  if (!value) return null
  return (
    <div>
      <p className="text-xs font-medium text-slate-400 uppercase mb-1">{label}</p>
      <p className="text-sm text-slate-700 whitespace-pre-wrap">{value}</p>
    </div>
  )
}
