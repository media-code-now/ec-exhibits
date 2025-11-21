import jwt from 'jsonwebtoken';

/**
 * Authentication middleware that verifies JWT token from HTTP-only cookie
 * 
 * Reads token from req.cookies.token
 * Verifies using JWT_SECRET
 * Sets req.user = { id: userId, email, role } if valid
 * Returns 401 if missing or invalid
 */
export function authRequired(req, res, next) {
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
    req.user = {
      id: decoded.userId,
      email: decoded.email,
      role: decoded.role
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
