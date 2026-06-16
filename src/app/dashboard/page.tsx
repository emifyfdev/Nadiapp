'use client'

import { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { differenceInYears, format, parseISO, startOfDay, endOfDay, startOfMonth, endOfMonth } from 'date-fns'
import { Modal } from '@/components/ui/Modal'
import { PatientForm } from '@/components/patients/PatientForm'
import type { Patient, PatientFormData, Appointment } from '@/types'

interface PatientRow extends Patient {
  consultationCount: number
  lastConsultationAt: string | null
  totalBilled: number
}

export default function PatientsPage() {
  const supabase = createClient()
  const router = useRouter()

  const [patients, setPatients] = useState<PatientRow[]>([])
  const [todayAppointments, setTodayAppointments] = useState<Appointment[]>([])
  const [pendingBilling, setPendingBilling] = useState(0)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [saving, setSaving] = useState(false)

  const fetchData = async () => {
    setLoading(true)
    const now = new Date()

    const { data: patientsData } = await supabase
      .from('patients')
      .select('*')
      .order('last_name')

    const { data: consultationsData } = await supabase
      .from('consultations')
      .select('patient_id, consultation_date, billing_amount, billing_status')

    const { data: appointmentsData } = await supabase
      .from('appointments')
      .select('*, patient:patients(first_name, last_name)')
      .gte('scheduled_at', startOfDay(now).toISOString())
      .lte('scheduled_at', endOfDay(now).toISOString())
      .not('status', 'in', '(cancelado,realizado)')
      .order('scheduled_at')

    const stats: Record<string, { count: number; last: string | null; total: number }> = {}
    let pending = 0
    ;(consultationsData || []).forEach(c => {
      const key = c.patient_id
      if (!stats[key]) stats[key] = { count: 0, last: null, total: 0 }
      stats[key].count += 1
      stats[key].total += c.billing_amount || 0
      if (!stats[key].last || c.consultation_date > stats[key].last!) {
        stats[key].last = c.consultation_date
      }
      if (
        c.billing_status === 'pendiente' &&
        c.consultation_date >= startOfMonth(now).toISOString() &&
        c.consultation_date <= endOfMonth(now).toISOString()
      ) {
        pending += c.billing_amount || 0
      }
    })

    const rows: PatientRow[] = (patientsData || []).map(p => ({
      ...p,
      consultationCount: stats[p.id]?.count || 0,
      lastConsultationAt: stats[p.id]?.last || null,
      totalBilled: stats[p.id]?.total || 0,
    }))

    setPatients(rows)
    setTodayAppointments(appointmentsData || [])
    setPendingBilling(pending)
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

  const activePatients = patients.filter(p => p.is_active).length

  return (
    <div className="max-w-6xl mx-auto">
      {!loading && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
          <div className="bg-violet-600 rounded-xl p-4 text-white">
            <p className="text-violet-100 text-xs mb-1">Turnos hoy</p>
            <p className="text-2xl font-semibold">{todayAppointments.length}</p>
          </div>
          <div className="bg-white rounded-xl p-4 border border-slate-200">
            <p className="text-slate-500 text-xs mb-1">Pacientes activos</p>
            <p className="text-2xl font-semibold text-slate-900">{activePatients}</p>
          </div>
          <div className="bg-amber-50 rounded-xl p-4 border border-amber-200">
            <p className="text-amber-700 text-xs mb-1">Pendiente de facturar (mes)</p>
            <p className="text-2xl font-semibold text-amber-900">${pendingBilling.toLocaleString('es-AR')}</p>
          </div>
        </div>
      )}

      {!loading && todayAppointments.length > 0 && (
        <div className="bg-white rounded-xl border border-slate-200 mb-6 overflow-hidden">
          <div className="px-5 py-3 border-b border-slate-100 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-slate-700">Turnos de hoy</h2>
            <button onClick={() => router.push('/dashboard/agenda')} className="text-xs text-violet-700 hover:underline">
              Ver agenda completa
            </button>
          </div>
          <div className="divide-y divide-slate-100">
            {todayAppointments.map(a => (
              <div
                key={a.id}
                onClick={() => router.push(`/dashboard/patients/${a.patient_id}`)}
                className="flex items-center gap-4 px-5 py-3 cursor-pointer hover:bg-slate-50"
              >
                <span className="text-sm font-medium text-violet-700 w-12 shrink-0">
                  {format(new Date(a.scheduled_at), 'HH:mm')}
                </span>
                <span className="text-sm text-slate-900 font-medium">
                  {a.patient ? `${a.patient.last_name}, ${a.patient.first_name}` : 'Paciente'}
                </span>
                {a.reason && <span className="text-xs text-slate-400">{a.reason}</span>}
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Pacientes</h1>
          <p className="text-slate-500 text-sm mt-1">{patients.length} pacientes en total</p>
        </div>
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Buscar por nombre o DNI"
            className="px-3 py-2 rounded-lg border border-slate-300 text-sm w-full sm:w-64 focus:outline-none focus:ring-2 focus:ring-violet-500"
          />
          <button
            onClick={() => setModalOpen(true)}
            className="px-4 py-2 bg-violet-600 text-white text-sm font-medium rounded-lg hover:bg-violet-700 transition-colors whitespace-nowrap"
          >
            + Nuevo paciente
          </button>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 overflow-x-auto">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="w-6 h-6 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 text-slate-400">
            <p className="text-sm">No se encontraron pacientes</p>
          </div>
        ) : (
          <table className="w-full text-sm min-w-[640px]">
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
                  className={`transition-colors cursor-pointer ${p.is_active ? 'hover:bg-slate-50' : 'bg-slate-50/60 opacity-60 hover:opacity-100'}`}
                >
                  <td className="px-6 py-3">
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold ${p.is_active ? 'bg-violet-100 text-violet-700' : 'bg-slate-200 text-slate-500'}`}>
                        {p.first_name[0]}{p.last_name[0]}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-medium text-slate-900">{p.last_name}, {p.first_name}</p>
                          {!p.is_active && (
                            <span className="inline-flex px-2 py-0.5 rounded-full bg-slate-200 text-slate-500 text-xs font-medium">
                              Inactivo
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-slate-400">DNI {p.dni || '—'}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-slate-600">
                    {p.birth_date && differenceInYears(new Date(), parseISO(p.birth_date)) >= 0
                      ? `${differenceInYears(new Date(), parseISO(p.birth_date))} años`
                      : '—'}
                  </td>
                  <td className="px-4 py-3">
                    {p.insurance_name ? (
                      <span className="inline-flex px-2 py-0.5 rounded-full bg-violet-50 text-violet-700 text-xs font-medium">
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
