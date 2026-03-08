import { NextRequest, NextResponse } from 'next/server'
import { searchFoods } from '@/lib/foodDatabase'

export interface FoodSuggestion {
  name: string
  calories: number
  serving: string
  source: 'local' | 'usda'
}

// Cache responses per query for 1 hour to stay within USDA rate limits
export const revalidate = 3600

export async function GET(request: NextRequest) {
  const query = request.nextUrl.searchParams.get('q')?.trim() ?? ''

  // ── 1. Always run local search immediately ───────────────────────────────────
  const localResults: FoodSuggestion[] = searchFoods(query).map(f => ({
    name: f.name,
    calories: f.calories,
    serving: f.serving,
    source: 'local',
  }))

  if (!query) return NextResponse.json(localResults)

  // ── 2. Try USDA FoodData Central API ────────────────────────────────────────
  // Free key: https://api.data.gov/signup/  →  add USDA_FDC_API_KEY to .env.local
  // Falls back to DEMO_KEY (30 req/hr per IP) if no key configured
  const apiKey = process.env.USDA_FDC_API_KEY ?? 'DEMO_KEY'

  try {
    const params = new URLSearchParams({
      query,
      api_key: apiKey,
      dataType: 'Foundation,SR Legacy',  // curated, high-quality nutrient data
      pageSize: '20',
      nutrients: '1008',                 // only pull back energy (kcal)
    })

    const res = await fetch(
      `https://api.nal.usda.gov/fdc/v1/foods/search?${params}`,
      { next: { revalidate: 3600 } }    // Next.js fetch cache for 1 hour
    )

    if (!res.ok) throw new Error(`USDA ${res.status}`)

    const data = await res.json()
    const localNames = new Set(localResults.map(f => f.name.toLowerCase()))

    const fdcResults: FoodSuggestion[] = (data.foods ?? [])
      .map((food: Record<string, unknown>) => {
        const nutrients = (food.foodNutrients as Record<string, unknown>[]) ?? []
        const energy = nutrients.find(
          (n: Record<string, unknown>) =>
            n.nutrientId === 1008 ||
            n.nutrientNumber === '208' ||
            (typeof n.nutrientName === 'string' &&
              n.nutrientName.toLowerCase().includes('energy') &&
              typeof n.unitName === 'string' &&
              n.unitName.toLowerCase() === 'kcal')
        )
        const calories = energy
          ? Math.round((energy.value as number) ?? (energy.amount as number) ?? 0)
          : 0

        const size = food.servingSize as number | undefined
        const unit = food.servingSizeUnit as string | undefined
        const serving = size ? `${size}${unit ?? 'g'}` : '100g'

        return {
          name: food.description as string,
          calories,
          serving,
          source: 'usda' as const,
        }
      })
      .filter(
        (f: FoodSuggestion) =>
          f.calories > 0 && !localNames.has(f.name.toLowerCase())
      )
      .slice(0, 8)

    // Local results first (instant recognisability), then USDA extras
    return NextResponse.json(
      [...localResults, ...fdcResults].slice(0, 12)
    )
  } catch {
    // Network error, timeout, rate-limited — return local results
    return NextResponse.json(localResults)
  }
}
