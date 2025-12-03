import jwt from 'jsonwebtoken';
import prisma from '../lib/db.js';

/**
 * Authentication middleware that verifies JWT token from HTTP-only cookie
 * 
 * Reads token from req.cookies.token
 * Verifies using JWT_SECRET
 * Sets req.user = { id: userId, email, role, displayName } if valid
 * Returns 401 if missing or invalid
 */
export async function authRequired(req, res, next) {
  try {
    // 1. Read token from cookies OR Authorization header
    let token = req.cookies.token;
    
    // If no cookie, check Authorization header (for development)
    if (!token) {
      const authHeader = req.headers.authorization;
      if (authHeader && authHeader.startsWith('Bearer ')) {
        token = authHeader.substring(7);
      }
    }

    // 2. Check if token exists
    if (!token) {
      console.log('[AUTH] No token found in cookies or Authorization header for', req.method, req.path);
      console.log('[AUTH] Cookies:', req.cookies);
      console.log('[AUTH] Authorization header:', req.headers.authorization);
      return res.status(401).json({ 
        message: 'Authentication required' 
      });
    }

    // 3. Verify token using JWT_SECRET
    const JWT_SECRET = process.env.JWT_SECRET;
    
    if (!JWT_SECRET) {
      console.error('[ERROR] JWT_SECRET not configured');
      return res.status(500).json({ 
        message: 'Server configuration error' 
      });
    }

    const decoded = jwt.verify(token, JWT_SECRET);

    // 4. Set req.user with decoded token data
    // If displayName is missing (old token), fetch from database
    let displayName = decoded.displayName;
    if (!displayName) {
      try {
        const user = await prisma.user.findUnique({
          where: { id: decoded.userId },
          select: { displayName: true }
        });
        displayName = user?.displayName || 'Unknown User';
      } catch (dbError) {
        console.error('[AUTH] Failed to fetch displayName from database:', dbError.message);
        displayName = 'Unknown User';
      }
    }

    req.user = {
      id: decoded.userId,
      userId: decoded.userId,
      email: decoded.email,
      role: decoded.role,
      displayName
    };
    
    console.log('[AUTH] ✅ Token verified successfully for user:', decoded.email);

    // 5. Continue to next middleware/route handler
    next();

  } catch (error) {
    // Token is invalid, expired, or malformed
    console.error('[ERROR] Token verification failed:', error.message);
    
    return res.status(401).json({ 
      message: 'Authentication required' 
    });
  }
}

// Alternative export for destructuring
export default authRequired;
