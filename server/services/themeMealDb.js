import fetch from 'node-fetch';

const DEFAULT_BASE_URL = 'https://www.themealdb.com/api/json/v1';
const DEFAULT_API_KEY = '1';
const REQUEST_TIMEOUT_MS = 8_000;
const LIST_TYPES = new Set(['categories', 'areas', 'ingredients']);

export class ThemeMealDbError extends Error {
  constructor(message, status = 502) {
    super(message);
    this.name = 'ThemeMealDbError';
    this.status = status;
  }
}

function apiRoot() {
  const baseUrl = (process.env.THEMEALDB_API_BASE_URL || DEFAULT_BASE_URL).trim().replace(/\/+$/, '');
  const apiKey = (process.env.THEMEALDB_API_KEY || DEFAULT_API_KEY).trim();
  return `${baseUrl}/${encodeURIComponent(apiKey)}`;
}

async function request(pathname, searchParams = {}) {
  const url = new URL(`${apiRoot()}/${pathname}`);
  for (const [key, value] of Object.entries(searchParams)) {
    if (value !== undefined && value !== null && String(value).trim()) {
      url.searchParams.set(key, String(value).trim());
    }
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(url, { signal: controller.signal });
    if (!response.ok) {
      throw new ThemeMealDbError(`TheMealDB returned ${response.status}`);
    }
    return await response.json();
  } catch (error) {
    if (error instanceof ThemeMealDbError) throw error;
    if (error.name === 'AbortError') {
      throw new ThemeMealDbError('TheMealDB request timed out');
    }
    throw new ThemeMealDbError('TheMealDB is temporarily unavailable');
  } finally {
    clearTimeout(timeout);
  }
}

function mealIngredients(meal) {
  return Array.from({ length: 20 }, (_, index) => {
    const ingredient = meal[`strIngredient${index + 1}`]?.trim();
    const measure = meal[`strMeasure${index + 1}`]?.trim();
    return ingredient ? [measure, ingredient].filter(Boolean).join(' ') : null;
  }).filter(Boolean);
}

export function normalizeThemeMeal(meal, { includeDetails = false } = {}) {
  if (!meal || !meal.idMeal || !meal.strMeal) return null;

  const normalized = {
    id: Number(meal.idMeal),
    title: meal.strMeal.trim(),
    image: meal.strMealThumb || '',
    source: 'themealdb'
  };

  if (!includeDetails) return normalized;

  return {
    ...normalized,
    category: meal.strCategory || '',
    area: meal.strArea || '',
    instructions: meal.strInstructions || '',
    ingredients: mealIngredients(meal),
    tags: typeof meal.strTags === 'string'
      ? meal.strTags.split(',').map((tag) => tag.trim()).filter(Boolean)
      : [],
    sourceUrl: meal.strSource || '',
    videoUrl: meal.strYoutube || ''
  };
}

function normalizeMeals(meals, options) {
  return (Array.isArray(meals) ? meals : [])
    .map((meal) => normalizeThemeMeal(meal, options))
    .filter(Boolean);
}

export async function searchThemeMeals(query) {
  const data = await request('search.php', { s: query });
  return normalizeMeals(data.meals);
}

export async function searchThemeMealsByFirstLetter(letter) {
  if (!/^[a-z]$/i.test(letter)) {
    throw new ThemeMealDbError('First letter must be one letter from A to Z', 400);
  }
  const data = await request('search.php', { f: letter.toLowerCase() });
  return normalizeMeals(data.meals);
}

export async function lookupThemeMeal(mealId) {
  if (!/^\d+$/.test(String(mealId))) {
    throw new ThemeMealDbError('A valid TheMealDB meal id is required', 400);
  }
  const data = await request('lookup.php', { i: mealId });
  return normalizeMeals(data.meals, { includeDetails: true })[0] ?? null;
}

export async function getRandomThemeMeal() {
  const data = await request('random.php');
  return normalizeMeals(data.meals, { includeDetails: true })[0] ?? null;
}

export async function getThemeMealCategories() {
  const data = await request('categories.php');
  return Array.isArray(data.categories) ? data.categories : [];
}

export async function listThemeMealValues(type) {
  if (!LIST_TYPES.has(type)) {
    throw new ThemeMealDbError('List type must be categories, areas, or ingredients', 400);
  }

  const parameter = { categories: 'c', areas: 'a', ingredients: 'i' }[type];
  const data = await request('list.php', { [parameter]: 'list' });
  return Array.isArray(data.meals) ? data.meals : [];
}

export async function filterThemeMeals({ ingredient, category, area }) {
  const filters = [
    ['i', ingredient],
    ['c', category],
    ['a', area]
  ].filter(([, value]) => typeof value === 'string' && value.trim());

  if (filters.length !== 1) {
    throw new ThemeMealDbError('Choose exactly one ingredient, category, or area filter', 400);
  }

  const [parameter, value] = filters[0];
  const data = await request('filter.php', { [parameter]: value });
  return normalizeMeals(data.meals);
}
