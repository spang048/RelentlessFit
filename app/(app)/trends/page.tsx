'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { calculateBaselineBurn, calculateGoalTarget, weightChangePer7Days } from '@/lib/calculations'
import type { UserProfile, FoodEntry, ExerciseEntry, WeightEntry } from '@/types'
import { formatDate } from '@/lib/utils'


function weekStart(date: string): string {
  const d = new Date(date + 'T12:00:00')
  const day = d.getDay()
  d.setDate(d.getDate() - day)
  return formatDate(d)
}

interface WeekData {
  week: string
  avgFood: number
  avgBaseline: number
  avgExercise: number
  avgNet: number
  days: number
}

export default function TrendsPage() {
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [foodEntries, setFoodEntries] = useState<FoodEntry[]>([])
  const [exerciseEntries, setExerciseEntries] = useState<ExerciseEntry[]>([])
  const [weightEntries, setWeightEntries] = useState<WeightEntry[]>([])
  const [loading, setLoading] = useState(true)

  const supabase = createClient()

  const load = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const cutoff = formatDate(new Date(Date.now() - 90 * 24 * 60 * 60 * 1000))

    const [{ data: prof }, { data: food }, { data: exercise }, { data: weights }] = await Promise.all([
      supabase.from('rf_profiles').select('*').eq('user_id', user.id).single(),
      supabase.from('rf_food_entries').select('*').eq('user_id', user.id).gte('logged_at', cutoff),
      supabase.from('rf_exercise_entries').select('*').eq('user_id', user.id).gte('logged_at', cutoff),
      supabase.from('rf_weight_entries').select('*').eq('user_id', user.id).gte('date', cutoff).order('date'),
    ])

    setProfile(prof)
    setFoodEntries(food ?? [])
    setExerciseEntries(exercise ?? [])
    setWeightEntries(weights ?? [])
    setLoading(false)
  }, [supabase])

  useEffect(() => { load() }, [load])

  // Aggregate by day then by week
  const allDates = new Set([
    ...foodEntries.map(e => e.logged_at.split('T')[0]),
    ...exerciseEntries.map(e => e.logged_at.split('T')[0]),
  ])

  const dayMap = new Map<string, { food: number; exercise: number; baseline: number }>()
  for (const date of allDates) {
    const food = foodEntries.filter(e => e.logged_at.startsWith(date)).reduce((s, e) => s + e.calories, 0)
    const exercise = exerciseEntries.filter(e => e.logged_at.startsWith(date)).reduce((s, e) => s + e.calories_burned, 0)
    const recentWeight = weightEntries.filter(w => w.date <= date).slice(-1)[0]?.weight_lb ?? 180
    const baseline = profile ? calculateBaselineBurn(profile, recentWeight) : 0
    dayMap.set(date, { food, exercise, baseline })
  }

  // Group by week
  const weekMap = new Map<string, { foodTotal: number; exerciseTotal: number; baselineTotal: number; days: number }>()
  for (const [date, data] of dayMap.entries()) {
    const week = weekStart(date)
    const existing = weekMap.get(week) ?? { foodTotal: 0, exerciseTotal: 0, baselineTotal: 0, days: 0 }
    weekMap.set(week, {
      foodTotal: existing.foodTotal + data.food,
      exerciseTotal: existing.exerciseTotal + data.exercise,
      baselineTotal: existing.baselineTotal + data.baseline,
      days: existing.days + 1,
    })
  }

  const weeks: WeekData[] = Array.from(weekMap.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(-8)
    .map(([week, data]) => ({
      week,
      avgFood: Math.round(data.foodTotal / data.days),
      avgBaseline: Math.round(data.baselineTotal / data.days),
      avgExercise: Math.round(data.exerciseTotal / data.days),
      avgNet: Math.round((data.foodTotal - data.baselineTotal - data.exerciseTotal) / data.days),
      days: data.days,
    }))

  // Last 14 day averages
  const last14 = formatDate(new Date(Date.now() - 14 * 24 * 60 * 60 * 1000))
  const recentFood = foodEntries.filter(e => e.logged_at >= last14)
  const recentExercise = exerciseEntries.filter(e => e.logged_at >= last14)
  const recentDays = new Set([
    ...recentFood.map(e => e.logged_at.split('T')[0]),
    ...recentExercise.map(e => e.logged_at.split('T')[0]),
  ]).size

  const avg14Food = recentDays > 0 ? Math.round(recentFood.reduce((s, e) => s + e.calories, 0) / recentDays) : null
  const avg14Exercise = recentDays > 0 ? Math.round(recentExercise.reduce((s, e) => s + e.calories_burned, 0) / recentDays) : null
  const recentWeight = weightEntries.slice(-1)[0]?.weight_lb ?? 180
  const avg14Baseline = profile ? calculateBaselineBurn(profile, recentWeight) : null
  const avg14Net = avg14Food !== null && avg14Baseline !== null && avg14Exercise !== null
    ? avg14Food - avg14Baseline - avg14Exercise : null
  const avg14Deficit = avg14Net !== null ? -avg14Net : null

  // Weight trend
  const weightTrend = weightChangePer7Days(weightEntries)
  const estimatedWeightChange = avg14Deficit !== null
    ? (avg14Deficit * 14) / 3500 : null

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-[#1B72CC] border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto p-4 space-y-4">
      <h1 className="text-xl font-bold text-slate-900">Trends</h1>

      {/* Insight cards */}
      <div className="space-y-3">
        {avg14Food !== null && (
          <div className="bg-white border border-slate-200 rounded-xl p-4">
            <p className="text-xs text-slate-500 font-medium uppercase tracking-wide mb-3">Last 14 Days</p>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-slate-500">Avg daily intake</p>
                <p className="text-2xl font-bold text-slate-900">{avg14Food?.toLocaleString()}</p>
                <p className="text-xs text-slate-400">cal/day</p>
              </div>
              <div>
                <p className="text-xs text-slate-500">Avg daily burn</p>
                <p className="text-2xl font-bold text-slate-900">
                  {avg14Baseline !== null && avg14Exercise !== null ? (avg14Baseline + avg14Exercise).toLocaleString() : '—'}
                </p>
                <p className="text-xs text-slate-400">cal/day</p>
              </div>
              <div>
                <p className="text-xs text-slate-500">Avg daily {avg14Deficit && avg14Deficit > 0 ? 'deficit' : 'surplus'}</p>
                <p className={`text-2xl font-bold ${avg14Deficit && avg14Deficit > 0 ? 'text-green-600' : 'text-orange-500'}`}>
                  {avg14Deficit !== null ? avg14Deficit.toLocaleString() : '—'}
                </p>
                <p className="text-xs text-slate-400">cal/day</p>
              </div>
              <div>
                <p className="text-xs text-slate-500">Avg exercise</p>
                <p className="text-2xl font-bold text-slate-900">{avg14Exercise?.toLocaleString() ?? '—'}</p>
                <p className="text-xs text-slate-400">cal/day</p>
              </div>
            </div>
          </div>
        )}

        {/* Weight trend */}
        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <p className="text-xs text-slate-500 font-medium uppercase tracking-wide mb-3">Weight Trend</p>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs text-slate-500">Rate (per week)</p>
              <p className={`text-2xl font-bold ${
                weightTrend === null ? 'text-slate-400' :
                weightTrend < -0.1 ? 'text-green-600' :
                weightTrend > 0.1 ? 'text-red-500' : 'text-slate-900'
              }`}>
                {weightTrend !== null ? `${weightTrend > 0 ? '+' : ''}${weightTrend.toFixed(1)} lb` : '—'}
              </p>
            </div>
            {estimatedWeightChange !== null && (
              <div>
                <p className="text-xs text-slate-500">Est. 14d change</p>
                <p className={`text-2xl font-bold ${estimatedWeightChange < 0 ? 'text-green-600' : 'text-orange-500'}`}>
                  {estimatedWeightChange > 0 ? '+' : ''}{estimatedWeightChange.toFixed(1)} lb
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Weekly table */}
      {weeks.length > 0 ? (
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-100">
            <p className="text-sm font-semibold text-slate-900">Weekly Averages</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 text-xs text-slate-500 uppercase tracking-wide">
                  <th className="px-4 py-2 text-left">Week</th>
                  <th className="px-4 py-2 text-right">Eaten</th>
                  <th className="px-4 py-2 text-right">Baseline</th>
                  <th className="px-4 py-2 text-right">Exercise</th>
                  <th className="px-4 py-2 text-right">Net/day</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {weeks.map((week) => (
                  <tr key={week.week} className="hover:bg-slate-50">
                    <td className="px-4 py-2.5 text-slate-700 whitespace-nowrap">
                      {new Date(week.week + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                      <span className="text-slate-400 text-xs ml-1">({week.days}d)</span>
                    </td>
                    <td className="px-4 py-2.5 text-right font-medium text-slate-900">{week.avgFood.toLocaleString()}</td>
                    <td className="px-4 py-2.5 text-right text-slate-600">{week.avgBaseline.toLocaleString()}</td>
                    <td className="px-4 py-2.5 text-right text-orange-500">{week.avgExercise.toLocaleString()}</td>
                    <td className={`px-4 py-2.5 text-right font-semibold ${
                      week.avgNet < -50 ? 'text-green-600' :
                      week.avgNet > 50 ? 'text-red-500' : 'text-slate-900'
                    }`}>
                      {week.avgNet > 0 ? '+' : ''}{week.avgNet.toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="text-center py-12">
          <p className="text-5xl mb-3">📈</p>
          <p className="text-slate-600 font-medium">Not enough data yet</p>
          <p className="text-slate-400 text-sm mt-1">Log food and workouts for a few days to see trends</p>
        </div>
      )}
    </div>
  )
}
