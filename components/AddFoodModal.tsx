'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { MealType } from '@/types'
import { searchFoods, type FoodItem } from '@/lib/foodDatabase'

interface MealItem {
  food_name: string
  calories: number
  quantity_text?: string
}

interface SavedMeal {
  id: string
  name: string
  items: MealItem[]
  total_calories: number
}

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
  const [activeTab, setActiveTab] = useState<'food' | 'meals'>('food')
  const [mealType, setMealType] = useState<MealType>('breakfast')

  // ── Food tab ────────────────────────────────────────────────────────────────
  const [foodName, setFoodName] = useState('')
  const [calories, setCalories] = useState('')
  const [quantity, setQuantity] = useState('')
  const [suggestions, setSuggestions] = useState<FoodItem[]>([])
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  // ── My Meals tab ────────────────────────────────────────────────────────────
  const [meals, setMeals] = useState<SavedMeal[]>([])
  const [mealsLoading, setMealsLoading] = useState(false)
  const [loggingMeal, setLoggingMeal] = useState<string | null>(null)
  const [deletingMeal, setDeletingMeal] = useState<string | null>(null)
  const [showCreate, setShowCreate] = useState(false)

  // ── Create Meal form ────────────────────────────────────────────────────────
  const [newMealName, setNewMealName] = useState('')
  const [newMealItems, setNewMealItems] = useState([{ food_name: '', calories: '' }])
  const [savingMeal, setSavingMeal] = useState(false)

  const supabase = createClient()

  // Food database autocomplete
  useEffect(() => {
    if (foodName.trim()) {
      const results = searchFoods(foodName)
      setSuggestions(results)
      setShowSuggestions(results.length > 0)
    } else {
      setSuggestions([])
      setShowSuggestions(false)
    }
  }, [foodName])

  const loadMeals = useCallback(async () => {
    setMealsLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setMealsLoading(false); return }
    const { data } = await supabase
      .from('rf_meals')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
    setMeals((data ?? []) as SavedMeal[])
    setMealsLoading(false)
  }, [supabase])

  useEffect(() => {
    if (activeTab === 'meals') loadMeals()
  }, [activeTab, loadMeals])

  function selectSuggestion(item: FoodItem) {
    setFoodName(item.name)
    setCalories(String(item.calories))
    setShowSuggestions(false)
  }

  async function handleFoodSubmit(e: React.FormEvent) {
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
    })
    if (err) { setError(err.message); setSaving(false); return }
    onSaved()
    onClose()
  }

  async function logMeal(meal: SavedMeal) {
    setLoggingMeal(meal.id)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setLoggingMeal(null); return }
    const loggedAt = defaultDate
      ? new Date(defaultDate + 'T12:00:00').toISOString()
      : new Date().toISOString()
    const rows = meal.items.map(item => ({
      user_id: user.id,
      logged_at: loggedAt,
      meal_type: mealType,
      food_name: item.food_name,
      calories: item.calories,
      quantity_text: item.quantity_text || null,
    }))
    await supabase.from('rf_food_entries').insert(rows)
    setLoggingMeal(null)
    onSaved()
    onClose()
  }

  async function deleteMeal(id: string) {
    setDeletingMeal(id)
    await supabase.from('rf_meals').delete().eq('id', id)
    setDeletingMeal(null)
    setMeals(prev => prev.filter(m => m.id !== id))
  }

  async function saveNewMeal() {
    if (!newMealName.trim()) return
    const validItems = newMealItems.filter(i => i.food_name.trim() && i.calories)
    if (validItems.length === 0) return
    setSavingMeal(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setSavingMeal(false); return }
    const items: MealItem[] = validItems.map(i => ({
      food_name: i.food_name.trim(),
      calories: parseInt(i.calories),
    }))
    const total_calories = items.reduce((s, i) => s + i.calories, 0)
    await supabase.from('rf_meals').insert({
      user_id: user.id,
      name: newMealName.trim(),
      items,
      total_calories,
    })
    setSavingMeal(false)
    setShowCreate(false)
    setNewMealName('')
    setNewMealItems([{ food_name: '', calories: '' }])
    loadMeals()
  }

  function updateNewItem(idx: number, field: 'food_name' | 'calories', value: string) {
    setNewMealItems(prev => prev.map((item, i) => i === idx ? { ...item, [field]: value } : item))
  }

  function cancelCreate() {
    setShowCreate(false)
    setNewMealName('')
    setNewMealItems([{ food_name: '', calories: '' }])
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-end md:items-center justify-center p-0 md:p-4">
      <div className="bg-white w-full md:max-w-md md:rounded-2xl rounded-t-2xl shadow-xl max-h-[90vh] flex flex-col">

        {/* ── Header ─────────────────────────────────────────────────────────── */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 flex-shrink-0">
          <h2 className="text-lg font-semibold text-slate-900">
            {showCreate ? 'Create Meal' : 'Add Food'}
          </h2>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-slate-100 text-slate-500">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-5 h-5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* ── Tabs ───────────────────────────────────────────────────────────── */}
        {!showCreate && (
          <div className="flex border-b border-slate-100 flex-shrink-0">
            {(['food', 'meals'] as const).map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`flex-1 py-2.5 text-sm font-medium transition-colors border-b-2 -mb-px ${
                  activeTab === tab
                    ? 'border-[#1B72CC] text-[#1B72CC]'
                    : 'border-transparent text-slate-500 hover:text-slate-700'
                }`}
              >
                {tab === 'food' ? 'Add Food' : 'My Meals'}
              </button>
            ))}
          </div>
        )}

        {/* ── Meal type selector (shared) ─────────────────────────────────────── */}
        {!showCreate && (
          <div className="px-4 pt-3 pb-1 flex-shrink-0">
            <div className="grid grid-cols-4 gap-1.5">
              {MEAL_TYPES.map(m => (
                <button
                  key={m.value}
                  type="button"
                  onClick={() => setMealType(m.value)}
                  className={`py-1.5 rounded-lg text-xs font-medium border transition-colors ${
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
        )}

        {/* ── Scrollable content ──────────────────────────────────────────────── */}
        <div className="overflow-y-auto flex-1 px-4 pb-5 pt-3">

          {/* ── Add Food form ─────────────────────────────────────────────────── */}
          {activeTab === 'food' && !showCreate && (
            <form onSubmit={handleFoodSubmit} className="space-y-3">

              {/* Food name with autocomplete */}
              <div className="relative">
                <label className="block text-xs font-medium text-slate-600 mb-1">Food name</label>
                <input
                  type="text"
                  value={foodName}
                  onChange={e => setFoodName(e.target.value)}
                  onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
                  placeholder="Search or type food name…"
                  required
                  autoFocus
                  className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1B72CC]"
                />
                {showSuggestions && (
                  <div className="absolute top-full left-0 right-0 z-20 bg-white border border-slate-200 rounded-xl shadow-lg mt-1 overflow-hidden">
                    {suggestions.map((item, i) => (
                      <button
                        key={i}
                        type="button"
                        onMouseDown={() => selectSuggestion(item)}
                        className="w-full px-3 py-2.5 text-left hover:bg-blue-50 flex items-center justify-between gap-3 border-b border-slate-50 last:border-0"
                      >
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-slate-800 truncate">{item.name}</p>
                          <p className="text-xs text-slate-400">{item.serving}</p>
                        </div>
                        <span className="text-xs font-bold text-[#1B72CC] flex-shrink-0 bg-blue-50 px-1.5 py-0.5 rounded">
                          {item.calories}
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Calories */}
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Calories</label>
                <input
                  type="number"
                  value={calories}
                  onChange={e => setCalories(e.target.value)}
                  placeholder="0"
                  min="0"
                  max="9999"
                  required
                  className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1B72CC]"
                />
                <div className="flex gap-1.5 mt-1.5">
                  {QUICK_CALORIES.map(c => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setCalories(String(c))}
                      className="flex-1 py-1 text-xs font-medium bg-slate-100 hover:bg-blue-50 hover:text-[#1B72CC] rounded text-slate-600 transition-colors"
                    >
                      {c}
                    </button>
                  ))}
                </div>
              </div>

              {/* Quantity */}
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">
                  Quantity <span className="text-slate-400 font-normal">(optional)</span>
                </label>
                <input
                  type="text"
                  value={quantity}
                  onChange={e => setQuantity(e.target.value)}
                  placeholder="e.g. 1 cup, 200g, 2 slices"
                  className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1B72CC]"
                />
              </div>

              {error && <p className="text-sm text-red-600">{error}</p>}

              <button
                type="submit"
                disabled={saving || !foodName.trim() || !calories}
                className="w-full py-3 bg-[#1B72CC] text-white font-semibold rounded-xl disabled:opacity-50 hover:bg-[#1558A0] transition-colors"
              >
                {saving ? 'Saving…' : 'Add Food'}
              </button>
            </form>
          )}

          {/* ── My Meals list ─────────────────────────────────────────────────── */}
          {activeTab === 'meals' && !showCreate && (
            <div className="space-y-3">
              {mealsLoading ? (
                <div className="flex justify-center py-10">
                  <div className="w-7 h-7 border-4 border-[#1B72CC] border-t-transparent rounded-full animate-spin" />
                </div>
              ) : meals.length === 0 ? (
                <div className="text-center py-10">
                  <p className="text-4xl mb-2">🍽️</p>
                  <p className="text-slate-600 font-medium text-sm">No saved meals yet</p>
                  <p className="text-slate-400 text-xs mt-1">Create a meal to log multiple foods at once</p>
                </div>
              ) : (
                meals.map(meal => (
                  <div key={meal.id} className="bg-slate-50 rounded-xl p-3 border border-slate-100">
                    <div className="flex items-start gap-2">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-slate-900">{meal.name}</p>
                        <p className="text-xs text-slate-500 mt-0.5">
                          {meal.total_calories} cal · {meal.items.length} item{meal.items.length !== 1 ? 's' : ''}
                        </p>
                        <p className="text-xs text-slate-400 mt-0.5 truncate">
                          {meal.items.map(i => i.food_name).join(', ')}
                        </p>
                      </div>
                      <button
                        onClick={() => deleteMeal(meal.id)}
                        disabled={deletingMeal === meal.id}
                        className="p-1.5 rounded-lg hover:bg-red-50 text-slate-300 hover:text-red-400 transition-colors flex-shrink-0"
                      >
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-4 h-4">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                    <button
                      onClick={() => logMeal(meal)}
                      disabled={!!loggingMeal}
                      className="mt-2.5 w-full py-2 bg-[#1B72CC] text-white text-xs font-semibold rounded-lg disabled:opacity-50 hover:bg-[#1558A0] transition-colors"
                    >
                      {loggingMeal === meal.id
                        ? 'Logging…'
                        : `Log as ${mealType.charAt(0).toUpperCase() + mealType.slice(1)}`}
                    </button>
                  </div>
                ))
              )}

              <button
                onClick={() => setShowCreate(true)}
                className="w-full py-3 border-2 border-dashed border-slate-200 text-slate-500 text-sm font-medium rounded-xl hover:border-[#1B72CC] hover:text-[#1B72CC] transition-colors"
              >
                + Create New Meal
              </button>
            </div>
          )}

          {/* ── Create Meal form ──────────────────────────────────────────────── */}
          {showCreate && (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Meal name</label>
                <input
                  type="text"
                  value={newMealName}
                  onChange={e => setNewMealName(e.target.value)}
                  placeholder="e.g. My Usual Breakfast"
                  autoFocus
                  className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1B72CC]"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-600 mb-2">
                  Food items
                  <span className="text-slate-400 font-normal ml-1">(name + calories each)</span>
                </label>
                <div className="space-y-2">
                  {newMealItems.map((item, idx) => (
                    <div key={idx} className="flex gap-2 items-center">
                      <input
                        type="text"
                        value={item.food_name}
                        onChange={e => updateNewItem(idx, 'food_name', e.target.value)}
                        placeholder="Food name"
                        className="flex-1 px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1B72CC]"
                      />
                      <input
                        type="number"
                        value={item.calories}
                        onChange={e => updateNewItem(idx, 'calories', e.target.value)}
                        placeholder="Cal"
                        min="0"
                        className="w-16 px-2 py-2 border border-slate-200 rounded-lg text-sm text-center focus:outline-none focus:ring-2 focus:ring-[#1B72CC]"
                      />
                      {newMealItems.length > 1 && (
                        <button
                          type="button"
                          onClick={() => setNewMealItems(prev => prev.filter((_, i) => i !== idx))}
                          className="p-1.5 text-slate-300 hover:text-red-400 flex-shrink-0"
                        >
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} className="w-4 h-4">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      )}
                    </div>
                  ))}
                </div>
                <button
                  type="button"
                  onClick={() => setNewMealItems(prev => [...prev, { food_name: '', calories: '' }])}
                  className="mt-2 text-xs text-[#1B72CC] font-medium hover:underline"
                >
                  + Add another item
                </button>
              </div>

              <div className="flex gap-2 pt-1">
                <button
                  type="button"
                  onClick={cancelCreate}
                  className="flex-1 py-2.5 border border-slate-200 text-slate-600 text-sm font-medium rounded-xl hover:bg-slate-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={saveNewMeal}
                  disabled={savingMeal || !newMealName.trim() || newMealItems.every(i => !i.food_name.trim() || !i.calories)}
                  className="flex-1 py-2.5 bg-[#1B72CC] text-white text-sm font-semibold rounded-xl disabled:opacity-50 hover:bg-[#1558A0] transition-colors"
                >
                  {savingMeal ? 'Saving…' : 'Save Meal'}
                </button>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  )
}
