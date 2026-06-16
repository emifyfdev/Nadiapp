'use client'

import Link from 'next/link'
import { useState, useEffect } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

const NAV_ITEMS = [
  { label: 'Pacientes', href: '/dashboard' },
  { label: 'Agenda', href: '/dashboard/agenda' },
  { label: 'Facturación', href: '/dashboard/billing' },
  { label: 'Instituciones', href: '/dashboard/instituciones' },
]

function Logo({ avatarUrl, avatarError, onAvatarError }: {
  avatarUrl: string | null
  avatarError: boolean
  onAvatarError: () => void
}) {
  if (avatarUrl && !avatarError) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={avatarUrl}
        alt=""
        referrerPolicy="no-referrer"
        onError={onAvatarError}
        className="w-8 h-8 rounded-lg object-cover shrink-0"
      />
    )
  }
  return (
    <div className="w-8 h-8 rounded-lg bg-violet-600 flex items-center justify-center text-white font-bold shrink-0">
      N
    </div>
  )
}

export function Sidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null)
  const [avatarError, setAvatarError] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      setAvatarUrl(user?.user_metadata?.avatar_url || user?.user_metadata?.picture || null)
    })
  }, [])

  useEffect(() => { setMobileOpen(false) }, [pathname])

  const isActive = (href: string) =>
    href === '/dashboard' ? pathname === '/dashboard' : pathname.startsWith(href)

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/auth/login')
  }

  const navLinks = (onNavigate?: () => void) => (
    <nav className="flex-1 space-y-1">
      {NAV_ITEMS.map(item => {
        const active = isActive(item.href)
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
              active ? 'bg-violet-50 text-violet-700' : 'text-slate-600 hover:bg-slate-50'
            }`}
          >
            <span className={`w-1.5 h-1.5 rounded-full ${active ? 'bg-violet-600' : 'bg-slate-300'}`} />
            {item.label}
          </Link>
        )
      })}
    </nav>
  )

  return (
    <>
      {/* Barra superior mobile */}
      <div className="md:hidden flex items-center justify-between bg-white border-b border-slate-200 px-4 py-3 sticky top-0 z-30">
        <div className="flex items-center gap-2">
          <Logo avatarUrl={avatarUrl} avatarError={avatarError} onAvatarError={() => setAvatarError(true)} />
          <span className="font-semibold text-slate-900">Nadiapp</span>
        </div>
        <button
          onClick={() => setMobileOpen(true)}
          aria-label="Abrir menú"
          className="p-2 rounded-lg hover:bg-slate-100"
        >
          <svg className="w-5 h-5 text-slate-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
      </div>

      {/* Drawer mobile */}
      {mobileOpen && (
        <div className="md:hidden fixed inset-0 z-40">
          <div className="absolute inset-0 bg-black/40" onClick={() => setMobileOpen(false)} />
          <aside className="absolute top-0 left-0 h-full w-64 bg-white px-4 py-6 flex flex-col">
            <div className="flex items-center justify-between mb-8 px-2">
              <div className="flex items-center gap-2">
                <Logo avatarUrl={avatarUrl} avatarError={avatarError} onAvatarError={() => setAvatarError(true)} />
                <span className="font-semibold text-slate-900">Nadiapp</span>
              </div>
              <button onClick={() => setMobileOpen(false)} aria-label="Cerrar menú" className="p-1 text-slate-400 hover:text-slate-700">
                ✕
              </button>
            </div>
            {navLinks(() => setMobileOpen(false))}
            <button
              onClick={handleLogout}
              className="px-3 py-2 text-sm text-slate-500 hover:text-slate-900 text-left rounded-lg hover:bg-slate-50 transition-colors"
            >
              Cerrar sesión
            </button>
          </aside>
        </div>
      )}

      {/* Sidebar desktop */}
      <aside className="hidden md:flex md:w-60 md:shrink-0 bg-white border-r border-slate-200 min-h-screen flex-col px-4 py-6">
        <div className="flex items-center gap-2 px-2 mb-8">
          <Logo avatarUrl={avatarUrl} avatarError={avatarError} onAvatarError={() => setAvatarError(true)} />
          <span className="font-semibold text-slate-900">Nadiapp</span>
        </div>

        {navLinks()}

        <button
          onClick={handleLogout}
          className="px-3 py-2 text-sm text-slate-500 hover:text-slate-900 text-left rounded-lg hover:bg-slate-50 transition-colors"
        >
          Cerrar sesión
        </button>
      </aside>
    </>
  )
}
