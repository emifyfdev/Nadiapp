'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { createClient } from '@/lib/supabase/client'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { Modal } from '@/components/ui/Modal'
import type { Appointment, Patient, Institution } from '@/types'

interface AppointmentFormValues {
  patient_id: string
  date: string
  time: string
  institution_id: string
  reason: string
}

export default function AgendaPage() {
  const supabase = createClient()
  const router = useRouter()
  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [patients, setPatients] = useState<Patient[]>([])
  const [institutions, setInstitutions] = useState<Institution[]>([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [syncingId, setSyncingId] = useState<string | null>(null)
  const [googleConnected, setGoogleConnected] = useState<boolean | null>(null)

  const { register, handleSubmit, reset, formState: { errors } } = useForm<AppointmentFormValues>({
    defaultValues: { date: format(new Date(), 'yyyy-MM-dd'), time: '09:00' },
  })

  const fetchData = useCallback(async () => {
    setLoading(true)
    const { data: appointmentsData } = await supabase
      .from('appointments')
      .select('*, patient:patients(first_name, last_name, phone, email), institution:institutions(name, type, address)')
      .gte('scheduled_at', new Date().toISOString())
      .not('status', 'in', '(cancelado,realizado)')
      .order('scheduled_at')

    const { data: patientsData } = await supabase.from('patients').select('*').eq('is_active', true).order('last_name')
    const { data: institutionsData } = await supabase.from('institutions').select('*').order('name')

    setAppointments(appointmentsData || [])
    setPatients(patientsData || [])
    setInstitutions(institutionsData || [])
    setLoading(false)
  }, [])

  const checkGoogleConnection = useCallback(async () => {
    const { data } = await supabase.from('google_credentials').select('doctor_id').maybeSingle()
    setGoogleConnected(!!data)
  }, [])

  useEffect(() => { fetchData(); checkGoogleConnection() }, [fetchData, checkGoogleConnection])

  const connectGoogleCalendar = async () => {
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
        scopes: 'https://www.googleapis.com/auth/calendar.events',
        queryParams: {
          access_type: 'offline',
          prompt: 'consent',
        },
      },
    })
  }

  const syncGoogleCalendar = async (a: Appointment) => {
    if (a.google_event_link) {
      window.open(a.google_event_link, '_blank')
      return
    }

    setSyncingId(a.id)
    const response = await fetch('/api/calendar/create-event', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ appointmentId: a.id }),
    })
    const result = await response.json()
    setSyncingId(null)

    if (!response.ok) {
      if (result.error === 'not_connected') {
        setGoogleConnected(false)
      } else {
        alert('No se pudo crear el evento en Google Calendar. Intentá de nuevo.')
      }
      return
    }

    window.open(result.link, '_blank')
    fetchData()
  }

  const cancelAppointment = async (a: Appointment) => {
    if (!confirm('¿Cancelar este turno?')) return
    const { error } = await supabase.from('appointments').update({ status: 'cancelado' }).eq('id', a.id)
    if (error) {
      console.error('Error al cancelar turno:', error)
      alert(`No se pudo cancelar: ${error.message}`)
      return
    }
    fetchData()
  }

  const markAttended = async (a: Appointment) => {
    const { error } = await supabase.from('appointments').update({ status: 'realizado' }).eq('id', a.id)
    if (error) {
      alert(`No se pudo marcar como atendido: ${error.message}`)
      return
    }
    router.push(`/dashboard/patients/${a.patient_id}?newConsultation=1`)
  }

  const openWhatsApp = (a: Appointment) => {
    const phone = a.patient?.phone?.replace(/\D/g, '')
    if (!phone) {
      alert('Este paciente no tiene un teléfono registrado.')
      return
    }
    const start = new Date(a.scheduled_at)
    const patientName = a.patient ? a.patient.first_name : ''
    const message = `Hola ${patientName}, te recuerdo tu turno el ${format(start, "d 'de' MMMM", { locale: es })} a las ${format(start, 'HH:mm')}hs${a.institution?.name ? ` en ${a.institution.name}` : ''}.`
    window.open(`https://wa.me/${phone}?text=${encodeURIComponent(message)}`, '_blank')
  }

  const onSubmit = async (values: AppointmentFormValues) => {
    setSaving(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setSaving(false); return }

    const scheduledAt = new Date(`${values.date}T${values.time}:00`)

    const { error } = await supabase.from('appointments').insert({
      doctor_id: user.id,
      patient_id: values.patient_id,
      institution_id: values.institution_id || null,
      scheduled_at: scheduledAt.toISOString(),
      reason: values.reason || null,
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
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-2">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Agenda</h1>
          <p className="text-slate-500 text-sm mt-1">Próximos turnos asignados</p>
        </div>
        <button
          onClick={() => setModalOpen(true)}
          className="px-4 py-2 bg-violet-600 text-white text-sm font-medium rounded-lg hover:bg-violet-700 transition-colors whitespace-nowrap"
        >
          + Agendar visita
        </button>
      </div>

      {googleConnected === false ? (
        <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <p className="text-sm text-amber-800">
            Conectá tu Google Calendar una sola vez para crear eventos automáticamente y avisarle al paciente por mail.
          </p>
          <button
            onClick={connectGoogleCalendar}
            className="px-3 py-1.5 bg-amber-600 text-white text-xs font-medium rounded-lg hover:bg-amber-700 transition-colors whitespace-nowrap self-start"
          >
            Conectar Google Calendar
          </button>
        </div>
      ) : (
        <p className="text-xs text-violet-700 bg-violet-50 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg mb-6">
          <span className="w-1.5 h-1.5 rounded-full bg-violet-500" />
          "Google Calendar" crea el evento directo en tu calendario y le manda la invitación al paciente por mail. "WhatsApp" abre un mensaje listo para enviar.
        </p>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <div className="w-6 h-6 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : appointments.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 text-center py-16 text-slate-400">
          <p className="text-sm">No tenés turnos agendados</p>
        </div>
      ) : (
        <div className="space-y-3">
          {appointments.map(a => (
            <div key={a.id} className="bg-white rounded-xl border border-slate-200 p-4 flex flex-col sm:flex-row sm:items-center gap-4">
              <div
                onClick={() => router.push(`/dashboard/patients/${a.patient_id}`)}
                className="flex items-center gap-4 flex-1 cursor-pointer"
              >
                <div className="text-center w-14 shrink-0">
                  <p className="text-xs font-medium text-slate-400 uppercase">
                    {format(new Date(a.scheduled_at), 'EEE', { locale: es })}
                  </p>
                  <p className="text-lg font-semibold text-slate-900">{format(new Date(a.scheduled_at), 'd')}</p>
                  <p className="text-xs text-slate-400">{format(new Date(a.scheduled_at), 'MMM', { locale: es })}</p>
                </div>
                <div className="text-sm font-medium text-slate-600 w-14 shrink-0">
                  {format(new Date(a.scheduled_at), 'HH:mm')}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-slate-900 hover:text-violet-700">
                    {a.patient ? `${a.patient.last_name}, ${a.patient.first_name}` : 'Paciente'}
                  </p>
                  {a.reason && <p className="text-xs text-slate-400">{a.reason}</p>}
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2 sm:ml-auto">
                {a.institution?.name && (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-100 text-slate-600 text-xs font-medium whitespace-nowrap">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                    {a.institution.name}
                  </span>
                )}
                <button
                  onClick={() => markAttended(a)}
                  className="px-3 py-1.5 text-xs font-medium text-green-700 border border-green-200 rounded-lg hover:bg-green-50 whitespace-nowrap"
                >
                  Marcar atendido
                </button>
                <button
                  onClick={() => openWhatsApp(a)}
                  className="px-3 py-1.5 text-xs font-medium text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50 whitespace-nowrap"
                >
                  WhatsApp
                </button>
                <button
                  onClick={() => syncGoogleCalendar(a)}
                  disabled={syncingId === a.id}
                  className="px-3 py-1.5 text-xs font-medium text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50 whitespace-nowrap disabled:opacity-50 flex items-center gap-1.5"
                >
                  {syncingId === a.id && <div className="w-3 h-3 border-2 border-slate-400 border-t-transparent rounded-full animate-spin" />}
                  {a.google_event_link ? 'Ver en Calendar' : 'Google Calendar'}
                </button>
                <button
                  onClick={() => cancelAppointment(a)}
                  className="px-3 py-1.5 text-xs font-medium text-red-600 border border-red-200 rounded-lg hover:bg-red-50 whitespace-nowrap"
                >
                  Cancelar
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Agendar visita"
        subtitle="Programá un turno y agregalo a Google Calendar"
      >
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Paciente</label>
            <select {...register('patient_id', { required: true })}
              className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-violet-500">
              <option value="">Seleccioná paciente...</option>
              {patients.map(p => (
                <option key={p.id} value={p.id}>{p.last_name}, {p.first_name}</option>
              ))}
            </select>
            {errors.patient_id && <p className="text-xs text-red-600 mt-1">Requerido</p>}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Fecha</label>
              <input type="date" {...register('date', { required: true })}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Hora</label>
              <input type="time" {...register('time', { required: true })}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500" />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Institución</label>
            <select {...register('institution_id')}
              className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-violet-500">
              <option value="">Seleccionar...</option>
              {institutions.map(i => (
                <option key={i.id} value={i.id}>{i.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Motivo</label>
            <input {...register('reason')} placeholder="Ej: Control, primera consulta..."
              className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500" />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-200">
            <button type="button" onClick={() => setModalOpen(false)}
              className="px-4 py-2 text-sm text-slate-600 hover:text-slate-900 transition-colors">
              Cancelar
            </button>
            <button type="submit" disabled={saving}
              className="px-6 py-2 bg-violet-600 text-white text-sm font-medium rounded-lg hover:bg-violet-700 transition-colors disabled:opacity-50 flex items-center gap-2">
              {saving && <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />}
              Agendar visita
            </button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
