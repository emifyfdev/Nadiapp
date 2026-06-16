// middleware.ts
import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => {
            request.cookies.set(name, value)
          })

          supabaseResponse = NextResponse.next({
            request,
          })

          cookiesToSet.forEach(({ name, value, options }) => {
            supabaseResponse.cookies.set(name, value, options)
          })
        },
      },
    }
  )

  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { pathname } = request.nextUrl

  const isPublicRoute =
    pathname === '/' ||
    pathname.startsWith('/auth/login') ||
    pathname.startsWith('/auth/callback') ||
    pathname.startsWith('/auth/rejected')

  if (isPublicRoute) {
    return supabaseResponse
  }

  if (!user) {
    return NextResponse.redirect(new URL('/auth/login', request.url))
  }

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .maybeSingle()

  if (profileError) {
    console.error('Profile error:', profileError.message)
    return NextResponse.redirect(new URL('/auth/login?error=profile', request.url))
  }

  const role = profile?.role ?? 'pending'

  if (role === 'pending' && !pathname.startsWith('/auth/pending')) {
    return NextResponse.redirect(new URL('/auth/pending', request.url))
  }

  if (role === 'rejected' && !pathname.startsWith('/auth/rejected')) {
    return NextResponse.redirect(new URL('/auth/rejected', request.url))
  }

  if (pathname.startsWith('/admin') && role !== 'superadmin') {
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  supabase
    .from('profiles')
    .update({ last_seen_at: new Date().toISOString() })
    .eq('id', user.id)
    .then(() => {})

  return supabaseResponse
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}