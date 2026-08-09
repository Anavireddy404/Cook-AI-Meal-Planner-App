import mongoose from 'mongoose';

const weightSchema = new mongoose.Schema(
  {
    value: { type: Number, required: true },
    unit: { type: String, enum: ['kg', 'lb'], required: true }
  },
  { _id: false }
);

const heightSchema = new mongoose.Schema(
  {
    feet: { type: Number, required: true, min: 3, max: 8 },
    inches: { type: Number, required: true, min: 0, max: 11 }
  },
  { _id: false }
);

const healthProfileSchema = new mongoose.Schema(
  {
    age: { type: Number, required: true, min: 13, max: 120 },
    weight: { type: weightSchema, required: true },
    height: { type: heightSchema, required: true }
  },
  { _id: false }
);

const userSchema = new mongoose.Schema(
  {
    username: { type: String, required: true, unique: true, trim: true },
    password: { type: String, required: true },
    preferences: { type: [String], default: [] },
    healthProfile: { type: healthProfileSchema },
    subscription: {
      plan: { type: String, enum: ['free', 'plus'], default: 'free' },
      status: {
        type: String,
        enum: ['inactive', 'active', 'trialing', 'past_due', 'canceled'],
        default: 'inactive'
      },
      startedAt: Date,
      currentPeriodEnd: Date
    },
    stripeCustomerId: { type: String, select: false },
    stripeSubscriptionId: { type: String, select: false }
  },
  { timestamps: true }
);

const User = mongoose.model('User', userSchema);

export default User;
