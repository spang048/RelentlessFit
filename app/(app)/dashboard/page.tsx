'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { calculateBaselineBurn, calculateGoalTarget, calculateNet, getNetStatus } from '@/lib/calculations'
import AddFoodModal from '@/components/AddFoodModal'
import AddWorkoutModal from '@/components/AddWorkoutModal'
import AddWeightModal from '@/components/AddWeightModal'
import type { UserProfile, FoodEntry, ExerciseEntry, WeightEntry } from '@/types'

function formatDate(d: Date): string {
  return d.toISOString().split('T')[0]
}

function isSameDay(isoString: string, date: string): boolean {
  return isoString.startsWith(date)
}

export default function DashboardPage() {
  const today = formatDate(new Date())
  const [date, setDate] = useState(today)
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [foodEntries, setFoodEntries] = useState<FoodEntry[]>([])
  const [exerciseEntries, setExerciseEntries] = useState<ExerciseEntry[]>([])
  const [todayWeight, setTodayWeight] = useState<WeightEntry | null>(null)
  const [recentWeights, setRecentWeights] = useState<WeightEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState<'food' | 'workout' | 'weight' | null>(null)

  const supabase = createClient()

  const load = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { window.location.href = '/login'; return }

    const [{ data: prof }, { data: food }, { data: exercise }, { data: weights }] = await Promise.all([
      supabase.from('rf_profiles').select('*').eq('user_id', user.id).single(),
      supabase.from('rf_food_entries').select('*').eq('user_id', user.id).gte('logged_at', date + 'T00:00:00').lte('logged_at', date + 'T23:59:59'),
      supabase.from('rf_exercise_entries').select('*').eq('user_id', user.id).gte('logged_at', date + 'T00:00:00').lte('logged_at', date + 'T23:59:59'),
      supabase.from('rf_weight_entries').select('*').eq('user_id', user.id).gte('date', formatDate(new Date(Date.now() - 7 * 24 * 60 * 60 * 1000))).order('date', { ascending: false }),
    ])

    setProfile(prof)
    setFoodEntries(food ?? [])
    setExerciseEntries(exercise ?? [])
    const ws = (weights ?? []) as WeightEntry[]
    setTodayWeight(ws.find(w => w.date === date) ?? null)
    setRecentWeights(ws)
    setLoading(false)
  }, [date, supabase])

  useEffect(() => { load() }, [load])

  const foodCalories = foodEntries.reduce((s, e) => s + e.calories, 0)
  const exerciseCalories = exerciseEntries.reduce((s, e) => s + e.calories_burned, 0)
  const currentWeightLb = todayWeight?.weight_lb ?? recentWeights[0]?.weight_lb ?? 180
  const baseline = profile ? calculateBaselineBurn(profile, currentWeightLb) : 0
  const goalTarget = profile ? calculateGoalTarget(profile, currentWeightLb) : 2000
  const net = calculateNet(foodCalories, baseline, exerciseCalories)
  const totalBurn = baseline + exerciseCalories
  const status = getNetStatus(net, goalTarget - baseline - exerciseCalories)

  // 7-day avg weight
  const avgWeight = recentWeights.length > 0
    ? recentWeights.reduce((s, w) => s + w.weight_lb, 0) / recentWeights.length
    : null

  // Net progress vs goal (negative net = deficit = good for loss)
  const goalDiff = net - (goalTarget - baseline - exerciseCalories)

  const netColor = Math.abs(goalDiff) <= 100 ? 'text-green-600' :
    goalDiff > 100 ? 'text-red-600' : 'text-blue-600'

  const isToday = date === today

  function shiftDate(days: number) {
    const d = new Date(date)
    d.setDate(d.getDate() + days)
    const next = formatDate(d)
    if (next <= today) setDate(next)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-[#1B72CC] border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto p-4 space-y-4">
      {/* Date nav */}
      <div className="flex items-center justify-between">
        <button onClick={() => shiftDate(-1)} className="p-2 rounded-lg hover:bg-white border border-slate-200 text-slate-500">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-5 h-5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <div className="text-center">
          <p className="font-semibold text-slate-900">
            {isToday ? 'Today' : new Date(date + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
          </p>
          <p className="text-xs text-slate-500">{new Date(date + 'T12:00:00').toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</p>
        </div>
        <button onClick={() => shiftDate(1)} disabled={isToday} className="p-2 rounded-lg hover:bg-white border border-slate-200 text-slate-500 disabled:opacity-30">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-5 h-5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>

      {/* Net calories hero card */}
      <div className="bg-[#1B72CC] rounded-2xl p-5 text-white">
        <div className="flex items-start justify-between mb-4">
          <div>
            <p className="text-blue-200 text-sm font-medium">Net Calories</p>
            <p className={`text-5xl font-bold mt-1 ${net > 0 ? 'text-white' : 'text-white'}`}>
              {net > 0 ? '+' : ''}{net.toLocaleString()}
            </p>
            <p className="text-blue-200 text-sm mt-1">
              Goal: {(goalTarget - baseline - exerciseCalories) > 0 ? '+' : ''}{(goalTarget - baseline - exerciseCalories).toLocaleString()} &nbsp;·&nbsp; {status}
            </p>
          </div>
          <div className="text-right">
            <p className="text-blue-200 text-xs">Weight</p>
            <p className="text-2xl font-bold">{currentWeightLb.toFixed(1)}</p>
            <p className="text-blue-200 text-xs">lbs</p>
            {avgWeight && (
              <p className="text-blue-200 text-xs mt-1">7d avg: {avgWeight.toFixed(1)}</p>
            )}
          </div>
        </div>

        {/* Calorie breakdown */}
        <div className="grid grid-cols-3 gap-3 mt-2">
          <div className="bg-white/10 rounded-xl p-3 text-center">
            <p className="text-blue-200 text-xs">Eaten</p>
            <p className="text-xl font-bold">{foodCalories.toLocaleString()}</p>
          </div>
          <div className="bg-white/10 rounded-xl p-3 text-center">
            <p className="text-blue-200 text-xs">Baseline</p>
            <p className="text-xl font-bold">{baseline.toLocaleString()}</p>
          </div>
          <div className="bg-white/10 rounded-xl p-3 text-center">
            <p className="text-blue-200 text-xs">Exercise</p>
            <p className="text-xl font-bold">{exerciseCalories.toLocaleString()}</p>
          </div>
        </div>

        {/* Progress bar */}
        <div className="mt-4">
          <div className="flex justify-between text-xs text-blue-200 mb-1">
            <span>Food eaten</span>
            <span>{foodCalories} / {goalTarget} cal target</span>
          </div>
          <div className="h-2 bg-white/20 rounded-full overflow-hidden">
            <div
              className="h-full bg-white rounded-full transition-all"
              style={{ width: `${Math.min(100, (foodCalories / Math.max(goalTarget, 1)) * 100)}%` }}
            />
          </div>
        </div>
      </div>

      {/* Formula card */}
      <div className="bg-white rounded-xl border border-slate-200 p-4">
        <p className="text-xs text-slate-500 font-medium uppercase tracking-wide mb-2">Daily Equation</p>
        <div className="flex items-center gap-2 text-sm font-mono flex-wrap">
          <span className="font-semibold text-slate-900">{foodCalories}</span>
          <span className="text-slate-400">eaten</span>
          <span className="text-slate-400">−</span>
          <span className="font-semibold text-slate-900">{totalBurn}</span>
          <span className="text-slate-400">burned</span>
          <span className="text-slate-400">=</span>
          <span className={`font-bold text-base ${net > 0 ? 'text-orange-500' : 'text-green-600'}`}>
            {net > 0 ? '+' : ''}{net} net
          </span>
        </div>
        <p className="text-xs text-slate-400 mt-1">Burned = {baseline} baseline + {exerciseCalories} exercise</p>
      </div>

      {/* Quick actions */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Add Food', emoji: '🍽️', action: () => setModal('food') },
          { label: 'Log Workout', emoji: '⚡', action: () => setModal('workout') },
          { label: 'Log Weight', emoji: '⚖️', action: () => setModal('weight') },
        ].map((btn) => (
          <button
            key={btn.label}
            onClick={btn.action}
            className="bg-white border border-slate-200 rounded-xl p-4 flex flex-col items-center gap-2 hover:border-[#1B72CC] hover:bg-[#EBF3FB] transition-colors"
          >
            <span className="text-2xl">{btn.emoji}</span>
            <span className="text-xs font-semibold text-slate-700">{btn.label}</span>
          </button>
        ))}
      </div>

      {/* Today's food */}
      {foodEntries.length > 0 && (
        <div className="bg-white rounded-xl border border-slate-200">
          <div className="px-4 py-3 border-b border-slate-100">
            <p className="font-semibold text-slate-900 text-sm">Food Today</p>
          </div>
          <div className="divide-y divide-slate-100">
            {foodEntries.map((entry) => (
              <div key={entry.id} className="px-4 py-3 flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-900">{entry.food_name}</p>
                  <p className="text-xs text-slate-500 capitalize">{entry.meal_type}{entry.quantity_text ? ` · ${entry.quantity_text}` : ''}</p>
                </div>
                <span className="text-sm font-semibold text-slate-900">{entry.calories}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Today's workouts */}
      {exerciseEntries.length > 0 && (
        <div className="bg-white rounded-xl border border-slate-200">
          <div className="px-4 py-3 border-b border-slate-100">
            <p className="font-semibold text-slate-900 text-sm">Workouts Today</p>
          </div>
          <div className="divide-y divide-slate-100">
            {exerciseEntries.map((entry) => (
              <div key={entry.id} className="px-4 py-3 flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-900 capitalize">{entry.exercise_type}</p>
                  <p className="text-xs text-slate-500">{entry.duration_min} min{entry.distance ? ` · ${entry.distance} mi` : ''}</p>
                </div>
                <span className="text-sm font-semibold text-orange-500">−{entry.calories_burned}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {!profile && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
          <p className="text-sm font-medium text-amber-800">Set up your profile to get accurate calorie targets.</p>
          <a href="/profile" className="text-sm text-[#1B72CC] font-semibold mt-1 block">Go to Settings →</a>
        </div>
      )}

      {modal === 'food' && <AddFoodModal onClose={() => setModal(null)} onSaved={load} defaultDate={date} />}
      {modal === 'workout' && <AddWorkoutModal onClose={() => setModal(null)} onSaved={load} defaultDate={date} />}
      {modal === 'weight' && <AddWeightModal onClose={() => setModal(null)} onSaved={load} defaultDate={date} />}
    </div>
  )
}
