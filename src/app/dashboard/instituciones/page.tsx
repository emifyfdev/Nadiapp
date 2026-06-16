'use client'

import { useState, useEffect, useCallback } from 'react'
import { useForm } from 'react-hook-form'
import { createClient } from '@/lib/supabase/client'
import { format, startOfMonth, endOfMonth } from 'date-fns'
import { es } from 'date-fns/locale'
import { Modal } from '@/components/ui/Modal'
import type { Institution, InstitutionType } from '@/types'

interface InstitutionFormValues {
  name: string
  type: InstitutionType
  address: string
}

interface InstitutionCard extends Institution {
  consultationsThisMonth: number
  billingThisMonth: number
}

const TYPE_LABELS: Record<InstitutionType, string> = {
  hospital: 'Hospital',
  clinica: 'Clínica',
  consultorio: 'Consultorio',
  sanatorio: 'Sanatorio',
  otro: 'Otro',
}

const DOT_COLORS = ['bg-teal-500', 'bg-blue-500', 'bg-purple-500', 'bg-amber-500', 'bg-pink-500', 'bg-cyan-500']

export default function InstitucionesPage() {
  const supabase = createClient()
  const now = new Date()
  const [institutions, setInstitutions] = useState<InstitutionCard[]>([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [saving, setSaving] = useState(false)

  const { register, handleSubmit, reset, formState: { errors } } = useForm<InstitutionFormValues>()

  const fetchData = useCallback(async () => {
    setLoading(true)
    const dateFrom = startOfMonth(now)
    const dateTo = endOfMonth(now)

    const { data: institutionsData } = await supabase.from('institutions').select('*').order('name')
    const { data: consultationsData } = await supabase
      .from('consultations')
      .select('institution_id, billing_amount')
      .gte('consultation_date', dateFrom.toISOString())
      .lte('consultation_date', dateTo.toISOString())

    const stats: Record<string, { count: number; total: number }> = {}
    ;(consultationsData || []).forEach(c => {
      if (!c.institution_id) return
      if (!stats[c.institution_id]) stats[c.institution_id] = { count: 0, total: 0 }
      stats[c.institution_id].count += 1
      stats[c.institution_id].total += c.billing_amount || 0
    })

    const cards: InstitutionCard[] = (institutionsData || []).map(i => ({
      ...i,
      consultationsThisMonth: stats[i.id]?.count || 0,
      billingThisMonth: stats[i.id]?.total || 0,
    }))

    setInstitutions(cards)
    setLoading(false)
  }, [])

  useEffect(() => { fetchData() }, [fetchData])

  const onSubmit = async (values: InstitutionFormValues) => {
    setSaving(true)
    const { data: { user } } = await supabase.auth.getUser()
    const { error } = await supabase.from('institutions').insert({
      name: values.name,
      type: values.type || null,
      address: values.address || null,
      created_by: user?.id,
    })
    setSaving(false)
    if (!error) {
      setModalOpen(false)
      reset()
      fetchData()
    }
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Instituciones</h1>
          <p className="text-slate-500 text-sm mt-1">
            Lugares precargados donde se atiende a los pacientes · {format(now, 'MMMM yyyy', { locale: es })}
          </p>
        </div>
        <button
          onClick={() => setModalOpen(true)}
          className="px-4 py-2 bg-teal-600 text-white text-sm font-medium rounded-lg hover:bg-teal-700 transition-colors whitespace-nowrap"
        >
          + Nueva institución
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <div className="w-6 h-6 border-2 border-teal-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : institutions.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 text-center py-16 text-slate-400">
          <p className="text-sm">No hay instituciones registradas</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {institutions.map((i, idx) => (
            <div key={i.id} className="bg-white rounded-xl border border-slate-200 p-5">
              <div className="flex items-center gap-2 mb-2">
                <span className={`w-2 h-2 rounded-full ${DOT_COLORS[idx % DOT_COLORS.length]}`} />
                <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">
                  {i.type ? TYPE_LABELS[i.type] : 'Sin tipo'}
                </span>
              </div>
              <h3 className="font-semibold text-slate-900 mb-4">{i.name}</h3>
              <div className="border-t border-slate-100 pt-4 grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-slate-400 mb-1">Consultas (mes)</p>
                  <p className="font-semibold text-slate-900">{i.consultationsThisMonth}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-400 mb-1">A facturar</p>
                  <p className="font-semibold text-slate-900">
                    ${i.billingThisMonth.toLocaleString('es-AR')}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Nueva institución">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Nombre</label>
            <input {...register('name', { required: true })}
              className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
              placeholder="Hospital Británico" />
            {errors.name && <p className="text-xs text-red-600 mt-1">Requerido</p>}
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Tipo</label>
            <select {...register('type')}
              className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-teal-500">
              <option value="">Seleccionar...</option>
              {Object.entries(TYPE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Dirección</label>
            <input {...register('address')}
              className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
              placeholder="Av. Corrientes 1234, CABA" />
          </div>
          <div className="flex justify-end gap-3 pt-4 border-t border-slate-200">
            <button type="button" onClick={() => setModalOpen(false)}
              className="px-4 py-2 text-sm text-slate-600 hover:text-slate-900 transition-colors">
              Cancelar
            </button>
            <button type="submit" disabled={saving}
              className="px-6 py-2 bg-teal-600 text-white text-sm font-medium rounded-lg hover:bg-teal-700 transition-colors disabled:opacity-50 flex items-center gap-2">
              {saving && <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />}
              Crear institución
            </button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
