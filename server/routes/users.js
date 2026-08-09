import express from 'express';
import bcrypt from 'bcryptjs';
import { rateLimit } from 'express-rate-limit';
import User from '../../db/models/User.js';
import { asyncHandler } from '../middleware/asyncHandler.js';
import { serializeUser } from '../services/userAccess.js';
import { issueAuthToken, requireAuth, requireSelf } from '../middleware/requireAuth.js';

const router = express.Router();
const SALT_ROUNDS = 10;
const HEALTH_RANGES = {
  age: { min: 13, max: 120 },
  kg: { min: 25, max: 350 },
  lb: { min: 55, max: 772 },
  feet: { min: 3, max: 8 },
  inches: { min: 0, max: 11 }
};
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 30,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  message: { message: 'Too many account attempts. Please try again later.' }
});

function integerInRange(value, { min, max }) {
  const numericValue = Number(value);
  return Number.isInteger(numericValue) && numericValue >= min && numericValue <= max
    ? numericValue
    : null;
}

function parseHealthProfile(value) {
  const unit = value?.weight?.unit;
  const age = integerInRange(value?.age, HEALTH_RANGES.age);
  const weightValue = unit === 'kg' || unit === 'lb'
    ? integerInRange(value?.weight?.value, HEALTH_RANGES[unit])
    : null;
  const feet = integerInRange(value?.height?.feet, HEALTH_RANGES.feet);
  const inches = integerInRange(value?.height?.inches, HEALTH_RANGES.inches);

  if (age === null || weightValue === null || feet === null || inches === null) return null;
  return {
    age,
    weight: { value: weightValue, unit },
    height: { feet, inches }
  };
}

// Register a new user with a unique username and password.
router.post('/register', authLimiter, asyncHandler(async (req, res) => {
  const { username, password, preferences } = req.body;
  const normalizedUsername = typeof username === 'string' ? username.trim() : '';
  const healthProfile = parseHealthProfile(req.body?.healthProfile);

  if (!normalizedUsername || typeof password !== 'string') {
    return res.status(400).json({ message: 'Username and password are required' });
  }
  if (normalizedUsername.length < 3 || normalizedUsername.length > 30) {
    return res.status(400).json({ message: 'Username must be between 3 and 30 characters' });
  }
  if (password.length < 8 || Buffer.byteLength(password, 'utf8') > 72) {
    return res.status(400).json({ message: 'Password must be between 8 and 72 bytes' });
  }
  if (!healthProfile) {
    return res.status(400).json({
      message: 'Choose a valid age, weight, weight unit, and height to create your account'
    });
  }

  const existingUser = await User.findOne({ username: normalizedUsername });
  if (existingUser) {
    return res.status(409).json({ message: 'That username is already registered' });
  }

  const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);
  const newUser = await User.create({
    username: normalizedUsername,
    password: hashedPassword,
    preferences: Array.isArray(preferences) ? preferences.slice(0, 12) : [],
    healthProfile
  });

  res.status(201).json({ user: serializeUser(newUser), token: issueAuthToken(newUser._id) });
}));

// All accounts sign in with their username and password.
router.post('/login', authLimiter, asyncHandler(async (req, res) => {
  const username = typeof req.body?.username === 'string' ? req.body.username.trim() : '';
  const password = typeof req.body?.password === 'string' ? req.body.password : '';
  const user = await User.findOne({ username });

  if (!user || !(await bcrypt.compare(password, user.password))) {
    return res.status(401).json({ message: 'Invalid credentials' });
  }

  res.json({ message: 'Login successful', userId: user._id, token: issueAuthToken(user._id) });
}));

router.get('/:id', requireAuth, requireSelf, asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id).select('-password');
  if (!user) return res.status(404).json({ message: 'User not found' });
  res.json(serializeUser(user));
}));

router.put('/:id/preferences', requireAuth, requireSelf, asyncHandler(async (req, res) => {
  const preferences = Array.isArray(req.body?.preferences) ? req.body.preferences.slice(0, 12) : [];
  const updatedUser = await User.findByIdAndUpdate(
    req.params.id,
    { preferences },
    { returnDocument: 'after' }
  ).select('-password');

  if (!updatedUser) return res.status(404).json({ message: 'User not found' });
  res.json(serializeUser(updatedUser));
}));

export default router;
