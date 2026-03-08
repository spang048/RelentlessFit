'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import AddWorkoutModal from '@/components/AddWorkoutModal'
import type { ExerciseEntry } from '@/types'

const TYPE_EMOJI: Record<string, string> = {
  run: '🏃', walk: '🚶', bike: '🚴', strength: '💪',
  ski: '⛷️', hike: '🥾', other: '🏋️',
}

function formatDate(d: Date): string {
  return d.toISOString().split('T')[0]
}

export default function WorkoutPage() {
  const today = formatDate(new Date())
  const [date, setDate] = useState(today)
  const [entries, setEntries] = useState<ExerciseEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [deleting, setDeleting] = useState<string | null>(null)

  const supabase = createClient()

  const load = useCallback(async () => {
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { data } = await supabase
      .from('rf_exercise_entries')
      .select('*')
      .eq('user_id', user.id)
      .gte('logged_at', date + 'T00:00:00')
      .lte('logged_at', date + 'T23:59:59')
      .order('logged_at', { ascending: true })

    setEntries(data ?? [])
    setLoading(false)
  }, [date, supabase])

  useEffect(() => { load() }, [load])

  async function deleteEntry(id: string) {
    setDeleting(id)
    await supabase.from('rf_exercise_entries').delete().eq('id', id)
    setDeleting(null)
    load()
  }

  function shiftDate(days: number) {
    const d = new Date(date)
    d.setDate(d.getDate() + days)
    const next = formatDate(d)
    if (next <= today) setDate(next)
  }

  const totalCalories = entries.reduce((s, e) => s + e.calories_burned, 0)
  const totalMinutes = entries.reduce((s, e) => s + e.duration_min, 0)

  return (
    <div className="max-w-2xl mx-auto p-4 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button onClick={() => shiftDate(-1)} className="p-2 rounded-lg hover:bg-white border border-slate-200 text-slate-500">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-4 h-4">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <p className="font-semibold text-slate-900 text-sm">
            {date === today ? 'Today' : new Date(date + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
          </p>
          <button onClick={() => shiftDate(1)} disabled={date === today} className="p-2 rounded-lg hover:bg-white border border-slate-200 text-slate-500 disabled:opacity-30">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-4 h-4">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-1.5 bg-[#1B72CC] text-white px-3 py-2 rounded-lg text-sm font-semibold hover:bg-[#1558A0] transition-colors"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} className="w-4 h-4">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
          </svg>
          Log Workout
        </button>
      </div>

      {/* Summary cards */}
      {entries.length > 0 && (
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-[#1B72CC] rounded-xl p-4 text-white">
            <p className="text-blue-200 text-xs font-medium">Calories Burned</p>
            <p className="text-3xl font-bold mt-1">{totalCalories.toLocaleString()}</p>
          </div>
          <div className="bg-white border border-slate-200 rounded-xl p-4">
            <p className="text-slate-500 text-xs font-medium">Total Time</p>
            <p className="text-3xl font-bold mt-1 text-slate-900">
              {totalMinutes >= 60 ? `${Math.floor(totalMinutes / 60)}h ${totalMinutes % 60}m` : `${totalMinutes}m`}
            </p>
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="w-8 h-8 border-4 border-[#1B72CC] border-t-transparent rounded-full animate-spin" />
        </div>
      ) : entries.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-5xl mb-3">⚡</p>
          <p className="text-slate-600 font-medium">No workouts logged</p>
          <p className="text-slate-400 text-sm mt-1">Tap Log Workout to add one</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="divide-y divide-slate-100">
            {entries.map((entry) => (
              <div key={entry.id} className="px-4 py-3 flex items-center gap-3">
                <span className="text-2xl">{TYPE_EMOJI[entry.exercise_type] ?? '🏃'}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-900 capitalize">{entry.exercise_type}</p>
                  <div className="flex items-center gap-2 text-xs text-slate-500 mt-0.5">
                    <span>{entry.duration_min} min</span>
                    {entry.distance && <><span>·</span><span>{entry.distance} mi</span></>}
                    {entry.avg_hr && <><span>·</span><span>{entry.avg_hr} bpm avg</span></>}
                    {entry.source === 'garmin' && <span className="bg-slate-100 rounded px-1.5 py-0.5">Garmin</span>}
                  </div>
                  {entry.notes && <p className="text-xs text-slate-400 mt-0.5 italic">{entry.notes}</p>}
                </div>
                <div className="text-right shrink-0">
                  <p className="text-sm font-bold text-orange-500">−{entry.calories_burned}</p>
                  <p className="text-xs text-slate-400">cal</p>
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

      {showModal && <AddWorkoutModal onClose={() => setShowModal(false)} onSaved={load} defaultDate={date} />}
    </div>
  )
}
