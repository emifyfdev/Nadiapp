'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

const NAV_ITEMS = [
  { label: 'Pacientes', href: '/dashboard' },
  { label: 'Agenda', href: '/dashboard/agenda' },
  { label: 'Facturación', href: '/dashboard/billing' },
  { label: 'Instituciones', href: '/dashboard/instituciones' },
]

export function Sidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()

  const isActive = (href: string) =>
    href === '/dashboard' ? pathname === '/dashboard' : pathname.startsWith(href)

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/auth/login')
  }

  return (
    <aside className="w-60 shrink-0 bg-white border-r border-slate-200 min-h-screen flex flex-col px-4 py-6">
      <div className="flex items-center gap-2 px-2 mb-8">
        <div className="w-8 h-8 rounded-lg bg-teal-600 flex items-center justify-center text-white font-bold">
          H
        </div>
        <span className="font-semibold text-slate-900">HConline</span>
      </div>

      <nav className="flex-1 space-y-1">
        {NAV_ITEMS.map(item => {
          const active = isActive(item.href)
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                active ? 'bg-teal-50 text-teal-700' : 'text-slate-600 hover:bg-slate-50'
              }`}
            >
              <span className={`w-1.5 h-1.5 rounded-full ${active ? 'bg-teal-600' : 'bg-slate-300'}`} />
              {item.label}
            </Link>
          )
        })}
      </nav>

      <button
        onClick={handleLogout}
        className="px-3 py-2 text-sm text-slate-500 hover:text-slate-900 text-left rounded-lg hover:bg-slate-50 transition-colors"
      >
        Cerrar sesión
      </button>
    </aside>
  )
}
