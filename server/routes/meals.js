import express from 'express';
import User from '../../db/models/User.js';
import NutritionEstimate from '../../db/models/NutritionEstimate.js';
import { asyncHandler } from '../middleware/asyncHandler.js';
import { estimateNutrition, NutritionEstimatorError } from '../services/nutritionEstimator.js';
import { requireAuth } from '../middleware/requireAuth.js';
import { searchRecipes } from '../services/recipeSearch.js';
import {
  filterThemeMeals,
  getRandomThemeMeal,
  getThemeMealCategories,
  listThemeMealValues,
  lookupThemeMeal,
  searchThemeMealsByFirstLetter
} from '../services/themeMealDb.js';

const router = express.Router();
const RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000;
const RATE_LIMIT_MAX = 20;
const nutritionRequests = new Map();
const RECIPE_SOURCES = new Set(['spoonacular', 'themealdb', 'custom', 'ai']);

router.use(requireAuth);

function normalizeMealName(value) {
  return typeof value === 'string' ? value.trim().replace(/\s+/g, ' ') : '';
}

function nutritionLookupKey(source, mealId, mealName) {
  return Number.isInteger(mealId) && mealId > 0
    ? `recipe:${source}:${mealId}`
    : `name:${mealName.toLocaleLowerCase('en-US')}`;
}

function serializeEstimate(estimate, cached) {
  return {
    mealId: estimate.mealId,
    source: estimate.source,
    mealName: estimate.mealName,
    servingDescription: estimate.servingDescription,
    calories: estimate.calories,
    proteinGrams: estimate.proteinGrams,
    carbsGrams: estimate.carbsGrams,
    fatGrams: estimate.fatGrams,
    fiberGrams: estimate.fiberGrams,
    sugarGrams: estimate.sugarGrams,
    sodiumMg: estimate.sodiumMg,
    confidence: estimate.confidence,
    summary: estimate.summary,
    estimatedAt: estimate.updatedAt,
    cached
  };
}

function isRateLimited(userId) {
  const now = Date.now();
  const recent = (nutritionRequests.get(userId) ?? []).filter(
    (timestamp) => now - timestamp < RATE_LIMIT_WINDOW_MS
  );

  if (recent.length >= RATE_LIMIT_MAX) {
    nutritionRequests.set(userId, recent);
    return true;
  }

  recent.push(now);
  nutritionRequests.set(userId, recent);
  return false;
}

// Search for meals
router.get('/search', asyncHandler(async (req, res) => {
  const user = await User.findById(req.auth.userId);
  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }

  // Spoonacular's `diet` param accepts a single value, so only the first preference is applied.
  const diet = user.preferences[0];
  const query = typeof req.query.query === 'string' ? req.query.query.trim() : '';
  if (!query) {
    return res.status(400).json({ message: 'A search query is required' });
  }

  const { recipes, availableSources } = await searchRecipes({ query, diet });
  res.set('X-Recipe-Sources', availableSources.join(','));
  res.json(recipes);
}));

// Authenticated access to every standard TheMealDB V1 recipe endpoint.
router.get('/themealdb/first-letter', asyncHandler(async (req, res) => {
  res.json(await searchThemeMealsByFirstLetter(String(req.query.letter ?? '')));
}));

router.get('/themealdb/random', asyncHandler(async (req, res) => {
  res.json(await getRandomThemeMeal());
}));

router.get('/themealdb/categories', asyncHandler(async (req, res) => {
  res.json(await getThemeMealCategories());
}));

router.get('/themealdb/list/:type', asyncHandler(async (req, res) => {
  res.json(await listThemeMealValues(req.params.type));
}));

router.get('/themealdb/filter', asyncHandler(async (req, res) => {
  res.json(await filterThemeMeals({
    ingredient: req.query.ingredient,
    category: req.query.category,
    area: req.query.area
  }));
}));

router.get('/themealdb/lookup/:mealId', asyncHandler(async (req, res) => {
  const meal = await lookupThemeMeal(req.params.mealId);
  if (!meal) return res.status(404).json({ message: 'TheMealDB recipe not found' });
  res.json(meal);
}));

// Generate an AI nutrition estimate once, then reuse the saved result for this recipe.
router.post('/nutrition', asyncHandler(async (req, res) => {
  const user = await User.findById(req.auth.userId);
  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }

  const mealName = normalizeMealName(req.body?.name);
  const numericMealId = Number(req.body?.mealId);
  const mealId = Number.isInteger(numericMealId) && numericMealId > 0 ? numericMealId : undefined;
  const requestedSource = typeof req.body?.source === 'string' ? req.body.source : 'spoonacular';
  const source = RECIPE_SOURCES.has(requestedSource) ? requestedSource : 'spoonacular';
  const diets = Array.isArray(req.body?.diets)
    ? req.body.diets
        .filter((diet) => typeof diet === 'string')
        .map((diet) => normalizeMealName(diet).slice(0, 40))
        .filter(Boolean)
        .slice(0, 8)
    : [];

  if (!mealName || mealName.length > 160) {
    return res.status(400).json({ message: 'A valid meal name is required' });
  }

  const lookupKey = nutritionLookupKey(source, mealId, mealName);
  const cachedEstimate = await NutritionEstimate.findOne({ lookupKey });
  if (cachedEstimate) {
    return res.json(serializeEstimate(cachedEstimate, true));
  }

  if (isRateLimited(String(user._id))) {
    return res.status(429).json({ message: 'Too many new nutrition estimates. Please try again in a few minutes.' });
  }

  try {
    const { estimate, model } = await estimateNutrition({ mealName, diets });
    const savedEstimate = await NutritionEstimate.findOneAndUpdate(
      { lookupKey },
      {
        $setOnInsert: {
          lookupKey,
          mealId,
          source,
          mealName,
          ...estimate,
          model
        }
      },
      { upsert: true, returnDocument: 'after', setDefaultsOnInsert: true }
    );

    res.status(201).json(serializeEstimate(savedEstimate, false));
  } catch (error) {
    if (error instanceof NutritionEstimatorError) {
      return res.status(error.status).json({ message: error.message });
    }
    throw error;
  }
}));

export default router;
