'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import AddFoodModal from '@/components/AddFoodModal'
import type { FoodEntry, MealType } from '@/types'
import { formatDate } from '@/lib/utils'

const MEAL_ORDER: MealType[] = ['breakfast', 'lunch', 'dinner', 'snack']
const MEAL_LABELS: Record<MealType, string> = {
  breakfast: 'Breakfast',
  lunch: 'Lunch',
  dinner: 'Dinner',
  snack: 'Snack',
}


export default function FoodPage() {
  const today = formatDate(new Date())
  const [date, setDate] = useState(today)
  const [entries, setEntries] = useState<FoodEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [deleting, setDeleting] = useState<string | null>(null)

  const supabase = createClient()

  const load = useCallback(async () => {
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { data } = await supabase
      .from('rf_food_entries')
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
    await supabase.from('rf_food_entries').delete().eq('id', id)
    setDeleting(null)
    load()
  }

  function shiftDate(days: number) {
    const d = new Date(date)
    d.setDate(d.getDate() + days)
    const next = formatDate(d)
    if (next <= today) setDate(next)
  }

  const totalCalories = entries.reduce((s, e) => s + e.calories, 0)
  const byMeal = MEAL_ORDER.reduce((acc, meal) => {
    acc[meal] = entries.filter(e => e.meal_type === meal)
    return acc
  }, {} as Record<MealType, FoodEntry[]>)

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
        <div className="flex items-center gap-3">
          <span className="text-sm font-bold text-[#1B72CC]">{totalCalories.toLocaleString()} cal</span>
          <button
            onClick={() => setShowModal(true)}
            className="flex items-center gap-1.5 bg-[#1B72CC] text-white px-3 py-2 rounded-lg text-sm font-semibold hover:bg-[#1558A0] transition-colors"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} className="w-4 h-4">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            Add Food
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="w-8 h-8 border-4 border-[#1B72CC] border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <>
          {MEAL_ORDER.map((meal) => {
            const mealEntries = byMeal[meal]
            const mealCalories = mealEntries.reduce((s, e) => s + e.calories, 0)
            return (
              <div key={meal} className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                <div className="flex items-center justify-between px-4 py-3 bg-slate-50 border-b border-slate-100">
                  <p className="font-semibold text-slate-700 text-sm">{MEAL_LABELS[meal]}</p>
                  {mealCalories > 0 && (
                    <span className="text-sm font-bold text-slate-900">{mealCalories} cal</span>
                  )}
                </div>
                {mealEntries.length === 0 ? (
                  <div className="px-4 py-3 text-sm text-slate-400 italic">Nothing logged yet</div>
                ) : (
                  <div className="divide-y divide-slate-100">
                    {mealEntries.map((entry) => (
                      <div key={entry.id} className="px-4 py-3 flex items-center gap-3">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-slate-900 truncate">{entry.food_name}</p>
                          {entry.quantity_text && (
                            <p className="text-xs text-slate-500">{entry.quantity_text}</p>
                          )}
                        </div>
                        <span className="text-sm font-semibold text-slate-900 shrink-0">{entry.calories} cal</span>
                        <button
                          onClick={() => deleteEntry(entry.id)}
                          disabled={deleting === entry.id}
                          className="p-1.5 rounded hover:bg-red-50 text-slate-400 hover:text-red-500 transition-colors shrink-0"
                        >
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-4 h-4">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )
          })}

          {entries.length === 0 && (
            <div className="text-center py-12">
              <p className="text-4xl mb-3">🍽️</p>
              <p className="text-slate-600 font-medium">No food logged yet</p>
              <p className="text-slate-400 text-sm mt-1">Tap Add Food to get started</p>
            </div>
          )}
        </>
      )}

      {showModal && <AddFoodModal onClose={() => setShowModal(false)} onSaved={load} defaultDate={date} />}
    </div>
  )
}
