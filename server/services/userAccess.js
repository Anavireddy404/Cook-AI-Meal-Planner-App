export function hasPlusAccess(user) {
  return Boolean(
    user?.subscription?.plan === 'plus' &&
      ['active', 'trialing'].includes(user.subscription.status)
  );
}

export function isPlannerPlusAvailable() {
  return process.env.PLANNER_PLUS_AVAILABLE === 'true';
}

export function isMiloPreviewAvailable() {
  if (process.env.NODE_ENV !== 'production') return true;
  return process.env.MILO_PREVIEW_AVAILABLE === 'true';
}

export function serializeUser(user) {
  const value = typeof user.toObject === 'function' ? user.toObject() : user;
  const joinedAt = value.createdAt ?? value._id?.getTimestamp?.() ?? null;
  const subscription = {
    plan: value.subscription?.plan ?? 'free',
    status: value.subscription?.status ?? 'inactive',
    startedAt: value.subscription?.startedAt ?? null,
    currentPeriodEnd: value.subscription?.currentPeriodEnd ?? null
  };

  return {
    _id: value._id,
    username: value.username,
    joinedAt,
    preferences: value.preferences ?? [],
    healthProfile: value.healthProfile ?? null,
    subscription,
    hasPlusAccess: hasPlusAccess({ subscription }),
    plannerPlusAvailable: isPlannerPlusAvailable(),
    miloPreviewAvailable: isMiloPreviewAvailable()
  };
}
