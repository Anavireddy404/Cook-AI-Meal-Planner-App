import mongoose from 'mongoose';

const mealSchema = new mongoose.Schema(
  {
    entryId: String,
    mealId: { type: Number, required: true },
    name: { type: String, required: true },
    diets: { type: [String], default: [] },
    image: String,
    day: String,
    mealType: { type: String, enum: ['breakfast', 'lunch', 'dinner'] },
    source: {
      type: String,
      enum: ['spoonacular', 'themealdb', 'custom', 'ai'],
      default: 'spoonacular'
    },
    description: { type: String, maxlength: 500 },
    ingredients: { type: [String], default: [] },
    estimatedCalories: Number
  },
  { _id: false }
);

const mealPlanSchema = new mongoose.Schema(
  {
    user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    week: { type: Number, required: true },
    meals: { type: [mealSchema], default: [] }
  },
  { timestamps: true }
);

const MealPlan = mongoose.model('MealPlan', mealPlanSchema);

export default MealPlan;
