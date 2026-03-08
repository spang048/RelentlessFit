'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { calculateBaselineBurn, calculateGoalTarget } from '@/lib/calculations'
import type { UserProfile, ActivityLevel, GoalType, Sex } from '@/types'

const ACTIVITY_OPTIONS: { value: ActivityLevel; label: string; desc: string }[] = [
  { value: 'sedentary', label: 'Sedentary', desc: 'Desk job, little movement' },
  { value: 'lightly_active', label: 'Lightly Active', desc: 'Some walking, light work' },
  { value: 'moderately_active', label: 'Moderately Active', desc: 'Regular movement, active job' },
  { value: 'very_active', label: 'Very Active', desc: 'Physical job or very active lifestyle' },
]

const GOAL_OPTIONS: { value: GoalType; label: string; desc: string }[] = [
  { value: 'maintain', label: 'Maintain', desc: 'Keep current weight' },
  { value: 'lose_slow', label: 'Lose Slowly', desc: '~0.5 lb/week deficit' },
  { value: 'lose_moderate', label: 'Lose Moderate', desc: '~1 lb/week deficit' },
  { value: 'gain_slow', label: 'Gain Slowly', desc: '~0.5 lb/week surplus' },
]

export default function ProfilePage() {
  const [profile, setProfile] = useState<Partial<UserProfile>>({
    sex: 'male',
    activity_level: 'lightly_active',
    goal_type: 'maintain',
  })
  const [currentWeightLb, setCurrentWeightLb] = useState<number>(180)
  const [heightFt, setHeightFt] = useState('5')
  const [heightIn, setHeightIn] = useState('11')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')

  const supabase = createClient()

  const load = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const [{ data: prof }, { data: latestWeight }] = await Promise.all([
      supabase.from('rf_profiles').select('*').eq('user_id', user.id).single(),
      supabase.from('rf_weight_entries').select('weight_lb').eq('user_id', user.id).order('date', { ascending: false }).limit(1).single(),
    ])

    if (prof) {
      setProfile(prof)
      const totalInches = prof.height_cm / 2.54
      setHeightFt(String(Math.floor(totalInches / 12)))
      setHeightIn(String(Math.round(totalInches % 12)))
    }
    if (latestWeight) setCurrentWeightLb(latestWeight.weight_lb)
    setLoading(false)
  }, [supabase])

  useEffect(() => { load() }, [load])

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError('')

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const heightCm = (parseInt(heightFt) * 12 + parseInt(heightIn)) * 2.54

    const payload = {
      user_id: user.id,
      name: profile.name ?? '',
      sex: profile.sex ?? 'male',
      birth_date: profile.birth_date ?? '1990-01-01',
      height_cm: heightCm,
      activity_level: profile.activity_level ?? 'lightly_active',
      goal_type: profile.goal_type ?? 'maintain',
      goal_weight_lb: profile.goal_weight_lb ?? null,
    }

    const { error: err } = await supabase.from('rf_profiles').upsert(payload, { onConflict: 'user_id' })
    if (err) { setError(err.message); setSaving(false); return }

    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
    setSaving(false)
    load()
  }

  async function handleSignOut() {
    await supabase.auth.signOut()
    window.location.href = '/login'
  }

  const heightCm = (parseInt(heightFt || '0') * 12 + parseInt(heightIn || '0')) * 2.54
  const previewProfile = { ...profile, height_cm: heightCm } as UserProfile
  const previewBaseline = profile.birth_date && heightCm > 0
    ? calculateBaselineBurn(previewProfile, currentWeightLb) : null
  const previewGoal = previewBaseline
    ? calculateGoalTarget(previewProfile, currentWeightLb) : null

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-[#1B72CC] border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto p-4 space-y-4">
      <h1 className="text-xl font-bold text-slate-900">Profile & Settings</h1>

      {/* Calorie estimate preview */}
      {previewBaseline && (
        <div className="bg-[#1B72CC] rounded-xl p-4 text-white">
          <p className="text-blue-200 text-xs font-medium mb-3">Your Calorie Targets</p>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-blue-200 text-xs">Baseline burn/day</p>
              <p className="text-2xl font-bold">{previewBaseline.toLocaleString()}</p>
            </div>
            <div>
              <p className="text-blue-200 text-xs">Goal food target</p>
              <p className="text-2xl font-bold">{previewGoal?.toLocaleString() ?? '—'}</p>
            </div>
          </div>
          <p className="text-blue-200 text-xs mt-2">Based on Mifflin-St Jeor + activity factor</p>
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-4">
        {/* Name */}
        <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-4">
          <p className="text-sm font-semibold text-slate-900">Personal Info</p>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Name</label>
            <input
              type="text"
              value={profile.name ?? ''}
              onChange={(e) => setProfile({ ...profile, name: e.target.value })}
              placeholder="Your name"
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1B72CC]"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Sex</label>
              <div className="flex gap-2">
                {(['male', 'female'] as Sex[]).map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setProfile({ ...profile, sex: s })}
                    className={`flex-1 py-2 rounded-lg text-sm font-medium border transition-colors capitalize ${
                      profile.sex === s
                        ? 'bg-[#1B72CC] text-white border-[#1B72CC]'
                        : 'bg-white text-slate-600 border-slate-200'
                    }`}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Birth date</label>
              <input
                type="date"
                value={profile.birth_date ?? ''}
                onChange={(e) => setProfile({ ...profile, birth_date: e.target.value })}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1B72CC]"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Height</label>
            <div className="flex gap-2">
              <div className="flex items-center gap-1 flex-1">
                <input
                  type="number"
                  value={heightFt}
                  onChange={(e) => setHeightFt(e.target.value)}
                  min="4" max="7"
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1B72CC]"
                />
                <span className="text-sm text-slate-500 whitespace-nowrap">ft</span>
              </div>
              <div className="flex items-center gap-1 flex-1">
                <input
                  type="number"
                  value={heightIn}
                  onChange={(e) => setHeightIn(e.target.value)}
                  min="0" max="11"
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1B72CC]"
                />
                <span className="text-sm text-slate-500 whitespace-nowrap">in</span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Goal weight (lbs)</label>
              <input
                type="number"
                value={profile.goal_weight_lb ?? ''}
                onChange={(e) => setProfile({ ...profile, goal_weight_lb: e.target.value ? parseFloat(e.target.value) : null })}
                placeholder="175"
                step="0.1"
                min="80"
                max="500"
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1B72CC]"
              />
            </div>
          </div>
        </div>

        {/* Activity level */}
        <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-3">
          <p className="text-sm font-semibold text-slate-900">Activity Level</p>
          <p className="text-xs text-slate-500">Normal daily life, not counting workouts</p>
          <div className="space-y-2">
            {ACTIVITY_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setProfile({ ...profile, activity_level: opt.value })}
                className={`w-full flex items-center gap-3 p-3 rounded-xl border text-left transition-colors ${
                  profile.activity_level === opt.value
                    ? 'border-[#1B72CC] bg-[#EBF3FB]'
                    : 'border-slate-200 hover:border-slate-300'
                }`}
              >
                <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 ${
                  profile.activity_level === opt.value ? 'border-[#1B72CC]' : 'border-slate-300'
                }`}>
                  {profile.activity_level === opt.value && (
                    <div className="w-2 h-2 rounded-full bg-[#1B72CC]" />
                  )}
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-900">{opt.label}</p>
                  <p className="text-xs text-slate-500">{opt.desc}</p>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Goal */}
        <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-3">
          <p className="text-sm font-semibold text-slate-900">Goal</p>
          <div className="space-y-2">
            {GOAL_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setProfile({ ...profile, goal_type: opt.value })}
                className={`w-full flex items-center gap-3 p-3 rounded-xl border text-left transition-colors ${
                  profile.goal_type === opt.value
                    ? 'border-[#1B72CC] bg-[#EBF3FB]'
                    : 'border-slate-200 hover:border-slate-300'
                }`}
              >
                <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 ${
                  profile.goal_type === opt.value ? 'border-[#1B72CC]' : 'border-slate-300'
                }`}>
                  {profile.goal_type === opt.value && (
                    <div className="w-2 h-2 rounded-full bg-[#1B72CC]" />
                  )}
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-900">{opt.label}</p>
                  <p className="text-xs text-slate-500">{opt.desc}</p>
                </div>
              </button>
            ))}
          </div>
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <button
          type="submit"
          disabled={saving}
          className={`w-full py-3 font-semibold rounded-xl transition-colors ${
            saved
              ? 'bg-green-600 text-white'
              : 'bg-[#1B72CC] text-white hover:bg-[#1558A0]'
          } disabled:opacity-50`}
        >
          {saved ? '✓ Saved!' : saving ? 'Saving...' : 'Save Settings'}
        </button>
      </form>

      {/* Sign out */}
      <div className="bg-white rounded-xl border border-slate-200 p-4">
        <p className="text-sm font-semibold text-slate-900 mb-3">Account</p>
        <button
          onClick={handleSignOut}
          className="w-full py-2.5 border border-slate-200 text-slate-600 rounded-lg text-sm font-medium hover:bg-slate-50 transition-colors"
        >
          Sign out
        </button>
      </div>
    </div>
  )
}
