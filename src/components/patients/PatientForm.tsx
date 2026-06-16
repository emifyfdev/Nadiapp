'use client'
// src/components/patients/PatientForm.tsx

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import type { Patient, PatientFormData } from '@/types'

const schema = z.object({
  first_name: z.string().min(1, 'Requerido'),
  last_name: z.string().min(1, 'Requerido'),
  dni: z.string().optional(),
  birth_date: z.string().optional(),
  gender: z.enum(['masculino', 'femenino', 'otro', 'no_especifica']).optional(),
  email: z.string().email('Email inválido').optional().or(z.literal('')),
  phone: z.string().optional(),
  address: z.string().optional(),
  insurance_name: z.string().optional(),
  insurance_number: z.string().optional(),
  insurance_plan: z.string().optional(),
  allergies: z.string().optional(),
  chronic_conditions: z.string().optional(),
  previous_symptoms: z.string().optional(),
  medications: z.string().optional(),
  notes: z.string().optional(),
})

interface Props {
  defaultValues?: Partial<PatientFormData>
  onSubmit: (data: PatientFormData) => Promise<void>
  onCancel?: () => void
  isLoading?: boolean
  mode?: 'create' | 'edit'
}

function Field({ label, error, children, required }: {
  label: string
  error?: string
  children: React.ReactNode
  required?: boolean
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-slate-700 mb-1">
        {label}{required && <span className="text-red-500 ml-1">*</span>}
      </label>
      {children}
      {error && <p className="text-xs text-red-600 mt-1">{error}</p>}
    </div>
  )
}

const inputClass = "w-full px-3 py-2 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
const selectClass = "w-full px-3 py-2 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
const textareaClass = "w-full px-3 py-2 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"

export function PatientForm({ defaultValues, onSubmit, onCancel, isLoading, mode = 'create' }: Props) {
  const { register, handleSubmit, formState: { errors } } = useForm<PatientFormData>({
    resolver: zodResolver(schema),
    defaultValues,
  })

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">

      {/* Datos personales */}
      <section>
        <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-4">
          Datos personales
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Nombre" error={errors.first_name?.message} required>
            <input {...register('first_name')} className={inputClass} placeholder="Juan" />
          </Field>
          <Field label="Apellido" error={errors.last_name?.message} required>
            <input {...register('last_name')} className={inputClass} placeholder="García" />
          </Field>
          <Field label="DNI" error={errors.dni?.message}>
            <input {...register('dni')} className={inputClass} placeholder="12345678" />
          </Field>
          <Field label="Fecha de nacimiento" error={errors.birth_date?.message}>
            <input type="date" {...register('birth_date')} className={inputClass} />
          </Field>
          <Field label="Género" error={errors.gender?.message}>
            <select {...register('gender')} className={selectClass}>
              <option value="">Seleccionar...</option>
              <option value="masculino">Masculino</option>
              <option value="femenino">Femenino</option>
              <option value="otro">Otro</option>
              <option value="no_especifica">Prefiere no especificar</option>
            </select>
          </Field>
          <Field label="Teléfono" error={errors.phone?.message}>
            <input {...register('phone')} className={inputClass} placeholder="+54 11 1234-5678" />
          </Field>
          <Field label="Email" error={errors.email?.message}>
            <input type="email" {...register('email')} className={inputClass} placeholder="paciente@email.com" />
          </Field>
          <Field label="Dirección" error={errors.address?.message}>
            <input {...register('address')} className={inputClass} placeholder="Av. Corrientes 1234, CABA" />
          </Field>
        </div>
      </section>

      {/* Obra social */}
      <section>
        <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-4">
          Cobertura médica
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Field label="Obra social / Prepaga" error={errors.insurance_name?.message}>
            <input {...register('insurance_name')} className={inputClass} placeholder="OSDE, Swiss Medical..." />
          </Field>
          <Field label="Número de afiliado" error={errors.insurance_number?.message}>
            <input {...register('insurance_number')} className={inputClass} placeholder="12345678" />
          </Field>
          <Field label="Plan" error={errors.insurance_plan?.message}>
            <input {...register('insurance_plan')} className={inputClass} placeholder="210, 410, Gold..." />
          </Field>
        </div>
      </section>

      {/* Antecedentes */}
      <section>
        <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-4">
          Antecedentes clínicos
        </h3>
        <div className="grid grid-cols-1 gap-4">
          <Field label="Alergias conocidas" error={errors.allergies?.message}>
            <textarea {...register('allergies')} rows={2} className={textareaClass}
              placeholder="Penicilina, aspirina, látex..." />
          </Field>
          <Field label="Enfermedades crónicas" error={errors.chronic_conditions?.message}>
            <textarea {...register('chronic_conditions')} rows={2} className={textareaClass}
              placeholder="Hipertensión, diabetes tipo 2..." />
          </Field>
          <Field label="Síntomas previos relevantes" error={errors.previous_symptoms?.message}>
            <textarea {...register('previous_symptoms')} rows={2} className={textareaClass}
              placeholder="Episodios anteriores, intervenciones quirúrgicas..." />
          </Field>
          <Field label="Medicación habitual" error={errors.medications?.message}>
            <textarea {...register('medications')} rows={2} className={textareaClass}
              placeholder="Enalapril 10mg/día, Metformina 500mg..." />
          </Field>
          <Field label="Notas adicionales" error={errors.notes?.message}>
            <textarea {...register('notes')} rows={3} className={textareaClass}
              placeholder="Información adicional relevante sobre el paciente..." />
          </Field>
        </div>
      </section>

      {/* Submit */}
      <div className="flex justify-end gap-3 pt-4 border-t border-slate-200">
        <button type="button" onClick={onCancel} className="px-4 py-2 text-sm text-slate-600 hover:text-slate-900 transition-colors">
          Cancelar
        </button>
        <button
          type="submit"
          disabled={isLoading}
          className="px-6 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
        >
          {isLoading && <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />}
          {mode === 'create' ? 'Guardar paciente' : 'Actualizar paciente'}
        </button>
      </div>
    </form>
  )
}
