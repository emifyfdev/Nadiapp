// src/app/auth/callback/route.ts
import { createServerClient } from '@supabase/ssr'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')

  const response = NextResponse.redirect(`${origin}/dashboard`)

  if (!code) {
    return NextResponse.redirect(`${origin}/auth/login?error=no_code`)
  }

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, options)
          })
        },
      },
    }
  )

  const { data, error } = await supabase.auth.exchangeCodeForSession(code)

  if (error) {
    console.error('OAuth callback error:', error.message)
    return NextResponse.redirect(`${origin}/auth/login?error=oauth_callback`)
  }

  const googleRefreshToken = (data.session as { provider_refresh_token?: string } | null)?.provider_refresh_token
  if (googleRefreshToken && data.user) {
    await supabase.from('google_credentials').upsert({
      doctor_id: data.user.id,
      refresh_token: googleRefreshToken,
      updated_at: new Date().toISOString(),
    })
  }

  return response
}