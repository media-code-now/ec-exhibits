import jwt from 'jsonwebtoken';

const SECRET = process.env.JWT_SECRET ?? 'insecure-dev-secret';

function decodeToken(token) {
  if (!token) return null;
  try {
    return jwt.verify(token, SECRET);
  } catch (error) {
    return null;
  }
}

export const authMiddleware = {
  http(req, res, next) {
    const header = req.headers.authorization ?? '';
    const [, token] = header.split(' ');
    const payload = decodeToken(token);
    if (!payload) {
      return res.status(401).json({ error: 'Unauthorised' });
    }
    req.user = payload;
    return next();
  },
  socket(socket, next) {
    const token = socket.handshake.auth?.token;
    const payload = decodeToken(token);
    if (!payload) {
      return next(new Error('Unauthorised'));
    }
    // Normalize payload structure - JWT has 'userId' but code expects 'id'
    socket.data.user = {
      id: payload.userId || payload.id,
      userId: payload.userId || payload.id,
      email: payload.email,
      role: payload.role,
      displayName: payload.displayName
    };
    return next();
  }
};

export function issueToken(user) {
  return jwt.sign(user, SECRET, { expiresIn: '12h' });
}
