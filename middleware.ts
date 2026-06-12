// middleware.ts — raíz del proyecto
import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()
  const { pathname } = request.nextUrl

  // Rutas públicas
  if (pathname.startsWith('/auth') || pathname === '/') {
    return supabaseResponse
  }

  // Sin sesión → login
  if (!user) {
    return NextResponse.redirect(new URL('/auth/login', request.url))
  }

  // Obtener perfil y rol
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  const role = profile?.role

  // Usuario pendiente → página de espera
  if (role === 'pending' && !pathname.startsWith('/auth/pending')) {
    return NextResponse.redirect(new URL('/auth/pending', request.url))
  }

  // Usuario rechazado → página de rechazo
  if (role === 'rejected' && !pathname.startsWith('/auth/rejected')) {
    return NextResponse.redirect(new URL('/auth/rejected', request.url))
  }

  // Solo superadmin puede acceder a /admin
  if (pathname.startsWith('/admin') && role !== 'superadmin') {
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  // Médico aprobado no puede acceder a /admin
  if (pathname.startsWith('/admin') && role !== 'superadmin') {
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  // Actualizar last_seen_at en background (no await para no bloquear)
  supabase
    .from('profiles')
    .update({ last_seen_at: new Date().toISOString() })
    .eq('id', user.id)

  return supabaseResponse
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
