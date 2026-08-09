import express from 'express';
import { randomUUID } from 'node:crypto';
import { rateLimit } from 'express-rate-limit';
import MealPlan from '../../db/models/MealPlan.js';
import MiloDraft from '../../db/models/MiloDraft.js';
import User from '../../db/models/User.js';
import { asyncHandler } from '../middleware/asyncHandler.js';
import { generateMealPlan, PlanGeneratorError } from '../services/mealPlanGenerator.js';
import { askMilo, MiloAgentError } from '../services/miloAgent.js';
import { hasPlusAccess, isMiloPreviewAvailable, isPlannerPlusAvailable } from '../services/userAccess.js';
import { requireAuth } from '../middleware/requireAuth.js';

const router = express.Router();
const DAYS = new Set(['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']);
const MEAL_TYPES = new Set(['breakfast', 'lunch', 'dinner']);
const miloLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  message: { message: 'Milo has received too many requests. Please try again in a few minutes.' }
});

router.use(requireAuth);

async function requirePlus(userId, res) {
  if (!isPlannerPlusAvailable()) {
    res.status(503).json({ message: 'Custom meals and the AI planner are coming soon.' });
    return null;
  }
  const user = await User.findById(userId);
  if (!user) {
    res.status(404).json({ message: 'User not found' });
    return null;
  }
  if (!hasPlusAccess(user)) {
    res.status(403).json({ message: 'Planner Plus is required for AI and custom meals' });
    return null;
  }
  return user;
}

async function requireMiloAccess(userId, res) {
  const user = await User.findById(userId);
  if (!user) {
    res.status(404).json({ message: 'User not found' });
    return null;
  }
  if (isMiloPreviewAvailable()) return user;
  if (!isPlannerPlusAvailable()) {
    res.status(503).json({ message: 'Milo is still in private testing.' });
    return null;
  }
  if (!hasPlusAccess(user)) {
    res.status(403).json({ message: 'Planner Plus is required to use Milo' });
    return null;
  }
  return user;
}

function safeText(value, maxLength) {
  return typeof value === 'string' ? value.trim().slice(0, maxLength) : '';
}

function normalizeIngredients(value) {
  if (!Array.isArray(value)) return [];
  return value
    .filter((ingredient) => typeof ingredient === 'string')
    .map((ingredient) => ingredient.trim().slice(0, 80))
    .filter(Boolean)
    .slice(0, 12);
}

function validateSlot(day, mealType) {
  return DAYS.has(day) && MEAL_TYPES.has(mealType);
}

async function appendMeals(userId, week, meals) {
  let plan = await MealPlan.findOne({ user_id: userId, week });
  if (!plan) plan = new MealPlan({ user_id: userId, week, meals: [] });
  plan.meals.push(...meals);
  return plan.save();
}

function normalizeConversation(value) {
  if (!Array.isArray(value)) return [];
  return value
    .slice(-12)
    .map((message) => ({
      role: message?.role === 'assistant' ? 'assistant' : 'user',
      content: safeText(message?.content, 800)
    }))
    .filter((message) => message.content);
}

function planSlotKey(day, mealType) {
  return `${day}:${mealType}`;
}

function mealsFromDraft(draft, selectedSlots) {
  const seed = Date.now() * 100;
  return draft.plan.days.flatMap((day) => day.meals.map((meal) => ({ day: day.day, meal })))
    .filter(({ day, meal }) => selectedSlots.has(planSlotKey(day, meal.mealType)))
    .map(({ day, meal }, index) => ({
      entryId: randomUUID(),
      mealId: -(seed + index),
      name: meal.name,
      day,
      mealType: meal.mealType,
      source: 'ai',
      image: '',
      diets: draft.diets ?? [],
      description: meal.description,
      ingredients: normalizeIngredients(meal.ingredients),
      estimatedCalories: Math.round(meal.estimatedCalories)
    }));
}

router.post('/milo/chat', miloLimiter, asyncHandler(async (req, res) => {
  const user = await requireMiloAccess(req.auth.userId, res);
  if (!user) return;

  const messages = normalizeConversation(req.body?.messages);
  if (!messages.some((message) => message.role === 'user')) {
    return res.status(400).json({ message: 'Tell Milo what you want from your meal plan' });
  }

  const diets = Array.isArray(req.body?.diets)
    ? req.body.diets.map((diet) => safeText(diet, 40)).filter(Boolean).slice(0, 12)
    : [];
  const action = ['chat', 'revise', 'regenerate'].includes(req.body?.action)
    ? req.body.action
    : 'chat';

  let draft = null;
  if (action !== 'chat') {
    draft = await MiloDraft.findOne({
      _id: req.body?.draftId,
      user_id: user._id,
      status: 'pending'
    });
    if (!draft) return res.status(404).json({ message: 'This Milo draft is no longer available' });
  }

  try {
    const result = await askMilo({
      messages,
      diets,
      action,
      previousPlan: draft?.plan?.toObject?.() ?? draft?.plan ?? null
    });

    if (result.status === 'plan_ready') {
      if (draft) {
        draft.plan = result.plan;
        draft.diets = diets;
        draft.model = result.model;
        draft.expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
        await draft.save();
      } else {
        draft = await MiloDraft.create({
          user_id: user._id,
          plan: result.plan,
          diets,
          model: result.model
        });
      }
    }

    res.json({ ...result, draftId: draft ? String(draft._id) : null });
  } catch (error) {
    if (error instanceof MiloAgentError || error instanceof PlanGeneratorError) {
      return res.status(error.status).json({ message: error.message });
    }
    throw error;
  }
}));

router.post('/milo/:draftId/approve', asyncHandler(async (req, res) => {
  const user = await requireMiloAccess(req.auth.userId, res);
  if (!user) return;

  const selectedSlots = new Set(
    (Array.isArray(req.body?.selectedSlots) ? req.body.selectedSlots : [])
      .filter((slot) => typeof slot === 'string')
      .slice(0, 21)
  );
  if (!selectedSlots.size) return res.status(400).json({ message: 'Select at least one meal to approve' });

  const draft = await MiloDraft.findOneAndUpdate(
    { _id: req.params.draftId, user_id: user._id, status: 'pending' },
    { $set: { status: 'approving' } },
    { returnDocument: 'after' }
  );
  if (!draft) return res.status(409).json({ message: 'This plan was already approved or is no longer available' });

  try {
    const meals = mealsFromDraft(draft, selectedSlots);
    if (!meals.length) {
      draft.status = 'pending';
      await draft.save();
      return res.status(400).json({ message: 'The selected meals were not part of this draft' });
    }

    const mealPlan = await appendMeals(user._id, Number(req.body?.week) || 1, meals);
    draft.status = 'approved';
    draft.approvedAt = new Date();
    await draft.save();
    res.status(201).json({ mealPlan, addedCount: meals.length });
  } catch (error) {
    draft.status = 'pending';
    await draft.save().catch(() => {});
    throw error;
  }
}));

router.delete('/milo/:draftId', asyncHandler(async (req, res) => {
  const user = await requireMiloAccess(req.auth.userId, res);
  if (!user) return;

  await MiloDraft.deleteOne({
    _id: req.params.draftId,
    user_id: user._id,
    status: 'pending'
  });
  res.json({ cleared: true });
}));

router.post('/generate', asyncHandler(async (req, res) => {
  const user = await requirePlus(req.auth.userId, res);
  if (!user) return;

  const request = safeText(req.body?.request, 800);
  const diets = Array.isArray(req.body?.diets)
    ? req.body.diets.map((diet) => safeText(diet, 40)).filter(Boolean).slice(0, 12)
    : [];
  if (request.length < 10) {
    return res.status(400).json({ message: 'Tell the planner a little more about what you need' });
  }

  try {
    const result = await generateMealPlan({ request, diets });
    res.json(result);
  } catch (error) {
    if (error instanceof PlanGeneratorError) {
      return res.status(error.status).json({ message: error.message });
    }
    throw error;
  }
}));

router.post('/approve', asyncHandler(async (req, res) => {
  const user = await requirePlus(req.auth.userId, res);
  if (!user) return;

  const requestedMeals = Array.isArray(req.body?.meals) ? req.body.meals.slice(0, 21) : [];
  if (!requestedMeals.length) return res.status(400).json({ message: 'Select at least one meal to approve' });

  const seed = Date.now() * 100;
  const meals = requestedMeals.map((meal, index) => {
    const day = safeText(meal.day, 12);
    const mealType = safeText(meal.mealType, 12).toLowerCase();
    const name = safeText(meal.name, 120);
    if (!validateSlot(day, mealType) || !name) {
      const error = new Error('The approved plan contains an invalid meal');
      error.status = 400;
      throw error;
    }
    const calories = Number(meal.estimatedCalories);
    return {
      entryId: randomUUID(),
      mealId: -(seed + index),
      name,
      day,
      mealType,
      source: 'ai',
      image: '',
      diets: Array.isArray(meal.diets) ? meal.diets.slice(0, 12) : [],
      description: safeText(meal.description, 500),
      ingredients: normalizeIngredients(meal.ingredients),
      estimatedCalories: Number.isFinite(calories) ? Math.round(calories) : undefined
    };
  });

  const plan = await appendMeals(user._id, Number(req.body?.week) || 1, meals);
  res.status(201).json(plan);
}));

router.post('/custom-meal', asyncHandler(async (req, res) => {
  const user = await requirePlus(req.auth.userId, res);
  if (!user) return;

  const meal = req.body?.meal ?? {};
  const day = safeText(meal.day, 12);
  const mealType = safeText(meal.mealType, 12).toLowerCase();
  const name = safeText(meal.name, 120);
  if (!name || !validateSlot(day, mealType)) {
    return res.status(400).json({ message: 'Meal name, day, and meal time are required' });
  }

  const calories = Number(meal.estimatedCalories);
  const entry = {
    entryId: randomUUID(),
    mealId: -Date.now(),
    name,
    day,
    mealType,
    source: 'custom',
    image: '',
    diets: Array.isArray(meal.diets) ? meal.diets.slice(0, 12) : [],
    description: safeText(meal.description, 500),
    ingredients: normalizeIngredients(meal.ingredients),
    estimatedCalories: Number.isFinite(calories) && calories > 0 ? Math.round(calories) : undefined
  };

  const plan = await appendMeals(user._id, Number(req.body?.week) || 1, [entry]);
  res.status(201).json(plan);
}));

export default router;
