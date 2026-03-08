'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import AddWeightModal from '@/components/AddWeightModal'
import { weightChangePer7Days } from '@/lib/calculations'
import type { WeightEntry } from '@/types'
import { formatDate } from '@/lib/utils'


export default function WeightPage() {
  const [entries, setEntries] = useState<WeightEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [range, setRange] = useState<7 | 30 | 90>(30)
  const [deleting, setDeleting] = useState<string | null>(null)

  const supabase = createClient()

  const load = useCallback(async () => {
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const cutoff = formatDate(new Date(Date.now() - range * 24 * 60 * 60 * 1000))
    const { data } = await supabase
      .from('rf_weight_entries')
      .select('*')
      .eq('user_id', user.id)
      .gte('date', cutoff)
      .order('date', { ascending: false })

    setEntries(data ?? [])
    setLoading(false)
  }, [range, supabase])

  useEffect(() => { load() }, [load])

  async function deleteEntry(id: string) {
    setDeleting(id)
    await supabase.from('rf_weight_entries').delete().eq('id', id)
    setDeleting(null)
    load()
  }

  const sorted = [...entries].sort((a, b) => a.date.localeCompare(b.date))
  const avgWeight = entries.length > 0
    ? entries.reduce((s, e) => s + e.weight_lb, 0) / entries.length
    : null
  const latest = entries[0]?.weight_lb ?? null
  const oldest = sorted[0]?.weight_lb ?? null
  const totalChange = latest !== null && oldest !== null ? latest - oldest : null
  const weeklyChange = weightChangePer7Days(sorted)

  // Simple ASCII-style chart using div heights
  const chartData = sorted.slice(-30)
  const minW = chartData.length > 0 ? Math.min(...chartData.map(e => e.weight_lb)) : 0
  const maxW = chartData.length > 0 ? Math.max(...chartData.map(e => e.weight_lb)) : 0
  const chartRange = maxW - minW || 1

  return (
    <div className="max-w-2xl mx-auto p-4 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-slate-900">Weight</h1>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-1.5 bg-[#1B72CC] text-white px-3 py-2 rounded-lg text-sm font-semibold hover:bg-[#1558A0] transition-colors"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} className="w-4 h-4">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
          </svg>
          Log Weight
        </button>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-[#1B72CC] rounded-xl p-4 text-white">
          <p className="text-blue-200 text-xs font-medium">Current</p>
          <p className="text-3xl font-bold mt-1">{latest?.toFixed(1) ?? '—'}</p>
          <p className="text-blue-200 text-xs">lbs</p>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <p className="text-slate-500 text-xs font-medium">7-day avg</p>
          <p className="text-3xl font-bold mt-1 text-slate-900">{avgWeight?.toFixed(1) ?? '—'}</p>
          <p className="text-slate-400 text-xs">lbs</p>
        </div>
      </div>

      {/* Trend stats */}
      {entries.length >= 2 && (
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: `${range}d change`, value: totalChange },
            { label: '7d/week rate', value: weeklyChange },
          ].map((stat, i) => (
            <div key={i} className="bg-white border border-slate-200 rounded-xl p-3 text-center">
              <p className="text-xs text-slate-500 mb-1">{stat.label}</p>
              <p className={`text-lg font-bold ${
                stat.value === null ? 'text-slate-400' :
                stat.value < 0 ? 'text-green-600' :
                stat.value > 0 ? 'text-red-500' : 'text-slate-900'
              }`}>
                {stat.value === null ? '—' : `${stat.value > 0 ? '+' : ''}${stat.value.toFixed(1)} lb`}
              </p>
            </div>
          ))}
          <div className="bg-white border border-slate-200 rounded-xl p-3 text-center">
            <p className="text-xs text-slate-500 mb-1">Entries</p>
            <p className="text-lg font-bold text-slate-900">{entries.length}</p>
          </div>
        </div>
      )}

      {/* Range selector */}
      <div className="flex gap-2">
        {([7, 30, 90] as const).map((r) => (
          <button
            key={r}
            onClick={() => setRange(r)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              range === r
                ? 'bg-[#1B72CC] text-white'
                : 'bg-white border border-slate-200 text-slate-600 hover:border-[#1B72CC]'
            }`}
          >
            {r}d
          </button>
        ))}
      </div>

      {/* Chart */}
      {chartData.length > 1 && (
        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <p className="text-xs font-medium text-slate-500 mb-3">Weight trend ({chartData.length} entries)</p>
          <div className="flex items-end gap-1 h-24">
            {chartData.map((entry, i) => {
              const height = Math.max(4, ((entry.weight_lb - minW) / chartRange) * 80 + 8)
              return (
                <div key={entry.id} className="flex-1 flex flex-col items-center gap-0.5">
                  <div
                    className="w-full bg-[#1B72CC] rounded-sm opacity-80"
                    style={{ height: `${height}px` }}
                    title={`${entry.date}: ${entry.weight_lb} lb`}
                  />
                </div>
              )
            })}
          </div>
          <div className="flex justify-between text-xs text-slate-400 mt-1">
            <span>{sorted[sorted.length - Math.min(30, sorted.length)]?.date.slice(5)}</span>
            <span>{sorted[sorted.length - 1]?.date.slice(5)}</span>
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-8">
          <div className="w-8 h-8 border-4 border-[#1B72CC] border-t-transparent rounded-full animate-spin" />
        </div>
      ) : entries.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-5xl mb-3">⚖️</p>
          <p className="text-slate-600 font-medium">No weight entries yet</p>
          <p className="text-slate-400 text-sm mt-1">Start logging to see your trend</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="divide-y divide-slate-100">
            {entries.map((entry) => (
              <div key={entry.id} className="px-4 py-3 flex items-center gap-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-semibold text-slate-900">{entry.weight_lb.toFixed(1)} lb</p>
                    {entry.body_fat_pct && (
                      <span className="text-xs bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded">{entry.body_fat_pct}% BF</span>
                    )}
                    {entry.waist_in && (
                      <span className="text-xs bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded">{entry.waist_in}" waist</span>
                    )}
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {new Date(entry.date + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                    {entry.notes && ` · ${entry.notes}`}
                  </p>
                </div>
                <button
                  onClick={() => deleteEntry(entry.id)}
                  disabled={deleting === entry.id}
                  className="p-1.5 rounded hover:bg-red-50 text-slate-400 hover:text-red-500 transition-colors"
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-4 h-4">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {showModal && <AddWeightModal onClose={() => setShowModal(false)} onSaved={load} />}
    </div>
  )
}
