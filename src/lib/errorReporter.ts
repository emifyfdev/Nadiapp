// src/lib/errorReporter.ts
// Reporta errores del cliente al dashboard de superadmin

import { createClient } from './supabase/client'

export async function reportError(error: Error | unknown, context?: {
  url?: string
  errorType?: string
  metadata?: Record<string, unknown>
}) {
  try {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()

    const err = error instanceof Error ? error : new Error(String(error))

    await supabase.from('app_errors').insert({
      user_id: user?.id || null,
      error_type: context?.errorType || 'client_error',
      message: err.message,
      stack: err.stack,
      url: context?.url || window?.location?.href,
      metadata: context?.metadata || null,
    })
  } catch {
    // No hacer nada si falla el reporte de error (evitar loop)
    console.error('Error reporting failed silently')
  }
}

// Hook para capturar errores no manejados globalmente
// Agregar en el layout principal
export function setupGlobalErrorReporting() {
  if (typeof window === 'undefined') return

  window.addEventListener('unhandledrejection', (event) => {
    reportError(event.reason, { errorType: 'unhandled_promise' })
  })

  window.addEventListener('error', (event) => {
    reportError(event.error || new Error(event.message), {
      errorType: 'uncaught_error',
      metadata: { filename: event.filename, lineno: event.lineno }
    })
  })
}
