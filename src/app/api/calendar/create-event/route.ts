import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getGoogleAccessToken, createGoogleCalendarEvent } from '@/lib/google'

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'unauthenticated' }, { status: 401 })
  }

  const { appointmentId } = await request.json()
  if (!appointmentId) {
    return NextResponse.json({ error: 'missing_appointment_id' }, { status: 400 })
  }

  const { data: appointment } = await supabase
    .from('appointments')
    .select('*, patient:patients(first_name, last_name, email), institution:institutions(name)')
    .eq('id', appointmentId)
    .single()

  if (!appointment) {
    return NextResponse.json({ error: 'appointment_not_found' }, { status: 404 })
  }

  const { data: credentials } = await supabase
    .from('google_credentials')
    .select('refresh_token')
    .eq('doctor_id', user.id)
    .maybeSingle()

  if (!credentials) {
    return NextResponse.json({ error: 'not_connected' }, { status: 400 })
  }

  try {
    const accessToken = await getGoogleAccessToken(credentials.refresh_token)
    const start = new Date(appointment.scheduled_at)
    const end = new Date(start.getTime() + 30 * 60 * 1000)
    const patientName = appointment.patient
      ? `${appointment.patient.last_name}, ${appointment.patient.first_name}`
      : 'Paciente'

    const event = await createGoogleCalendarEvent(accessToken, {
      summary: `Consulta: ${patientName}`,
      description: appointment.reason || undefined,
      location: appointment.institution?.name || undefined,
      startISO: start.toISOString(),
      endISO: end.toISOString(),
      attendeeEmail: appointment.patient?.email || null,
    })

    await supabase
      .from('appointments')
      .update({ google_event_id: event.id, google_event_link: event.htmlLink })
      .eq('id', appointmentId)

    return NextResponse.json({ link: event.htmlLink })
  } catch (err) {
    console.error('Google Calendar error:', err)
    return NextResponse.json({ error: 'google_error' }, { status: 500 })
  }
}
