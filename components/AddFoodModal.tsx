'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { MealType } from '@/types'

interface Props {
  onClose: () => void
  onSaved: () => void
  defaultDate?: string
}

const MEAL_TYPES: { value: MealType; label: string }[] = [
  { value: 'breakfast', label: 'Breakfast' },
  { value: 'lunch', label: 'Lunch' },
  { value: 'dinner', label: 'Dinner' },
  { value: 'snack', label: 'Snack' },
]

const QUICK_CALORIES = [100, 200, 300, 400, 500]

export default function AddFoodModal({ onClose, onSaved, defaultDate }: Props) {
  const [mealType, setMealType] = useState<MealType>('breakfast')
  const [foodName, setFoodName] = useState('')
  const [calories, setCalories] = useState('')
  const [quantity, setQuantity] = useState('')
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const supabase = createClient()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!foodName.trim() || !calories) return
    setSaving(true)
    setError('')

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setError('Not logged in'); setSaving(false); return }

    const loggedAt = defaultDate
      ? new Date(defaultDate + 'T12:00:00').toISOString()
      : new Date().toISOString()

    const { error: err } = await supabase.from('rf_food_entries').insert({
      user_id: user.id,
      logged_at: loggedAt,
      meal_type: mealType,
      food_name: foodName.trim(),
      calories: parseInt(calories),
      quantity_text: quantity.trim() || null,
      notes: notes.trim() || null,
    })

    if (err) { setError(err.message); setSaving(false); return }
    onSaved()
    onClose()
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-end md:items-center justify-center p-0 md:p-4">
      <div className="bg-white w-full md:max-w-md md:rounded-2xl rounded-t-2xl shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-100">
          <h2 className="text-lg font-semibold text-slate-900">Add Food</h2>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-slate-100 text-slate-500">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-5 h-5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          {/* Meal type */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Meal</label>
            <div className="grid grid-cols-4 gap-2">
              {MEAL_TYPES.map((m) => (
                <button
                  key={m.value}
                  type="button"
                  onClick={() => setMealType(m.value)}
                  className={`py-2 rounded-lg text-sm font-medium border transition-colors ${
                    mealType === m.value
                      ? 'bg-[#1B72CC] text-white border-[#1B72CC]'
                      : 'bg-white text-slate-600 border-slate-200 hover:border-[#1B72CC]'
                  }`}
                >
                  {m.label}
                </button>
              ))}
            </div>
          </div>

          {/* Food name */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Food name</label>
            <input
              type="text"
              value={foodName}
              onChange={(e) => setFoodName(e.target.value)}
              placeholder="e.g. Chicken breast, Oatmeal..."
              required
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1B72CC] focus:border-transparent"
            />
          </div>

          {/* Calories */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Calories</label>
            <input
              type="number"
              value={calories}
              onChange={(e) => setCalories(e.target.value)}
              placeholder="0"
              min="0"
              max="9999"
              required
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1B72CC] focus:border-transparent"
            />
            {/* Quick calories */}
            <div className="flex gap-1.5 mt-2">
              {QUICK_CALORIES.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setCalories(String(c))}
                  className="flex-1 py-1 text-xs font-medium bg-slate-100 hover:bg-[#EBF3FB] hover:text-[#1B72CC] rounded text-slate-600 transition-colors"
                >
                  {c}
                </button>
              ))}
            </div>
          </div>

          {/* Quantity (optional) */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Quantity <span className="text-slate-400 font-normal">(optional)</span>
            </label>
            <input
              type="text"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              placeholder="e.g. 1 cup, 200g, 2 pieces"
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1B72CC] focus:border-transparent"
            />
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <button
            type="submit"
            disabled={saving || !foodName.trim() || !calories}
            className="w-full py-3 bg-[#1B72CC] text-white font-semibold rounded-xl disabled:opacity-50 disabled:cursor-not-allowed hover:bg-[#1558A0] transition-colors"
          >
            {saving ? 'Saving...' : 'Add Food'}
          </button>
        </form>
      </div>
    </div>
  )
}
