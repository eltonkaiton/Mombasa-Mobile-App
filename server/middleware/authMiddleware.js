import jwt from 'jsonwebtoken';

export const authenticateToken = (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ success: false, message: 'No token provided' });
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'jwt_secret_key');
    req.user = decoded; // decoded should contain user's id and role
    next();
  } catch (err) {
    console.error('Token error:', err);
    res.status(401).json({ success: false, message: 'Invalid token' });
  }
};
