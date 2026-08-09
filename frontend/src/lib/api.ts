import type { MealType } from '@/lib/meal-types'

const API_BASE = '/api'

export type WeightUnit = 'kg' | 'lb'
export type RecipeProvider = 'spoonacular' | 'themealdb'
export type MealSource = RecipeProvider | 'custom' | 'ai'

export interface HealthProfile {
  age: number
  weight: { value: number; unit: WeightUnit }
  height: { feet: number; inches: number }
}

export interface User {
  _id: string
  username: string
  joinedAt: string | null
  preferences: string[]
  healthProfile: HealthProfile | null
  subscription: {
    plan: 'free' | 'plus'
    status: 'inactive' | 'active' | 'trialing' | 'past_due' | 'canceled'
    startedAt: string | null
    currentPeriodEnd: string | null
  }
  hasPlusAccess: boolean
  plannerPlusAvailable: boolean
  miloPreviewAvailable: boolean
}

export interface Meal {
  entryId?: string
  mealId: number
  name: string
  diets: string[]
  image: string
  day?: string
  mealType?: MealType
  source?: MealSource
  description?: string
  ingredients?: string[]
  estimatedCalories?: number
}

export interface MealPlan {
  _id: string
  user_id: string
  week: number
  meals: Meal[]
}

export interface RecipeSearchResult {
  id: number
  title: string
  image: string
  source: RecipeProvider
}

export interface ThemeMealDetails extends RecipeSearchResult {
  source: 'themealdb'
  category: string
  area: string
  instructions: string
  ingredients: string[]
  tags: string[]
  sourceUrl: string
  videoUrl: string
}

export interface NutritionEstimate {
  mealId?: number
  source?: MealSource
  mealName: string
  servingDescription: string
  calories: number
  proteinGrams: number
  carbsGrams: number
  fatGrams: number
  fiberGrams: number
  sugarGrams: number
  sodiumMg: number
  confidence: 'low' | 'medium' | 'high'
  summary: string
  estimatedAt: string
  cached: boolean
}

export interface NutritionTotals {
  calories: number
  proteinGrams: number
  carbsGrams: number
  fatGrams: number
  fiberGrams: number
  sugarGrams: number
  sodiumMg: number
}

export interface DailyNutritionSummary {
  day: string
  mealCount: number
  logicEstimateCount: number
  totals: NutritionTotals
  calorieProgressPercent: number
  status: 'empty' | 'building' | 'on_track' | 'over_reference'
}

export interface WeeklyNutritionSummary {
  mealPlanId: string | null
  week: number
  targets: Omit<NutritionTotals, 'sugarGrams'> & {
    personalized: boolean
    basis: string
  }
  days: DailyNutritionSummary[]
  generatedAt: string
}

export interface GeneratedMeal {
  mealType: MealType
  name: string
  description: string
  ingredients: string[]
  estimatedCalories: number
}

export interface GeneratedDay {
  day: string
  meals: GeneratedMeal[]
}

export interface GeneratedPlan {
  title: string
  overview: string
  days: GeneratedDay[]
}

export interface MiloMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
}

export interface MiloReply {
  status: 'needs_input' | 'plan_ready'
  message: string
  questions: string[]
  plan: GeneratedPlan | null
  draftId: string | null
  model: string
}

class ApiError extends Error {}

function getAuthToken() {
  if (typeof window === 'undefined') return null
  try {
    const stored = JSON.parse(localStorage.getItem('meal-planner-auth') ?? '{}') as { token?: string }
    return stored.token ?? null
  } catch {
    return null
  }
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getAuthToken()
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  })

  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new ApiError(body.message ?? body.error ?? `Request failed (${res.status})`)
  }

  return res.json()
}

export const api = {
  register(
    username: string,
    password: string,
    preferences: string[],
    healthProfile: HealthProfile,
  ) {
    return request<{ user: User; token: string }>('/users/register', {
      method: 'POST',
      body: JSON.stringify({ username, password, preferences, healthProfile }),
    })
  },

  login(username: string, password: string) {
    return request<{ message: string; userId: string; token: string }>('/users/login', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    })
  },

  getUser(id: string) {
    return request<User>(`/users/${id}`)
  },

  updatePreferences(id: string, preferences: string[]) {
    return request<User>(`/users/${id}/preferences`, {
      method: 'PUT',
      body: JSON.stringify({ preferences }),
    })
  },

  getMealPlans(userId: string) {
    return request<MealPlan[]>(`/mealplans/${userId}`)
  },

  getNutritionSummary(userId: string, week = 1) {
    return request<WeeklyNutritionSummary>(`/mealplans/nutrition-summary/${userId}?week=${week}`)
  },

  addMeal(params: { userId: string; week: number; meal: Meal; mealplanId?: string }) {
    return request<MealPlan>('/mealplans', {
      method: 'POST',
      body: JSON.stringify(params),
    })
  },

  removeMeal(mealplanId: string, meal: Pick<Meal, 'entryId' | 'mealId'>) {
    const path = meal.entryId
      ? `/mealplans/${mealplanId}/meals/by-entry/${meal.entryId}`
      : `/mealplans/${mealplanId}/meals/${meal.mealId}`

    return request<MealPlan>(path, {
      method: 'DELETE',
    })
  },

  searchMeals(userId: string, query: string) {
    return request<RecipeSearchResult[]>(`/meals/search?query=${encodeURIComponent(query)}`, {
      headers: { user_id: String(userId) },
    })
  },

  getMealNutrition(userId: string, meal: Pick<Meal, 'mealId' | 'name' | 'diets' | 'source'>) {
    return request<NutritionEstimate>('/meals/nutrition', {
      method: 'POST',
      headers: { user_id: String(userId) },
      body: JSON.stringify({ mealId: meal.mealId, name: meal.name, diets: meal.diets, source: meal.source }),
    })
  },

  getThemeMealById(mealId: number) {
    return request<ThemeMealDetails>(`/meals/themealdb/lookup/${mealId}`)
  },

  getRandomThemeMeal() {
    return request<ThemeMealDetails>('/meals/themealdb/random')
  },

  getThemeMealCategories() {
    return request<Array<Record<string, string>>>('/meals/themealdb/categories')
  },

  listThemeMealValues(type: 'categories' | 'areas' | 'ingredients') {
    return request<Array<Record<string, string>>>(`/meals/themealdb/list/${type}`)
  },

  filterThemeMeals(filter: { ingredient?: string; category?: string; area?: string }) {
    const params = new URLSearchParams()
    for (const [key, value] of Object.entries(filter)) {
      if (value) params.set(key, value)
    }
    return request<RecipeSearchResult[]>(`/meals/themealdb/filter?${params}`)
  },

  searchThemeMealsByFirstLetter(letter: string) {
    return request<RecipeSearchResult[]>(
      `/meals/themealdb/first-letter?letter=${encodeURIComponent(letter)}`,
    )
  },

  createSubscriptionCheckout(userId: string) {
    return request<{ url: string }>('/subscriptions/checkout', {
      method: 'POST',
      body: JSON.stringify({ userId }),
    })
  },

  createSubscriptionPortal(userId: string) {
    return request<{ url: string }>('/subscriptions/portal', {
      method: 'POST',
      body: JSON.stringify({ userId }),
    })
  },

  getSubscriptionStatus(userId: string) {
    return request<User>(`/subscriptions/status/${userId}`)
  },

  generateMealPlan(userId: string, requestText: string, diets: string[]) {
    return request<{ plan: GeneratedPlan; model: string }>('/planner/generate', {
      method: 'POST',
      body: JSON.stringify({ userId, request: requestText, diets }),
    })
  },

  chatWithMilo(params: {
    messages: Array<Pick<MiloMessage, 'role' | 'content'>>
    diets: string[]
    action?: 'chat' | 'revise' | 'regenerate'
    draftId?: string | null
  }) {
    return request<MiloReply>('/planner/milo/chat', {
      method: 'POST',
      body: JSON.stringify(params),
    })
  },

  approveMiloDraft(draftId: string, selectedSlots: string[], week = 1) {
    return request<{ mealPlan: MealPlan; addedCount: number }>(`/planner/milo/${draftId}/approve`, {
      method: 'POST',
      body: JSON.stringify({ selectedSlots, week }),
    })
  },

  clearMiloDraft(draftId: string) {
    return request<{ cleared: boolean }>(`/planner/milo/${draftId}`, {
      method: 'DELETE',
    })
  },

  approveMealPlan(
    userId: string,
    meals: Array<GeneratedMeal & { day: string; diets?: string[] }>,
    week = 1,
  ) {
    return request<MealPlan>('/planner/approve', {
      method: 'POST',
      body: JSON.stringify({ userId, meals, week }),
    })
  },

  addCustomMeal(
    userId: string,
    meal: {
      name: string
      day: string
      mealType: MealType
      description?: string
      ingredients?: string[]
      estimatedCalories?: number
      diets?: string[]
    },
    week = 1,
  ) {
    return request<MealPlan>('/planner/custom-meal', {
      method: 'POST',
      body: JSON.stringify({ userId, meal, week }),
    })
  },
}

export { ApiError }
