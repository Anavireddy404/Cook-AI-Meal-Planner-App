import express from 'express';
import { randomUUID } from 'node:crypto';
import MealPlan from '../../db/models/MealPlan.js';
import User from '../../db/models/User.js';
import { asyncHandler } from '../middleware/asyncHandler.js';
import { requireAuth, requireSelf } from '../middleware/requireAuth.js';
import { buildDailyNutritionSummary } from '../services/nutritionSummary.js';

const router = express.Router();
const MEAL_TYPES = new Set(['breakfast', 'lunch', 'dinner']);
const MEAL_SOURCES = new Set(['spoonacular', 'themealdb', 'custom', 'ai']);

router.use(requireAuth);

// Calculate all seven daily totals from cached meal estimates. Any uncached
// meals are estimated together in one LLM request and then cached.
router.get('/nutrition-summary/:userId', requireSelf, asyncHandler(async (req, res) => {
  const week = Number(req.query.week ?? 1);
  if (!Number.isInteger(week) || week < 1 || week > 52) {
    return res.status(400).json({ message: 'Week must be between 1 and 52' });
  }

  const [user, mealPlan] = await Promise.all([
    User.findById(req.params.userId),
    MealPlan.findOne({ user_id: req.params.userId, week })
  ]);
  if (!user) return res.status(404).json({ message: 'User not found' });

  res.json(await buildDailyNutritionSummary({ user, mealPlan }));
}));

// Get all meal plans for a user
router.get('/:userId', requireSelf, asyncHandler(async (req, res) => {
  const mealplans = await MealPlan.find({ user_id: req.params.userId });
  res.json(mealplans);
}));

// Add a new meal plan or add meal to existing plan
router.post('/', asyncHandler(async (req, res) => {
  const { userId, week, meal, mealplanId } = req.body;

  if (!userId || !week || !meal) {
    return res.status(400).json({ message: 'userId, week, and meal are required' });
  }
  if (String(userId) !== String(req.auth.userId)) {
    return res.status(403).json({ message: 'You cannot edit another account' });
  }

  const mealType = meal.mealType ?? 'dinner';
  if (!MEAL_TYPES.has(mealType)) {
    return res.status(400).json({ message: 'mealType must be breakfast, lunch, or dinner' });
  }
  if (meal.source && !MEAL_SOURCES.has(meal.source)) {
    return res.status(400).json({ message: 'Unknown meal source' });
  }

  const mealEntry = {
    ...meal,
    entryId: randomUUID(),
    mealType,
    source: meal.source ?? 'spoonacular'
  };

  if (mealplanId) {
    const updatedPlan = await MealPlan.findOneAndUpdate(
      { _id: mealplanId, user_id: req.auth.userId },
      { $push: { meals: mealEntry } },
      { returnDocument: 'after' }
    );

    if (!updatedPlan) {
      return res.status(404).json({ message: 'Meal plan not found' });
    }

    return res.status(201).json(updatedPlan);
  }

  const newMealPlan = await MealPlan.create({ user_id: userId, week, meals: [mealEntry] });
  res.status(201).json(newMealPlan);
}));

// Delete a meal plan
router.delete('/:id', asyncHandler(async (req, res) => {
  const deleted = await MealPlan.findOneAndDelete({ _id: req.params.id, user_id: req.auth.userId });

  if (!deleted) {
    return res.status(404).json({ message: 'Meal plan not found' });
  }

  res.json({ message: 'Meal plan deleted', deletedId: deleted._id });
}));

// Remove one saved meal entry without affecting the same recipe in another slot.
router.delete('/:id/meals/by-entry/:entryId', asyncHandler(async (req, res) => {
  const mealplan = await MealPlan.findOneAndUpdate(
    { _id: req.params.id, user_id: req.auth.userId },
    { $pull: { meals: { entryId: req.params.entryId } } },
    { returnDocument: 'after' }
  );

  if (!mealplan) {
    return res.status(404).json({ message: 'Meal plan not found' });
  }

  res.json(mealplan);
}));

// Remove a single meal from a meal plan
router.delete('/:id/meals/:mealId', asyncHandler(async (req, res) => {
  const mealplan = await MealPlan.findOneAndUpdate(
    { _id: req.params.id, user_id: req.auth.userId },
    { $pull: { meals: { mealId: parseInt(req.params.mealId) } } },
    { returnDocument: 'after' }
  );

  if (!mealplan) {
    return res.status(404).json({ message: 'Meal plan not found' });
  }

  res.json(mealplan);
}));

export default router;
