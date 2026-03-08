import type { UserProfile, ActivityLevel, GoalType } from '@/types'

const ACTIVITY_FACTORS: Record<ActivityLevel, number> = {
  sedentary: 1.2,
  lightly_active: 1.375,
  moderately_active: 1.55,
  very_active: 1.725,
}

const GOAL_TARGETS: Record<GoalType, number> = {
  maintain: 0,       // net ~0
  lose_slow: -250,   // ~0.5 lb/week
  lose_moderate: -500, // ~1 lb/week
  gain_slow: 250,    // ~0.5 lb/week
}

export function calculateAge(birthDate: string): number {
  const birth = new Date(birthDate)
  const today = new Date()
  let age = today.getFullYear() - birth.getFullYear()
  const m = today.getMonth() - birth.getMonth()
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--
  return age
}

export function lbsToKg(lbs: number): number {
  return lbs * 0.453592
}

export function inchesToCm(inches: number): number {
  return inches * 2.54
}

export function calculateBMR(
  sex: 'male' | 'female',
  weightLb: number,
  heightCm: number,
  birthDate: string
): number {
  const weightKg = lbsToKg(weightLb)
  const age = calculateAge(birthDate)
  if (sex === 'male') {
    return 10 * weightKg + 6.25 * heightCm - 5 * age + 5
  } else {
    return 10 * weightKg + 6.25 * heightCm - 5 * age - 161
  }
}

export function calculateBaselineBurn(
  profile: Pick<UserProfile, 'sex' | 'birth_date' | 'height_cm' | 'activity_level'>,
  weightLb: number
): number {
  const bmr = calculateBMR(profile.sex, weightLb, profile.height_cm, profile.birth_date)
  return Math.round(bmr * ACTIVITY_FACTORS[profile.activity_level])
}

export function calculateGoalTarget(
  profile: Pick<UserProfile, 'sex' | 'birth_date' | 'height_cm' | 'activity_level' | 'goal_type'>,
  weightLb: number
): number {
  const baseline = calculateBaselineBurn(profile, weightLb)
  return baseline + GOAL_TARGETS[profile.goal_type]
}

export function calculateNet(
  foodCalories: number,
  baselineBurn: number,
  exerciseBurn: number
): number {
  return foodCalories - (baselineBurn + exerciseBurn)
}

export function getNetStatus(net: number, goalTarget: number): string {
  const diff = Math.abs(net - goalTarget)
  if (diff <= 50) return 'On track'
  if (net > goalTarget) return `Above target by ${diff}`
  return `Below target by ${diff}`
}

export function rollingAverage(values: number[], window = 7): number[] {
  return values.map((_, i) => {
    const start = Math.max(0, i - window + 1)
    const slice = values.slice(start, i + 1)
    return slice.reduce((a, b) => a + b, 0) / slice.length
  })
}

export function weightChangePer7Days(weights: { date: string; weight_lb: number }[]): number | null {
  if (weights.length < 2) return null
  const sorted = [...weights].sort((a, b) => a.date.localeCompare(b.date))
  const first = sorted[0]
  const last = sorted[sorted.length - 1]
  const days = (new Date(last.date).getTime() - new Date(first.date).getTime()) / (1000 * 60 * 60 * 24)
  if (days === 0) return null
  return ((last.weight_lb - first.weight_lb) / days) * 7
}
