'use client'
// src/app/dashboard/billing/page.tsx
// Página de auditoría y facturación mensual

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { format, startOfMonth, endOfMonth } from 'date-fns'
import { es } from 'date-fns/locale'
import type { Institution, BillingAuditRow, BillingStatus } from '@/types'

const STATUS_LABELS: Record<BillingStatus, string> = {
  pendiente: 'Pendiente',
  auditado: 'Auditado',
  facturado: 'Facturado',
  cobrado: 'Cobrado',
}

const STATUS_COLORS: Record<BillingStatus, string> = {
  pendiente: 'bg-amber-100 text-amber-800',
  auditado: 'bg-blue-100 text-blue-800',
  facturado: 'bg-green-100 text-green-800',
  cobrado: 'bg-slate-100 text-slate-700',
}

interface SummaryCard {
  institution_id: string
  institution_name: string
  count: number
  total: number
  pendiente: number
}

export default function BillingPage() {
  const supabase = createClient()
  const now = new Date()

  const [selectedYear, setSelectedYear] = useState(now.getFullYear())
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth() + 1)
  const [selectedInstitution, setSelectedInstitution] = useState('')
  const [selectedStatus, setSelectedStatus] = useState<BillingStatus | ''>('')
  const [institutions, setInstitutions] = useState<Institution[]>([])
  const [rows, setRows] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [summary, setSummary] = useState<SummaryCard[]>([])

  useEffect(() => {
    supabase.from('institutions').select('*').order('name').then(({ data }) => {
      if (data) setInstitutions(data)
    })
  }, [])

  const fetchData = useCallback(async () => {
    setLoading(true)
    const dateFrom = startOfMonth(new Date(selectedYear, selectedMonth - 1))
    const dateTo = endOfMonth(new Date(selectedYear, selectedMonth - 1))

    let query = supabase
      .from('consultations')
      .select(`
        id,
        consultation_date,
        billing_code,
        billing_description,
        billing_amount,
        billing_status,
        institution_id,
        patients!inner(first_name, last_name, dni, insurance_name),
        institutions(name, type)
      `)
      .gte('consultation_date', dateFrom.toISOString())
      .lte('consultation_date', dateTo.toISOString())
      .order('consultation_date', { ascending: false })

    if (selectedInstitution) query = query.eq('institution_id', selectedInstitution)
    if (selectedStatus) query = query.eq('billing_status', selectedStatus)

    const { data } = await query

    if (data) {
      setRows(data)

      // Calcular resumen por institución
      const summaryMap: Record<string, SummaryCard> = {}
      data.forEach((r: any) => {
        const instId = r.institution_id || 'sin_institucion'
        const instName = r.institutions?.name || 'Sin institución'
        if (!summaryMap[instId]) {
          summaryMap[instId] = { institution_id: instId, institution_name: instName, count: 0, total: 0, pendiente: 0 }
        }
        summaryMap[instId].count += 1
        summaryMap[instId].total += r.billing_amount || 0
        if (r.billing_status === 'pendiente') summaryMap[instId].pendiente += r.billing_amount || 0
      })
      setSummary(Object.values(summaryMap).sort((a, b) => b.total - a.total))
    }
    setLoading(false)
  }, [selectedYear, selectedMonth, selectedInstitution, selectedStatus])

  useEffect(() => { fetchData() }, [fetchData])

  const updateStatus = async (id: string, status: BillingStatus) => {
    await supabase.from('consultations').update({ billing_status: status }).eq('id', id)
    fetchData()
  }

  const exportCSV = () => {
    const headers = ['Fecha', 'Paciente', 'DNI', 'Obra Social', 'Institución', 'Código', 'Descripción', 'Monto', 'Estado']
    const csvRows = rows.map((r: any) => [
      format(new Date(r.consultation_date), 'dd/MM/yyyy'),
      `${r.patients.last_name} ${r.patients.first_name}`,
      r.patients.dni || '',
      r.patients.insurance_name || '',
      r.institutions?.name || '',
      r.billing_code || '',
      r.billing_description || '',
      r.billing_amount?.toFixed(2) || '0.00',
      STATUS_LABELS[r.billing_status as BillingStatus] || r.billing_status,
    ])
    const csv = [headers, ...csvRows].map(r => r.map(c => `"${c}"`).join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `facturacion_${selectedYear}_${String(selectedMonth).padStart(2, '0')}.csv`
    a.click()
  }

  const totalAmount = rows.reduce((acc: number, r: any) => acc + (r.billing_amount || 0), 0)
  const pendingAmount = rows.filter((r: any) => r.billing_status === 'pendiente')
    .reduce((acc: number, r: any) => acc + (r.billing_amount || 0), 0)

  return (
    <div className="max-w-6xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-8">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Auditoría y facturación</h1>
          <p className="text-slate-500 text-sm mt-1">Revisá y exportá lo que corresponde facturar por institución</p>
        </div>
        <button onClick={exportCSV}
          className="flex items-center justify-center gap-2 px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 transition-colors self-start">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
              d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          Exportar CSV
        </button>
      </div>

      {/* Filtros */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        <select value={selectedMonth} onChange={e => setSelectedMonth(Number(e.target.value))}
          className="px-3 py-2 rounded-lg border border-slate-300 text-sm bg-white">
          {Array.from({ length: 12 }, (_, i) => (
            <option key={i + 1} value={i + 1}>
              {format(new Date(2024, i, 1), 'MMMM', { locale: es })}
            </option>
          ))}
        </select>
        <select value={selectedYear} onChange={e => setSelectedYear(Number(e.target.value))}
          className="px-3 py-2 rounded-lg border border-slate-300 text-sm bg-white">
          {[now.getFullYear(), now.getFullYear() - 1, now.getFullYear() - 2].map(y => (
            <option key={y} value={y}>{y}</option>
          ))}
        </select>
        <select value={selectedInstitution} onChange={e => setSelectedInstitution(e.target.value)}
          className="px-3 py-2 rounded-lg border border-slate-300 text-sm bg-white">
          <option value="">Todas las instituciones</option>
          {institutions.map(i => <option key={i.id} value={i.id}>{i.name}</option>)}
        </select>
        <select value={selectedStatus} onChange={e => setSelectedStatus(e.target.value as any)}
          className="px-3 py-2 rounded-lg border border-slate-300 text-sm bg-white">
          <option value="">Todos los estados</option>
          {Object.entries(STATUS_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
      </div>

      {/* Resumen cards por institución */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        <div className="bg-violet-600 rounded-xl p-4 text-white">
          <p className="text-violet-100 text-xs mb-1">Total del período</p>
          <p className="text-2xl font-semibold">${totalAmount.toLocaleString('es-AR', { minimumFractionDigits: 2 })}</p>
          <p className="text-violet-100 text-xs mt-1">{rows.length} consultas</p>
        </div>
        <div className="bg-amber-50 rounded-xl p-4 border border-amber-200">
          <p className="text-amber-700 text-xs mb-1">Pendiente de facturar</p>
          <p className="text-2xl font-semibold text-amber-900">${pendingAmount.toLocaleString('es-AR', { minimumFractionDigits: 2 })}</p>
          <p className="text-amber-600 text-xs mt-1">{rows.filter((r: any) => r.billing_status === 'pendiente').length} consultas</p>
        </div>
        {summary.slice(0, 1).map(s => (
          <div key={s.institution_id} className="bg-blue-50 rounded-xl p-4 border border-blue-200">
            <p className="text-blue-700 text-xs mb-1 truncate">{s.institution_name}</p>
            <p className="text-2xl font-semibold text-blue-900">${s.total.toLocaleString('es-AR', { minimumFractionDigits: 2 })}</p>
            <p className="text-blue-600 text-xs mt-1">{s.count} consultas</p>
          </div>
        ))}
      </div>

      {/* Tabla */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-x-auto">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="w-6 h-6 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : rows.length === 0 ? (
          <div className="text-center py-16 text-slate-400">
            <p className="text-sm">No hay consultas para este período y filtros</p>
          </div>
        ) : (
          <table className="w-full text-sm min-w-[560px]">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider">Fecha</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider">Paciente</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider hidden sm:table-cell">Institución</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider hidden md:table-cell">Código</th>
                <th className="text-right px-4 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider">Monto</th>
                <th className="text-center px-4 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider">Estado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rows.map((row: any) => (
                <tr key={row.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-4 py-3 text-slate-600 whitespace-nowrap">
                    {format(new Date(row.consultation_date), 'dd/MM/yyyy')}
                  </td>
                  <td className="px-4 py-3">
                    <p className="font-medium text-slate-900">
                      {row.patients.last_name}, {row.patients.first_name}
                    </p>
                    <p className="text-xs text-slate-400">{row.patients.insurance_name}</p>
                  </td>
                  <td className="px-4 py-3 text-slate-600 hidden sm:table-cell">
                    {row.institutions?.name || '—'}
                  </td>
                  <td className="px-4 py-3 text-slate-500 hidden md:table-cell font-mono text-xs">
                    {row.billing_code || '—'}
                  </td>
                  <td className="px-4 py-3 text-right font-medium text-slate-900">
                    {row.billing_amount
                      ? `$${row.billing_amount.toLocaleString('es-AR', { minimumFractionDigits: 2 })}`
                      : '—'}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <select
                      value={row.billing_status}
                      onChange={e => updateStatus(row.id, e.target.value as BillingStatus)}
                      className={`text-xs font-medium px-2 py-1 rounded-full border-0 cursor-pointer ${STATUS_COLORS[row.billing_status as BillingStatus]}`}
                    >
                      {Object.entries(STATUS_LABELS).map(([k, v]) => (
                        <option key={k} value={k}>{v}</option>
                      ))}
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
