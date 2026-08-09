import NutritionEstimate from '../../db/models/NutritionEstimate.js';
import { estimateNutritionBatch } from './nutritionEstimator.js';

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const VALID_SOURCES = new Set(['spoonacular', 'themealdb', 'custom', 'ai']);
const NUTRIENT_FIELDS = [
  'calories',
  'proteinGrams',
  'carbsGrams',
  'fatGrams',
  'fiberGrams',
  'sugarGrams',
  'sodiumMg'
];

function clamp(value, minimum, maximum) {
  return Math.min(maximum, Math.max(minimum, value));
}

function roundTo(value, precision = 1) {
  const factor = 10 ** precision;
  return Math.round(value * factor) / factor;
}

function weightInKilograms(weight) {
  const value = Number(weight?.value);
  if (!Number.isFinite(value) || value <= 0) return null;
  return weight.unit === 'lb' ? value / 2.20462 : value;
}

export function calculateNutritionTargets(healthProfile) {
  const age = Number(healthProfile?.age);
  const weightKg = weightInKilograms(healthProfile?.weight);
  const heightCm = (Number(healthProfile?.height?.feet) * 12 + Number(healthProfile?.height?.inches)) * 2.54;
  const canPersonalize = age >= 18 && age <= 120 && weightKg && heightCm >= 90 && heightCm <= 275;

  let calories = 2_000;
  if (canPersonalize) {
    // Uses the midpoint of the sex-specific resting-energy constants because
    // Cook currently collects neither sex nor activity. A conservative 1.4
    // activity factor turns it into a planning reference, not a prescription.
    const neutralRestingEnergy = 10 * weightKg + 6.25 * heightCm - 5 * age - 78;
    calories = clamp(Math.round((neutralRestingEnergy * 1.4) / 50) * 50, 1_200, 4_000);
  }

  const referenceWeightKg = canPersonalize ? weightKg : 70;
  return {
    calories,
    proteinGrams: Math.round(referenceWeightKg * 0.8),
    carbsGrams: Math.round((calories * 0.5) / 4),
    fatGrams: Math.round((calories * 0.3) / 9),
    fiberGrams: Math.round((calories / 1_000) * 14),
    sodiumMg: 2_300,
    personalized: Boolean(canPersonalize),
    basis: canPersonalize
      ? 'Estimated from age, height, and weight with a very-light activity assumption.'
      : 'General adult reference because a complete adult planning profile is unavailable.'
  };
}

function mealIdentity(meal) {
  const name = typeof meal?.name === 'string' ? meal.name.trim().replace(/\s+/g, ' ') : 'Meal';
  const numericId = Number(meal?.mealId);
  const mealId = Number.isInteger(numericId) && numericId > 0 ? numericId : undefined;
  const source = VALID_SOURCES.has(meal?.source) ? meal.source : 'spoonacular';
  const lookupKey = mealId
    ? `recipe:${source}:${mealId}`
    : `name:${name.toLocaleLowerCase('en-US')}`;

  return { lookupKey, mealId, source, name };
}

function fallbackEstimate(meal) {
  const providedCalories = Number(meal.estimatedCalories);
  const defaultCalories = {
    breakfast: 450,
    lunch: 650,
    dinner: 750
  }[meal.mealType] ?? 600;
  const calories = Number.isFinite(providedCalories) && providedCalories >= 50 && providedCalories <= 5_000
    ? Math.round(providedCalories)
    : defaultCalories;

  return {
    servingDescription: 'One typical serving',
    calories,
    proteinGrams: roundTo((calories * 0.2) / 4),
    carbsGrams: roundTo((calories * 0.5) / 4),
    fatGrams: roundTo((calories * 0.3) / 9),
    fiberGrams: roundTo(Math.max(3, (calories / 1_000) * 10)),
    sugarGrams: roundTo((calories * 0.08) / 4),
    sodiumMg: Math.round(calories * 0.85),
    confidence: 'low',
    summary: 'Temporary logic-based estimate used because the AI nutrition service was unavailable.'
  };
}

async function estimatesForMeals(meals) {
  const uniqueMeals = new Map();
  const mealEntries = meals.map((meal) => {
    const identity = mealIdentity(meal);
    if (!uniqueMeals.has(identity.lookupKey)) uniqueMeals.set(identity.lookupKey, { meal, ...identity });
    return { meal, ...identity };
  });

  const lookupKeys = [...uniqueMeals.keys()];
  const cached = lookupKeys.length
    ? await NutritionEstimate.find({ lookupKey: { $in: lookupKeys } })
    : [];
  const estimates = new Map(cached.map((estimate) => [estimate.lookupKey, { value: estimate, kind: 'cached' }]));
  const missing = [...uniqueMeals.values()].filter((entry) => !estimates.has(entry.lookupKey));

  if (missing.length) {
    try {
      const generated = await estimateNutritionBatch({
        meals: missing.map((entry) => ({
          key: entry.lookupKey,
          name: entry.name,
          mealType: entry.meal.mealType,
          diets: entry.meal.diets,
          ingredients: entry.meal.ingredients,
          estimatedCalories: entry.meal.estimatedCalories
        }))
      });

      await Promise.all(generated.estimates.map(async ({ key, estimate }) => {
        const entry = uniqueMeals.get(key);
        const saved = await NutritionEstimate.findOneAndUpdate(
          { lookupKey: key },
          {
            $setOnInsert: {
              lookupKey: key,
              mealId: entry.mealId,
              source: entry.source,
              mealName: entry.name,
              ...estimate,
              model: generated.model
            }
          },
          { upsert: true, returnDocument: 'after', setDefaultsOnInsert: true }
        );
        estimates.set(key, { value: saved, kind: 'ai' });
      }));
    } catch (error) {
      console.warn('Using logic-based nutrition summary estimates', {
        reason: error?.message,
        missingMeals: missing.length
      });
      for (const entry of missing) {
        estimates.set(entry.lookupKey, { value: fallbackEstimate(entry.meal), kind: 'logic' });
      }
    }
  }

  return mealEntries.map((entry) => ({
    ...entry,
    estimate: estimates.get(entry.lookupKey).value,
    estimateKind: estimates.get(entry.lookupKey).kind
  }));
}

function emptyTotals() {
  return Object.fromEntries(NUTRIENT_FIELDS.map((field) => [field, 0]));
}

function statusFor(progressPercent, mealCount) {
  if (!mealCount) return 'empty';
  if (progressPercent < 70) return 'building';
  if (progressPercent <= 115) return 'on_track';
  return 'over_reference';
}

export async function buildDailyNutritionSummary({ user, mealPlan }) {
  const targets = calculateNutritionTargets(user?.healthProfile);
  const mealEstimates = await estimatesForMeals(mealPlan?.meals ?? []);
  const dayMap = new Map(DAYS.map((day) => [day, {
    day,
    mealCount: 0,
    logicEstimateCount: 0,
    totals: emptyTotals()
  }]));

  for (const entry of mealEstimates) {
    const day = dayMap.has(entry.meal.day) ? entry.meal.day : 'Monday';
    const summary = dayMap.get(day);
    summary.mealCount += 1;
    if (entry.estimateKind === 'logic') summary.logicEstimateCount += 1;
    for (const field of NUTRIENT_FIELDS) {
      summary.totals[field] += Number(entry.estimate[field]) || 0;
    }
  }

  const days = [...dayMap.values()].map((day) => {
    const totals = Object.fromEntries(
      Object.entries(day.totals).map(([field, value]) => [
        field,
        field === 'calories' || field === 'sodiumMg' ? Math.round(value) : roundTo(value)
      ])
    );
    const calorieProgressPercent = targets.calories
      ? Math.round((totals.calories / targets.calories) * 100)
      : 0;

    return {
      ...day,
      totals,
      calorieProgressPercent,
      status: statusFor(calorieProgressPercent, day.mealCount)
    };
  });

  return {
    mealPlanId: mealPlan?._id ?? null,
    week: mealPlan?.week ?? 1,
    targets,
    days,
    generatedAt: new Date().toISOString()
  };
}
