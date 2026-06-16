// src/lib/google.ts
// Helpers server-side para crear eventos en Google Calendar a nombre del médico

const TOKEN_URL = 'https://oauth2.googleapis.com/token'
const CALENDAR_EVENTS_URL = 'https://www.googleapis.com/calendar/v3/calendars/primary/events'

export async function getGoogleAccessToken(refreshToken: string): Promise<string> {
  const response = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: process.env.GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      refresh_token: refreshToken,
      grant_type: 'refresh_token',
    }),
  })

  if (!response.ok) {
    throw new Error('No se pudo renovar el acceso a Google Calendar')
  }

  const data = await response.json()
  return data.access_token
}

export interface CalendarEventInput {
  summary: string
  description?: string
  location?: string
  startISO: string
  endISO: string
  attendeeEmail?: string | null
}

export async function createGoogleCalendarEvent(accessToken: string, event: CalendarEventInput) {
  const body = {
    summary: event.summary,
    description: event.description,
    location: event.location,
    start: { dateTime: event.startISO },
    end: { dateTime: event.endISO },
    attendees: event.attendeeEmail ? [{ email: event.attendeeEmail }] : undefined,
  }

  const response = await fetch(`${CALENDAR_EVENTS_URL}?sendUpdates=all`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify(body),
  })

  if (!response.ok) {
    const errorBody = await response.text()
    throw new Error(`Error de Google Calendar: ${errorBody}`)
  }

  return response.json() as Promise<{ id: string; htmlLink: string }>
}
