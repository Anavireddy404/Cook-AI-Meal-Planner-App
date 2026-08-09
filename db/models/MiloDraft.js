import mongoose from 'mongoose';

const generatedMealSchema = new mongoose.Schema(
  {
    mealType: { type: String, enum: ['breakfast', 'lunch', 'dinner'], required: true },
    name: { type: String, required: true, maxlength: 120 },
    description: { type: String, required: true, maxlength: 240 },
    ingredients: { type: [String], required: true },
    estimatedCalories: { type: Number, required: true, min: 50, max: 2500 }
  },
  { _id: false }
);

const generatedDaySchema = new mongoose.Schema(
  {
    day: {
      type: String,
      enum: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'],
      required: true
    },
    meals: { type: [generatedMealSchema], required: true }
  },
  { _id: false }
);

const miloDraftSchema = new mongoose.Schema(
  {
    user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    status: {
      type: String,
      enum: ['pending', 'approving', 'approved'],
      default: 'pending',
      index: true
    },
    plan: {
      title: { type: String, required: true, maxlength: 100 },
      overview: { type: String, required: true, maxlength: 300 },
      days: { type: [generatedDaySchema], required: true }
    },
    diets: { type: [String], default: [] },
    model: { type: String, required: true },
    approvedAt: Date,
    expiresAt: {
      type: Date,
      default: () => new Date(Date.now() + 24 * 60 * 60 * 1000),
      expires: 0
    }
  },
  { timestamps: true }
);

const MiloDraft = mongoose.model('MiloDraft', miloDraftSchema);

export default MiloDraft;
