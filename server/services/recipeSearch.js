import fetch from 'node-fetch';

import { searchThemeMeals } from './themeMealDb.js';

const REQUEST_TIMEOUT_MS = 8_000;

export class RecipeSearchError extends Error {
  constructor(message, status = 502) {
    super(message);
    this.name = 'RecipeSearchError';
    this.status = status;
  }
}

async function searchSpoonacular(query, diet) {
  const apiKey = process.env.SPOONACULAR_API_KEY?.trim();
  if (!apiKey) return null;

  const url = new URL('https://api.spoonacular.com/recipes/complexSearch');
  url.searchParams.set('apiKey', apiKey);
  url.searchParams.set('query', query);
  url.searchParams.set('number', '10');
  if (diet) url.searchParams.set('diet', diet);

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const response = await fetch(url, { signal: controller.signal });
    if (!response.ok) throw new RecipeSearchError(`Spoonacular returned ${response.status}`);
    const data = await response.json();
    return (Array.isArray(data.results) ? data.results : []).map((meal) => ({
      id: Number(meal.id),
      title: meal.title,
      image: meal.image || '',
      source: 'spoonacular'
    }));
  } catch (error) {
    if (error instanceof RecipeSearchError) throw error;
    throw new RecipeSearchError(
      error.name === 'AbortError' ? 'Spoonacular request timed out' : 'Spoonacular is temporarily unavailable'
    );
  } finally {
    clearTimeout(timeout);
  }
}

export async function searchRecipes({ query, diet }) {
  const providers = [
    { name: 'themealdb', request: searchThemeMeals(query) },
    ...(process.env.SPOONACULAR_API_KEY?.trim()
      ? [{ name: 'spoonacular', request: searchSpoonacular(query, diet) }]
      : [])
  ];

  const settled = await Promise.allSettled(providers.map((provider) => provider.request));
  const results = settled.flatMap((result) => result.status === 'fulfilled' ? result.value ?? [] : []);
  const availableSources = providers
    .filter((provider, index) => settled[index].status === 'fulfilled')
    .map((provider) => provider.name);

  if (availableSources.length === 0) {
    throw new RecipeSearchError('Recipe search is temporarily unavailable');
  }

  const seen = new Set();
  const recipes = results.filter((recipe) => {
    const key = `${recipe.source}:${recipe.id}`;
    if (!Number.isInteger(recipe.id) || seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  return { recipes, availableSources };
}
