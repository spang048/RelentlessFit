export type Sex = 'male' | 'female'
export type ActivityLevel = 'sedentary' | 'lightly_active' | 'moderately_active' | 'very_active'
export type GoalType = 'maintain' | 'lose_slow' | 'lose_moderate' | 'gain_slow'
export type MealType = 'breakfast' | 'lunch' | 'dinner' | 'snack'
export type ExerciseType = 'run' | 'walk' | 'bike' | 'strength' | 'ski' | 'hike' | 'other'
export type DataSource = 'manual' | 'garmin' | 'scale' | 'healthkit'

export interface UserProfile {
  id: string
  user_id: string
  name: string
  sex: Sex
  birth_date: string
  height_cm: number
  activity_level: ActivityLevel
  goal_type: GoalType
  goal_weight_lb: number | null
  created_at: string
  updated_at: string
}

export interface FoodEntry {
  id: string
  user_id: string
  logged_at: string
  meal_type: MealType
  food_name: string
  calories: number
  quantity_text: string | null
  notes: string | null
}

export interface ExerciseEntry {
  id: string
  user_id: string
  logged_at: string
  exercise_type: ExerciseType
  duration_min: number
  calories_burned: number
  distance: number | null
  avg_hr: number | null
  source: DataSource
  notes: string | null
  external_id: string | null
}

export interface WeightEntry {
  id: string
  user_id: string
  date: string
  weight_lb: number
  body_fat_pct: number | null
  waist_in: number | null
  notes: string | null
  source: DataSource
}

export interface DailySummary {
  date: string
  food_calories: number
  baseline_burn: number
  exercise_burn: number
  total_burn: number
  net_calories: number
  goal_target: number
  weight_lb: number | null
}
