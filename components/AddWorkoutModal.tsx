'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { ExerciseType } from '@/types'

interface Props {
  onClose: () => void
  onSaved: () => void
  defaultDate?: string
}

const EXERCISE_TYPES: { value: ExerciseType; label: string; emoji: string }[] = [
  { value: 'run', label: 'Run', emoji: '🏃' },
  { value: 'walk', label: 'Walk', emoji: '🚶' },
  { value: 'bike', label: 'Bike', emoji: '🚴' },
  { value: 'strength', label: 'Strength', emoji: '💪' },
  { value: 'ski', label: 'Ski', emoji: '⛷️' },
  { value: 'hike', label: 'Hike', emoji: '🥾' },
  { value: 'other', label: 'Other', emoji: '🏋️' },
]

export default function AddWorkoutModal({ onClose, onSaved, defaultDate }: Props) {
  const [exerciseType, setExerciseType] = useState<ExerciseType>('run')
  const [duration, setDuration] = useState('')
  const [calories, setCalories] = useState('')
  const [distance, setDistance] = useState('')
  const [avgHr, setAvgHr] = useState('')
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const supabase = createClient()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!duration || !calories) return
    setSaving(true)
    setError('')

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setError('Not logged in'); setSaving(false); return }

    const loggedAt = defaultDate
      ? new Date(defaultDate + 'T12:00:00').toISOString()
      : new Date().toISOString()

    const { error: err } = await supabase.from('rf_exercise_entries').insert({
      user_id: user.id,
      logged_at: loggedAt,
      exercise_type: exerciseType,
      duration_min: parseInt(duration),
      calories_burned: parseInt(calories),
      distance: distance ? parseFloat(distance) : null,
      avg_hr: avgHr ? parseInt(avgHr) : null,
      source: 'manual',
      notes: notes.trim() || null,
    })

    if (err) { setError(err.message); setSaving(false); return }
    onSaved()
    onClose()
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-end md:items-center justify-center p-0 md:p-4">
      <div className="bg-white w-full md:max-w-md md:rounded-2xl rounded-t-2xl shadow-xl">
        <div className="flex items-center justify-between p-4 border-b border-slate-100">
          <h2 className="text-lg font-semibold text-slate-900">Log Workout</h2>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-slate-100 text-slate-500">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-5 h-5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          {/* Exercise type */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Type</label>
            <div className="grid grid-cols-4 gap-2">
              {EXERCISE_TYPES.map((ex) => (
                <button
                  key={ex.value}
                  type="button"
                  onClick={() => setExerciseType(ex.value)}
                  className={`flex flex-col items-center py-2 px-1 rounded-lg text-xs font-medium border transition-colors ${
                    exerciseType === ex.value
                      ? 'bg-[#1B72CC] text-white border-[#1B72CC]'
                      : 'bg-white text-slate-600 border-slate-200 hover:border-[#1B72CC]'
                  }`}
                >
                  <span className="text-lg mb-0.5">{ex.emoji}</span>
                  {ex.label}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Duration (min)</label>
              <input
                type="number"
                value={duration}
                onChange={(e) => setDuration(e.target.value)}
                placeholder="30"
                min="1"
                required
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1B72CC]"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Calories burned</label>
              <input
                type="number"
                value={calories}
                onChange={(e) => setCalories(e.target.value)}
                placeholder="300"
                min="0"
                required
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1B72CC]"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Distance <span className="text-slate-400 font-normal">(mi)</span>
              </label>
              <input
                type="number"
                value={distance}
                onChange={(e) => setDistance(e.target.value)}
                placeholder="3.1"
                step="0.01"
                min="0"
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1B72CC]"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Avg HR <span className="text-slate-400 font-normal">(bpm)</span>
              </label>
              <input
                type="number"
                value={avgHr}
                onChange={(e) => setAvgHr(e.target.value)}
                placeholder="145"
                min="40"
                max="220"
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1B72CC]"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Notes <span className="text-slate-400 font-normal">(optional)</span>
            </label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="How did it feel?"
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1B72CC]"
            />
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <button
            type="submit"
            disabled={saving || !duration || !calories}
            className="w-full py-3 bg-[#1B72CC] text-white font-semibold rounded-xl disabled:opacity-50 hover:bg-[#1558A0] transition-colors"
          >
            {saving ? 'Saving...' : 'Log Workout'}
          </button>
        </form>
      </div>
    </div>
  )
}
