'use client'
// src/components/consultations/ConsultationForm.tsx

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Institution, ConsultationFormData } from '@/types'

const schema = z.object({
  institution_id: z.string().min(1, 'Seleccioná una institución'),
  consultation_date: z.string().min(1, 'Requerido'),
  reason: z.string().min(1, 'El motivo es requerido'),
  symptoms: z.string().optional(),
  physical_exam: z.string().optional(),
  diagnosis: z.string().optional(),
  treatment: z.string().optional(),
  prescriptions: z.string().optional(),
  follow_up: z.string().optional(),
  notes: z.string().optional(),
  billing_code: z.string().optional(),
  billing_description: z.string().optional(),
  billing_amount: z.string().optional(),
})

interface Props {
  patientId: string
  patientName: string
  defaultValues?: Partial<ConsultationFormData>
  onSubmit: (data: ConsultationFormData) => Promise<void>
  onCancel: () => void
  isLoading?: boolean
  onUploadFile?: (file: File) => Promise<void>
}

function Field({ label, error, children }: {
  label: string; error?: string; children: React.ReactNode
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-slate-700 mb-1">{label}</label>
      {children}
      {error && <p className="text-xs text-red-600 mt-1">{error}</p>}
    </div>
  )
}

const inputClass = "w-full px-3 py-2 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent"
const textareaClass = "w-full px-3 py-2 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 resize-none"

export function ConsultationForm({
  patientId, patientName, defaultValues, onSubmit, onCancel, isLoading, onUploadFile
}: Props) {
  const [institutions, setInstitutions] = useState<Institution[]>([])
  const [uploadingFile, setUploadingFile] = useState(false)

  const { register, handleSubmit, formState: { errors } } = useForm<ConsultationFormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      consultation_date: new Date().toISOString().slice(0, 16),
      patient_id: patientId,
      ...defaultValues,
    },
  })

  useEffect(() => {
    const supabase = createClient()
    supabase.from('institutions').select('*').order('name').then(({ data }) => {
      if (data) setInstitutions(data)
    })
  }, [])

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !onUploadFile) return
    setUploadingFile(true)
    await onUploadFile(file)
    setUploadingFile(false)
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">

      {/* Header info */}
      <div className="flex items-center gap-3 p-3 bg-blue-50 rounded-xl border border-blue-100">
        <div className="w-8 h-8 rounded-full bg-violet-600 flex items-center justify-center text-white text-xs font-semibold">
          {patientName.split(' ').map(n => n[0]).join('').slice(0, 2)}
        </div>
        <div>
          <p className="text-sm font-medium text-slate-900">{patientName}</p>
          <p className="text-xs text-slate-500">Nueva consulta</p>
        </div>
      </div>

      {/* Fecha e institución */}
      <section>
        <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-4">
          Dónde y cuándo
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Institución *" error={errors.institution_id?.message}>
            <select {...register('institution_id')}
              className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 bg-white">
              <option value="">Seleccionar institución...</option>
              {institutions.map(i => (
                <option key={i.id} value={i.id}>
                  {i.name} {i.type && `(${i.type})`}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Fecha y hora *" error={errors.consultation_date?.message}>
            <input type="datetime-local" {...register('consultation_date')} className={inputClass} />
          </Field>
        </div>
      </section>

      {/* Datos clínicos */}
      <section>
        <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-4">
          Datos clínicos
        </h3>
        <div className="space-y-4">
          <Field label="Motivo de consulta *" error={errors.reason?.message}>
            <input {...register('reason')} className={inputClass}
              placeholder="Dolor de cabeza, control de rutina, seguimiento..." />
          </Field>
          <Field label="Síntomas" error={errors.symptoms?.message}>
            <textarea {...register('symptoms')} rows={3} className={textareaClass}
              placeholder="Descripción de síntomas, evolución, tiempo de inicio..." />
          </Field>
          <Field label="Examen físico" error={errors.physical_exam?.message}>
            <textarea {...register('physical_exam')} rows={3} className={textareaClass}
              placeholder="TA: 120/80, FC: 72 lat/min, Peso: 70kg, Talla: 170cm..." />
          </Field>
          <Field label="Diagnóstico" error={errors.diagnosis?.message}>
            <textarea {...register('diagnosis')} rows={2} className={textareaClass}
              placeholder="CIE-10 o diagnóstico en texto libre..." />
          </Field>
          <Field label="Tratamiento indicado" error={errors.treatment?.message}>
            <textarea {...register('treatment')} rows={3} className={textareaClass}
              placeholder="Plan terapéutico, indicaciones, reposo..." />
          </Field>
          <Field label="Prescripciones" error={errors.prescriptions?.message}>
            <textarea {...register('prescriptions')} rows={2} className={textareaClass}
              placeholder="Medicamentos, dosis, duración del tratamiento..." />
          </Field>
          <Field label="Seguimiento / próxima consulta" error={errors.follow_up?.message}>
            <textarea {...register('follow_up')} rows={2} className={textareaClass}
              placeholder="Controles a realizar, derivaciones, fecha próxima consulta..." />
          </Field>
          <Field label="Notas adicionales" error={errors.notes?.message}>
            <textarea {...register('notes')} rows={2} className={textareaClass}
              placeholder="Observaciones, comentarios, información adicional..." />
          </Field>
        </div>
      </section>

      {/* Facturación */}
      <section>
        <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-4">
          Facturación
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Field label="Código de prestación" error={errors.billing_code?.message}>
            <input {...register('billing_code')} className={inputClass} placeholder="010, 050..." />
          </Field>
          <Field label="Descripción" error={errors.billing_description?.message}>
            <input {...register('billing_description')} className={inputClass}
              placeholder="Consulta ambulatoria, ECG..." />
          </Field>
          <Field label="Arancel / Monto ($)" error={errors.billing_amount?.message}>
            <input type="number" step="0.01" {...register('billing_amount')} className={inputClass}
              placeholder="0.00" />
          </Field>
        </div>
      </section>

      {/* Adjuntos */}
      {onUploadFile && (
        <section>
          <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-4">
            Adjuntar archivo
          </h3>
          <label className="flex items-center justify-center gap-3 px-4 py-6 border-2 border-dashed border-slate-300 rounded-xl cursor-pointer hover:border-blue-400 hover:bg-blue-50 transition-colors">
            <input type="file" accept=".pdf,.jpg,.jpeg,.png,.heic" onChange={handleFileChange}
              className="hidden" />
            {uploadingFile ? (
              <div className="w-5 h-5 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
            ) : (
              <svg className="w-5 h-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                  d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
            )}
            <span className="text-sm text-slate-500">
              {uploadingFile ? 'Subiendo...' : 'PDF, imagen o estudio (máx. 10MB)'}
            </span>
          </label>
        </section>
      )}

      {/* Submit */}
      <div className="flex justify-end gap-3 pt-4 border-t border-slate-200">
        <button type="button" onClick={onCancel}
          className="px-4 py-2 text-sm text-slate-600 hover:text-slate-900 transition-colors">
          Cancelar
        </button>
        <button type="submit" disabled={isLoading}
          className="px-6 py-2 bg-violet-600 text-white text-sm font-medium rounded-lg hover:bg-violet-700 transition-colors disabled:opacity-50 flex items-center gap-2">
          {isLoading && <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />}
          Guardar consulta
        </button>
      </div>
    </form>
  )
}
