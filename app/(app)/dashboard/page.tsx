'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { calculateBaselineBurn, calculateGoalTarget } from '@/lib/calculations'
import AddFoodModal from '@/components/AddFoodModal'
import AddWorkoutModal from '@/components/AddWorkoutModal'
import AddWeightModal from '@/components/AddWeightModal'
import type { UserProfile, FoodEntry, ExerciseEntry, WeightEntry } from '@/types'
import { formatDate } from '@/lib/utils'

const RING_R = 80
const CIRCUMFERENCE = 2 * Math.PI * RING_R   // ≈ 502.65

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
      supabase.from('rf_food_entries').select('*').eq('user_id', user.id)
        .gte('logged_at', date + 'T00:00:00').lte('logged_at', date + 'T23:59:59'),
      supabase.from('rf_exercise_entries').select('*').eq('user_id', user.id)
        .gte('logged_at', date + 'T00:00:00').lte('logged_at', date + 'T23:59:59'),
      supabase.from('rf_weight_entries').select('*').eq('user_id', user.id)
        .gte('date', formatDate(new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)))
        .order('date', { ascending: false }),
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

  // ── Calorie numbers ──────────────────────────────────────────────────────────
  const foodCalories    = foodEntries.reduce((s, e) => s + e.calories, 0)
  const exerciseCalories = exerciseEntries.reduce((s, e) => s + e.calories_burned, 0)
  const currentWeightLb = todayWeight?.weight_lb ?? recentWeights[0]?.weight_lb ?? 180
  const goalTarget      = profile ? calculateGoalTarget(profile, currentWeightLb) : 2000

  // Remaining = Goal − Food + Exercise
  const remaining = goalTarget - foodCalories + exerciseCalories
  const isOver    = remaining < 0

  // Ring: blue arc represents the remaining fraction of the goal
  const remainingRatio = goalTarget > 0
    ? Math.max(0, Math.min(1, remaining / goalTarget))
    : 0
  const dashOffset = CIRCUMFERENCE * (1 - remainingRatio)

  // 7-day avg weight
  const avgWeight = recentWeights.length > 0
    ? recentWeights.reduce((s, w) => s + w.weight_lb, 0) / recentWeights.length
    : null

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

      {/* ── Date nav ──────────────────────────────────────────────────────────── */}
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
          <p className="text-xs text-slate-500">
            {new Date(date + 'T12:00:00').toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
          </p>
        </div>
        <button onClick={() => shiftDate(1)} disabled={isToday} className="p-2 rounded-lg hover:bg-white border border-slate-200 text-slate-500 disabled:opacity-30">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-5 h-5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>

      {/* ── Calories ring card ────────────────────────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5">
        <h2 className="text-2xl font-bold text-slate-900 leading-tight">Calories</h2>
        <p className="text-sm text-slate-400 mb-5">Remaining = Goal − Food + Exercise</p>

        <div className="flex items-center gap-5">
          {/* SVG ring */}
          <div className="relative flex-shrink-0 w-40 h-40">
            <svg viewBox="0 0 200 200" className="w-full h-full">
              {/* Background ring */}
              <circle
                cx="100" cy="100" r={RING_R}
                fill="none"
                stroke="#E2E8F0"
                strokeWidth="20"
              />
              {/* Progress arc — starts at 12 o'clock via rotate(-90) */}
              <circle
                cx="100" cy="100" r={RING_R}
                fill="none"
                stroke={isOver ? '#EF4444' : '#1B72CC'}
                strokeWidth="20"
                strokeLinecap="round"
                strokeDasharray={`${CIRCUMFERENCE} ${CIRCUMFERENCE}`}
                strokeDashoffset={dashOffset}
                transform="rotate(-90 100 100)"
                style={{ transition: 'stroke-dashoffset 0.4s ease' }}
              />
            </svg>
            {/* Center label */}
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <p className={`text-3xl font-bold leading-none ${isOver ? 'text-red-500' : 'text-slate-900'}`}>
                {Math.abs(remaining).toLocaleString()}
              </p>
              <p className="text-xs text-slate-500 mt-1">{isOver ? 'Over' : 'Remaining'}</p>
            </div>
          </div>

          {/* Stats column */}
          <div className="flex-1 space-y-4 min-w-0">
            {/* Base Goal */}
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 flex items-center justify-center flex-shrink-0">
                <svg viewBox="0 0 24 24" fill="none" stroke="#6B7280" strokeWidth={2} className="w-5 h-5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 21V5a2 2 0 012-2h14a2 2 0 012 2v16M3 21h18M12 3v18M7 8h2m0 0h2M7 12h2m0 0h2M7 16h2m0 0h2m2-8h2M13 12h2m0 0h0M13 16h2" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 21V5l8-2 8 2v16" />
                </svg>
              </div>
              <div className="min-w-0">
                <p className="text-xs text-slate-500">Base Goal</p>
                <p className="text-xl font-bold text-slate-900 leading-tight">{goalTarget.toLocaleString()}</p>
              </div>
            </div>

            {/* Food */}
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 flex items-center justify-center flex-shrink-0">
                <svg viewBox="0 0 24 24" fill="none" stroke="#1B72CC" strokeWidth={2} className="w-5 h-5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 2v20M8 6c0 0-2 1-2 4s2 4 2 4M16 6c0 0 2 1 2 4s-2 4-2 4" />
                </svg>
              </div>
              <div className="min-w-0">
                <p className="text-xs text-slate-500">Food</p>
                <p className="text-xl font-bold text-slate-900 leading-tight">{foodCalories.toLocaleString()}</p>
              </div>
            </div>

            {/* Exercise */}
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 flex items-center justify-center flex-shrink-0">
                <svg viewBox="0 0 24 24" fill="none" stroke="#F97316" strokeWidth={2} className="w-5 h-5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 18.657A8 8 0 016.343 7.343M9 10l1.5 1.5M15 10l-1.5 1.5M12 21a9 9 0 110-18 9 9 0 010 18z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.5 2-1.5 5 0 6" />
                </svg>
              </div>
              <div className="min-w-0">
                <p className="text-xs text-slate-500">Exercise</p>
                <p className="text-xl font-bold text-slate-900 leading-tight">{exerciseCalories.toLocaleString()}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Weight pill */}
        {currentWeightLb > 0 && (
          <div className="mt-4 pt-4 border-t border-slate-100 flex items-center justify-between text-sm text-slate-500">
            <span>Current weight</span>
            <span className="font-semibold text-slate-700">
              {currentWeightLb.toFixed(1)} lb
              {avgWeight ? <span className="font-normal text-slate-400 ml-2">· 7d avg {avgWeight.toFixed(1)}</span> : null}
            </span>
          </div>
        )}
      </div>

      {/* ── No-profile nudge ─────────────────────────────────────────────────── */}
      {!profile && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
          <p className="text-sm font-medium text-amber-800">Set up your profile to get accurate calorie targets.</p>
          <a href="/profile" className="text-sm text-[#1B72CC] font-semibold mt-1 block">Go to Settings →</a>
        </div>
      )}

      {/* ── Quick actions ─────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Add Food',     emoji: '🍽️', action: () => setModal('food') },
          { label: 'Log Workout',  emoji: '⚡',  action: () => setModal('workout') },
          { label: 'Log Weight',   emoji: '⚖️',  action: () => setModal('weight') },
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

      {/* ── Today's food ─────────────────────────────────────────────────────── */}
      {foodEntries.length > 0 && (
        <div className="bg-white rounded-xl border border-slate-200">
          <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
            <p className="font-semibold text-slate-900 text-sm">Food Today</p>
            <p className="text-sm font-semibold text-slate-500">{foodCalories.toLocaleString()} cal</p>
          </div>
          <div className="divide-y divide-slate-100">
            {foodEntries.map((entry) => (
              <div key={entry.id} className="px-4 py-3 flex items-center justify-between">
                <div className="min-w-0 mr-3">
                  <p className="text-sm font-medium text-slate-900 truncate">{entry.food_name}</p>
                  <p className="text-xs text-slate-500 capitalize">
                    {entry.meal_type}{entry.quantity_text ? ` · ${entry.quantity_text}` : ''}
                  </p>
                </div>
                <span className="text-sm font-semibold text-slate-900 flex-shrink-0">{entry.calories}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Today's workouts ─────────────────────────────────────────────────── */}
      {exerciseEntries.length > 0 && (
        <div className="bg-white rounded-xl border border-slate-200">
          <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
            <p className="font-semibold text-slate-900 text-sm">Workouts Today</p>
            <p className="text-sm font-semibold text-orange-500">+{exerciseCalories.toLocaleString()} cal</p>
          </div>
          <div className="divide-y divide-slate-100">
            {exerciseEntries.map((entry) => (
              <div key={entry.id} className="px-4 py-3 flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-900 capitalize">{entry.exercise_type}</p>
                  <p className="text-xs text-slate-500">
                    {entry.duration_min} min{entry.distance ? ` · ${entry.distance} mi` : ''}
                  </p>
                </div>
                <span className="text-sm font-semibold text-orange-500">+{entry.calories_burned}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Modals ───────────────────────────────────────────────────────────── */}
      {modal === 'food'    && <AddFoodModal    onClose={() => setModal(null)} onSaved={load} defaultDate={date} />}
      {modal === 'workout' && <AddWorkoutModal onClose={() => setModal(null)} onSaved={load} defaultDate={date} />}
      {modal === 'weight'  && <AddWeightModal  onClose={() => setModal(null)} onSaved={load} defaultDate={date} />}
    </div>
  )
}
