'use client'
// src/app/admin/page.tsx — Dashboard superadmin

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { formatDistanceToNow, format } from 'date-fns'
import { es } from 'date-fns/locale'
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, Tooltip,
  ResponsiveContainer, CartesianGrid
} from 'recharts'
import type {
  AdminDoctorSummary,
  AdminSystemMetrics,
  AdminActivityDaily,
  AdminRecentError,
  AdminBillingByInstitution
} from '@/types'

type Tab = 'overview' | 'doctors' | 'billing' | 'errors'

function MetricCard({ label, value, sub, accent }: {
  label: string; value: string | number; sub?: string; accent?: string
}) {
  return (
    <div className={`rounded-xl p-4 border ${accent || 'bg-white border-slate-200'}`}>
      <p className="text-xs font-medium text-slate-500 mb-1">{label}</p>
      <p className="text-2xl font-semibold text-slate-900">{value}</p>
      {sub && <p className="text-xs text-slate-400 mt-1">{sub}</p>}
    </div>
  )
}

function Badge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    pending: 'bg-amber-100 text-amber-800',
    approved: 'bg-green-100 text-green-800',
    rejected: 'bg-red-100 text-red-800',
  }
  const labels: Record<string, string> = {
    pending: 'Pendiente', approved: 'Aprobado', rejected: 'Rechazado'
  }
  return (
    <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${colors[status] || 'bg-slate-100 text-slate-700'}`}>
      {labels[status] || status}
    </span>
  )
}

export default function AdminDashboard() {
  const supabase = createClient()
  const [tab, setTab] = useState<Tab>('overview')
  const [metrics, setMetrics] = useState<AdminSystemMetrics | null>(null)
  const [doctors, setDoctors] = useState<AdminDoctorSummary[]>([])
  const [activity, setActivity] = useState<AdminActivityDaily[]>([])
  const [errors, setErrors] = useState<AdminRecentError[]>([])
  const [billing, setBilling] = useState<AdminBillingByInstitution[]>([])
  const [pendingDoctors, setPendingDoctors] = useState<AdminDoctorSummary[]>([])

  useEffect(() => {
    // Métricas globales
    supabase.from('admin_system_metrics').select('*').single()
      .then(({ data }) => { if (data) setMetrics(data) })

    // Lista de médicos
    supabase.from('admin_doctors_summary').select('*').order('created_at', { ascending: false })
      .then(({ data }) => {
        if (data) {
          setDoctors(data)
          setPendingDoctors(data.filter(d => d.role === 'pending'))
        }
      })

    // Actividad diaria
    supabase.from('admin_activity_daily').select('*')
      .then(({ data }) => { if (data) setActivity(data) })

    // Errores recientes
    supabase.from('admin_recent_errors').select('*').limit(50)
      .then(({ data }) => { if (data) setErrors(data) })

    // Facturación por institución
    supabase.from('admin_billing_by_institution').select('*')
      .then(({ data }) => { if (data) setBilling(data) })
  }, [])

  const approveDoctor = async (id: string) => {
    const { data: { user } } = await supabase.auth.getUser()
    await supabase.from('profiles').update({
      role: 'approved',
      approved_at: new Date().toISOString(),
      approved_by: user?.id,
    }).eq('id', id)
    await supabase.from('audit_log').insert({
      actor_id: user?.id, action: 'approve_user', target_id: id, target_type: 'profile'
    })
    setDoctors(prev => prev.map(d => d.id === id ? { ...d, role: 'approved' } : d))
    setPendingDoctors(prev => prev.filter(d => d.id !== id))
  }

  const rejectDoctor = async (id: string) => {
    const { data: { user } } = await supabase.auth.getUser()
    await supabase.from('profiles').update({ role: 'rejected' }).eq('id', id)
    await supabase.from('audit_log').insert({
      actor_id: user?.id, action: 'reject_user', target_id: id, target_type: 'profile'
    })
    setDoctors(prev => prev.map(d => d.id === id ? { ...d, role: 'rejected' } : d))
    setPendingDoctors(prev => prev.filter(d => d.id !== id))
  }

  const tabs: { id: Tab; label: string; badge?: number }[] = [
    { id: 'overview', label: 'Resumen' },
    { id: 'doctors', label: 'Médicos', badge: pendingDoctors.length || undefined },
    { id: 'billing', label: 'Facturación' },
    { id: 'errors', label: 'Errores', badge: errors.length || undefined },
  ]

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 px-6 py-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold text-slate-900">Panel de administración</h1>
            <p className="text-xs text-slate-400 mt-0.5">Solo vos podés ver esta pantalla</p>
          </div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-purple-100 text-purple-800 rounded-full text-xs font-medium">
              <span className="w-1.5 h-1.5 rounded-full bg-purple-500 inline-block"></span>
              Superadmin
            </span>
          </div>
        </div>
      </div>

      {/* Alerta de pendientes */}
      {pendingDoctors.length > 0 && (
        <div className="bg-amber-50 border-b border-amber-200 px-6 py-3">
          <div className="max-w-6xl mx-auto flex items-center gap-3">
            <svg className="w-4 h-4 text-amber-600 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <p className="text-sm text-amber-800">
              <strong>{pendingDoctors.length}</strong> {pendingDoctors.length === 1 ? 'médico esperando' : 'médicos esperando'} aprobación
            </p>
            <button onClick={() => setTab('doctors')}
              className="ml-auto text-xs font-medium text-amber-700 hover:text-amber-900 underline">
              Revisar
            </button>
          </div>
        </div>
      )}

      <div className="max-w-6xl mx-auto px-6 py-8">
        {/* Tabs */}
        <div className="flex gap-1 mb-8 bg-white border border-slate-200 rounded-xl p-1 w-fit">
          {tabs.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={`relative px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                tab === t.id ? 'bg-slate-900 text-white' : 'text-slate-600 hover:text-slate-900'
              }`}>
              {t.label}
              {t.badge && (
                <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
                  {t.badge}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* OVERVIEW TAB */}
        {tab === 'overview' && (
          <div className="space-y-8">
            {/* Métricas */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
              <MetricCard label="Pendientes" value={metrics?.users_pending ?? '—'} accent="bg-amber-50 border-amber-200" />
              <MetricCard label="Aprobados" value={metrics?.users_approved ?? '—'} accent="bg-green-50 border-green-200" />
              <MetricCard label="Activos 7d" value={metrics?.users_active_7d ?? '—'} />
              <MetricCard label="Activos 30d" value={metrics?.users_active_30d ?? '—'} />
              <MetricCard label="Rechazados" value={metrics?.users_rejected ?? '—'} accent="bg-red-50 border-red-200" />
              <MetricCard label="Nuevos este mes" value={metrics?.users_new_this_month ?? '—'} />
            </div>

            {/* Gráfico actividad */}
            <div className="bg-white rounded-xl border border-slate-200 p-6">
              <h2 className="text-sm font-semibold text-slate-700 mb-4">Consultas últimos 30 días</h2>
              <ResponsiveContainer width="100%" height={200}>
                <AreaChart data={activity}>
                  <defs>
                    <linearGradient id="grad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#2563eb" stopOpacity={0.2} />
                      <stop offset="95%" stopColor="#2563eb" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="day" tick={{ fontSize: 11 }}
                    tickFormatter={v => format(new Date(v), 'dd/MM')} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip labelFormatter={v => format(new Date(v), 'dd MMM', { locale: es })}
                    formatter={(v: any) => [v, 'Consultas']} />
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <Area type="monotone" dataKey="consultations_count"
                    stroke="#2563eb" fill="url(#grad)" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            </div>

            {/* Top médicos activos */}
            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-100">
                <h2 className="text-sm font-semibold text-slate-700">Médicos más activos este mes</h2>
              </div>
              <table className="w-full text-sm">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="text-left px-6 py-3 text-xs font-medium text-slate-500">Médico</th>
                    <th className="text-center px-4 py-3 text-xs font-medium text-slate-500">Consultas mes</th>
                    <th className="text-center px-4 py-3 text-xs font-medium text-slate-500 hidden sm:table-cell">Total pacientes</th>
                    <th className="text-right px-6 py-3 text-xs font-medium text-slate-500 hidden md:table-cell">Último acceso</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {doctors.filter(d => d.role === 'approved')
                    .sort((a, b) => b.consultations_this_month - a.consultations_this_month)
                    .slice(0, 5)
                    .map(d => (
                      <tr key={d.id} className="hover:bg-slate-50">
                        <td className="px-6 py-3">
                          <p className="font-medium text-slate-900">{d.full_name || d.email}</p>
                          <p className="text-xs text-slate-400">{d.specialty || 'Sin especialidad'}</p>
                        </td>
                        <td className="px-4 py-3 text-center font-semibold text-blue-600">
                          {d.consultations_this_month}
                        </td>
                        <td className="px-4 py-3 text-center text-slate-600 hidden sm:table-cell">
                          {d.total_patients}
                        </td>
                        <td className="px-6 py-3 text-right text-xs text-slate-400 hidden md:table-cell">
                          {d.last_seen_at
                            ? formatDistanceToNow(new Date(d.last_seen_at), { addSuffix: true, locale: es })
                            : 'Nunca'}
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* DOCTORS TAB */}
        {tab === 'doctors' && (
          <div className="space-y-6">
            {/* Pendientes primero */}
            {pendingDoctors.length > 0 && (
              <div className="bg-white rounded-xl border border-amber-200 overflow-hidden">
                <div className="px-6 py-4 border-b border-amber-100 bg-amber-50">
                  <h2 className="text-sm font-semibold text-amber-800">
                    Esperando aprobación ({pendingDoctors.length})
                  </h2>
                </div>
                <div className="divide-y divide-slate-100">
                  {pendingDoctors.map(d => (
                    <div key={d.id} className="flex items-center justify-between px-6 py-4">
                      <div>
                        <p className="font-medium text-slate-900">{d.full_name || 'Sin nombre'}</p>
                        <p className="text-sm text-slate-500">{d.email}</p>
                        <p className="text-xs text-slate-400 mt-0.5">
                          Registrado {formatDistanceToNow(new Date(d.created_at), { addSuffix: true, locale: es })}
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <button onClick={() => rejectDoctor(d.id)}
                          className="px-3 py-1.5 text-sm text-red-600 border border-red-200 rounded-lg hover:bg-red-50 transition-colors">
                          Rechazar
                        </button>
                        <button onClick={() => approveDoctor(d.id)}
                          className="px-3 py-1.5 text-sm text-white bg-green-600 rounded-lg hover:bg-green-700 transition-colors">
                          Aprobar
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Todos los médicos */}
            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-100">
                <h2 className="text-sm font-semibold text-slate-700">Todos los usuarios</h2>
              </div>
              <table className="w-full text-sm">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="text-left px-6 py-3 text-xs font-medium text-slate-500">Usuario</th>
                    <th className="text-center px-4 py-3 text-xs font-medium text-slate-500">Estado</th>
                    <th className="text-center px-4 py-3 text-xs font-medium text-slate-500 hidden sm:table-cell">Pacientes</th>
                    <th className="text-center px-4 py-3 text-xs font-medium text-slate-500 hidden sm:table-cell">Consultas</th>
                    <th className="text-center px-4 py-3 text-xs font-medium text-slate-500 hidden md:table-cell">Este mes</th>
                    <th className="text-right px-6 py-3 text-xs font-medium text-slate-500 hidden lg:table-cell">Último acceso</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {doctors.map(d => (
                    <tr key={d.id} className="hover:bg-slate-50">
                      <td className="px-6 py-3">
                        <p className="font-medium text-slate-900">{d.full_name || 'Sin nombre'}</p>
                        <p className="text-xs text-slate-400">{d.email}</p>
                      </td>
                      <td className="px-4 py-3 text-center"><Badge status={d.role} /></td>
                      <td className="px-4 py-3 text-center text-slate-600 hidden sm:table-cell">{d.total_patients}</td>
                      <td className="px-4 py-3 text-center text-slate-600 hidden sm:table-cell">{d.total_consultations}</td>
                      <td className="px-4 py-3 text-center font-medium text-blue-600 hidden md:table-cell">
                        {d.consultations_this_month}
                      </td>
                      <td className="px-6 py-3 text-right text-xs text-slate-400 hidden lg:table-cell">
                        {d.last_seen_at
                          ? formatDistanceToNow(new Date(d.last_seen_at), { addSuffix: true, locale: es })
                          : 'Nunca'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* BILLING TAB */}
        {tab === 'billing' && (
          <div className="space-y-6">
            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-100">
                <h2 className="text-sm font-semibold text-slate-700">Facturación este mes por institución</h2>
              </div>
              <div className="p-6">
                <ResponsiveContainer width="100%" height={240}>
                  <BarChart data={billing}>
                    <XAxis dataKey="institution_name" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip formatter={(v: any) => [`$${v.toLocaleString('es-AR')}`, '']} />
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <Bar dataKey="total_amount" fill="#2563eb" radius={[4, 4, 0, 0]} name="Total" />
                    <Bar dataKey="pending_amount" fill="#f59e0b" radius={[4, 4, 0, 0]} name="Pendiente" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <table className="w-full text-sm border-t border-slate-100">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="text-left px-6 py-3 text-xs font-medium text-slate-500">Institución</th>
                    <th className="text-center px-4 py-3 text-xs font-medium text-slate-500">Consultas</th>
                    <th className="text-center px-4 py-3 text-xs font-medium text-slate-500">Médicos</th>
                    <th className="text-right px-4 py-3 text-xs font-medium text-slate-500">Total</th>
                    <th className="text-right px-6 py-3 text-xs font-medium text-slate-500">Pendiente</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {billing.map((b, i) => (
                    <tr key={i} className="hover:bg-slate-50">
                      <td className="px-6 py-3 font-medium text-slate-900">{b.institution_name}</td>
                      <td className="px-4 py-3 text-center text-slate-600">{b.consultation_count}</td>
                      <td className="px-4 py-3 text-center text-slate-600">{b.doctor_count}</td>
                      <td className="px-4 py-3 text-right font-semibold text-slate-900">
                        ${b.total_amount.toLocaleString('es-AR', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="px-6 py-3 text-right text-amber-700">
                        ${b.pending_amount.toLocaleString('es-AR', { minimumFractionDigits: 2 })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ERRORS TAB */}
        {tab === 'errors' && (
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100">
              <h2 className="text-sm font-semibold text-slate-700">Errores recientes ({errors.length})</h2>
            </div>
            {errors.length === 0 ? (
              <div className="text-center py-12 text-slate-400">
                <p className="text-sm">Sin errores registrados 🎉</p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {errors.map(e => (
                  <div key={e.id} className="px-6 py-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          {e.error_type && (
                            <span className="inline-flex px-2 py-0.5 bg-red-100 text-red-700 text-xs rounded-full font-medium">
                              {e.error_type}
                            </span>
                          )}
                          <span className="text-xs text-slate-400">{e.user_email}</span>
                        </div>
                        <p className="text-sm text-slate-700 font-mono truncate">{e.message}</p>
                        {e.url && <p className="text-xs text-slate-400 mt-0.5 truncate">{e.url}</p>}
                      </div>
                      <span className="text-xs text-slate-400 whitespace-nowrap">
                        {formatDistanceToNow(new Date(e.created_at), { addSuffix: true, locale: es })}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
