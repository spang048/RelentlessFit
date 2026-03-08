'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { today as getToday } from '@/lib/utils'

interface Props {
  onClose: () => void
  onSaved: () => void
  defaultDate?: string
}

export default function AddWeightModal({ onClose, onSaved, defaultDate }: Props) {
  const todayStr = getToday()
  const [date, setDate] = useState(defaultDate ?? todayStr)
  const [weight, setWeight] = useState('')
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const supabase = createClient()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!weight) return
    setSaving(true)
    setError('')

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setError('Not logged in'); setSaving(false); return }

    const { error: err } = await supabase.from('rf_weight_entries').upsert({
      user_id: user.id,
      date,
      weight_lb: parseFloat(weight),
      notes: notes.trim() || null,
      source: 'manual',
    }, { onConflict: 'user_id,date' })

    if (err) { setError(err.message); setSaving(false); return }
    onSaved()
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="absolute inset-x-0 bottom-0 md:inset-0 md:flex md:items-center md:justify-center md:p-4">
      <div className="relative bg-white w-full md:max-w-md md:rounded-2xl rounded-t-2xl shadow-xl flex flex-col overflow-hidden" style={{ maxHeight: '85dvh' }} onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 flex-shrink-0">
          <h2 className="text-lg font-semibold text-slate-900">Log Weight</h2>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-slate-100 text-slate-500">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-5 h-5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Scrollable form */}
        <form onSubmit={handleSubmit} className="overflow-y-auto flex-1 p-4 space-y-4">
          {/* Weight — full width, prominent */}
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Weight (lbs)</label>
            <input
              type="number"
              value={weight}
              onChange={(e) => setWeight(e.target.value)}
              placeholder="185.0"
              step="0.1"
              min="50"
              max="600"
              required
              autoFocus
              className="w-full px-3 py-3 border border-slate-200 rounded-lg text-xl font-semibold text-center focus:outline-none focus:ring-2 focus:ring-[#1B72CC]"
            />
          </div>

          {/* Date */}
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Date</label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              max={todayStr}
              className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1B72CC]"
            />
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">
              Notes <span className="text-slate-400 font-normal">(optional)</span>
            </label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Morning, after workout…"
              className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1B72CC]"
            />
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <button
            type="submit"
            disabled={saving || !weight}
            className="w-full py-3 bg-[#1B72CC] text-white font-semibold rounded-xl disabled:opacity-50 hover:bg-[#1558A0] transition-colors"
          >
            {saving ? 'Saving…' : 'Log Weight'}
          </button>
        </form>
      </div>
      </div>
    </div>
  )
}
