import jwt from 'jsonwebtoken';

const DEV_SECRET = 'cook-local-development-only-change-me';

function authSecret() {
  const secret = process.env.AUTH_SECRET?.trim();
  if (secret) return secret;
  if (process.env.NODE_ENV === 'production') {
    const error = new Error('Authentication is not configured');
    error.status = 503;
    throw error;
  }
  return DEV_SECRET;
}

export function issueAuthToken(userId) {
  return jwt.sign({ sub: String(userId) }, authSecret(), {
    expiresIn: '30d',
    issuer: 'cook-meal-planner',
    audience: 'cook-web'
  });
}

export function requireAuth(req, res, next) {
  const header = req.headers.authorization;
  const token = typeof header === 'string' && header.startsWith('Bearer ')
    ? header.slice('Bearer '.length).trim()
    : '';
  if (!token) return res.status(401).json({ message: 'Sign in to continue' });

  try {
    const payload = jwt.verify(token, authSecret(), {
      issuer: 'cook-meal-planner',
      audience: 'cook-web'
    });
    req.auth = { userId: payload.sub };
    next();
  } catch (error) {
    if (error.status) return next(error);
    return res.status(401).json({ message: 'Your session expired. Please sign in again.' });
  }
}

export function requireSelf(req, res, next) {
  if (String(req.params.id ?? req.params.userId) !== String(req.auth?.userId)) {
    return res.status(403).json({ message: 'You cannot access another account' });
  }
  next();
}
