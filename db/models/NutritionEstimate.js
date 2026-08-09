import mongoose from 'mongoose';

const nutritionEstimateSchema = new mongoose.Schema(
  {
    lookupKey: { type: String, required: true, unique: true, index: true },
    mealId: Number,
    source: {
      type: String,
      enum: ['spoonacular', 'themealdb', 'custom', 'ai'],
      default: 'spoonacular'
    },
    mealName: { type: String, required: true, trim: true, maxlength: 160 },
    servingDescription: { type: String, required: true, trim: true, maxlength: 120 },
    calories: { type: Number, required: true },
    proteinGrams: { type: Number, required: true },
    carbsGrams: { type: Number, required: true },
    fatGrams: { type: Number, required: true },
    fiberGrams: { type: Number, required: true },
    sugarGrams: { type: Number, required: true },
    sodiumMg: { type: Number, required: true },
    confidence: { type: String, enum: ['low', 'medium', 'high'], required: true },
    summary: { type: String, required: true, trim: true, maxlength: 240 },
    model: { type: String, required: true }
  },
  { timestamps: true }
);

const NutritionEstimate = mongoose.model('NutritionEstimate', nutritionEstimateSchema);

export default NutritionEstimate;
