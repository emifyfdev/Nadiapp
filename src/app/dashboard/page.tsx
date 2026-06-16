'use client'

import { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { differenceInYears, format, parseISO } from 'date-fns'
import { Modal } from '@/components/ui/Modal'
import { PatientForm } from '@/components/patients/PatientForm'
import type { Patient, PatientFormData } from '@/types'

interface PatientRow extends Patient {
  consultationCount: number
  lastConsultationAt: string | null
  totalBilled: number
}

export default function PatientsPage() {
  const supabase = createClient()
  const router = useRouter()

  const [patients, setPatients] = useState<PatientRow[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [saving, setSaving] = useState(false)

  const fetchData = async () => {
    setLoading(true)
    const { data: patientsData } = await supabase
      .from('patients')
      .select('*')
      .eq('is_active', true)
      .order('last_name')

    const { data: consultationsData } = await supabase
      .from('consultations')
      .select('patient_id, consultation_date, billing_amount')

    const stats: Record<string, { count: number; last: string | null; total: number }> = {}
    ;(consultationsData || []).forEach(c => {
      const key = c.patient_id
      if (!stats[key]) stats[key] = { count: 0, last: null, total: 0 }
      stats[key].count += 1
      stats[key].total += c.billing_amount || 0
      if (!stats[key].last || c.consultation_date > stats[key].last!) {
        stats[key].last = c.consultation_date
      }
    })

    const rows: PatientRow[] = (patientsData || []).map(p => ({
      ...p,
      consultationCount: stats[p.id]?.count || 0,
      lastConsultationAt: stats[p.id]?.last || null,
      totalBilled: stats[p.id]?.total || 0,
    }))

    setPatients(rows)
    setLoading(false)
  }

  useEffect(() => { fetchData() }, [])

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase()
    if (!term) return patients
    return patients.filter(p =>
      `${p.first_name} ${p.last_name}`.toLowerCase().includes(term) ||
      (p.dni || '').includes(term)
    )
  }, [patients, search])

  const handleCreate = async (data: PatientFormData) => {
    setSaving(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setSaving(false); return }

    const { error } = await supabase.from('patients').insert({
      doctor_id: user.id,
      first_name: data.first_name,
      last_name: data.last_name,
      dni: data.dni || null,
      birth_date: data.birth_date || null,
      gender: data.gender || null,
      email: data.email || null,
      phone: data.phone || null,
      address: data.address || null,
      insurance_name: data.insurance_name || null,
      insurance_number: data.insurance_number || null,
      insurance_plan: data.insurance_plan || null,
      allergies: data.allergies || null,
      chronic_conditions: data.chronic_conditions || null,
      previous_symptoms: data.previous_symptoms || null,
      medications: data.medications || null,
      notes: data.notes || null,
    })

    setSaving(false)
    if (!error) {
      setModalOpen(false)
      fetchData()
    }
  }

  return (
    <div className="max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Pacientes</h1>
          <p className="text-slate-500 text-sm mt-1">{patients.length} pacientes en total</p>
        </div>
        <div className="flex items-center gap-3">
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Buscar por nombre o DNI"
            className="px-3 py-2 rounded-lg border border-slate-300 text-sm w-64 focus:outline-none focus:ring-2 focus:ring-teal-500"
          />
          <button
            onClick={() => setModalOpen(true)}
            className="px-4 py-2 bg-teal-600 text-white text-sm font-medium rounded-lg hover:bg-teal-700 transition-colors whitespace-nowrap"
          >
            + Nuevo paciente
          </button>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="w-6 h-6 border-2 border-teal-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 text-slate-400">
            <p className="text-sm">No se encontraron pacientes</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="text-left px-6 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider">Paciente</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider">Edad</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider">Obra social</th>
                <th className="text-center px-4 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider">Consultas</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider">Última</th>
                <th className="text-right px-6 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider">Facturado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map(p => (
                <tr
                  key={p.id}
                  onClick={() => router.push(`/dashboard/patients/${p.id}`)}
                  className="hover:bg-slate-50 transition-colors cursor-pointer"
                >
                  <td className="px-6 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-teal-100 text-teal-700 flex items-center justify-center text-xs font-semibold">
                        {p.first_name[0]}{p.last_name[0]}
                      </div>
                      <div>
                        <p className="font-medium text-slate-900">{p.last_name}, {p.first_name}</p>
                        <p className="text-xs text-slate-400">DNI {p.dni || '—'}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-slate-600">
                    {p.birth_date ? `${differenceInYears(new Date(), parseISO(p.birth_date))} años` : '—'}
                  </td>
                  <td className="px-4 py-3">
                    {p.insurance_name ? (
                      <span className="inline-flex px-2 py-0.5 rounded-full bg-teal-50 text-teal-700 text-xs font-medium">
                        {p.insurance_name}
                      </span>
                    ) : '—'}
                  </td>
                  <td className="px-4 py-3 text-center font-medium text-slate-700">{p.consultationCount}</td>
                  <td className="px-4 py-3 text-slate-600">
                    {p.lastConsultationAt ? format(new Date(p.lastConsultationAt), 'd MMM yyyy') : '—'}
                  </td>
                  <td className="px-6 py-3 text-right font-medium text-slate-900">
                    {p.totalBilled > 0 ? `$${p.totalBilled.toLocaleString('es-AR')}` : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Nuevo paciente"
        subtitle="Cargá los datos de la historia clínica"
        maxWidth="max-w-2xl"
      >
        <PatientForm onSubmit={handleCreate} onCancel={() => setModalOpen(false)} isLoading={saving} />
      </Modal>
    </div>
  )
}
