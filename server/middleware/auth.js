import jwt from 'jsonwebtoken';

const JWT_SECRET = 'super_secure_inventory_token_123'; // keep in .env in production

export const authenticateInventoryToken = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(403).json({ message: 'No token provided' });
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    if (decoded.category.toLowerCase() !== 'inventory') {
      return res.status(403).json({ message: 'Access denied. Inventory staff only.' });
    }
    req.user = decoded;
    next();
  } catch (err) {
    console.error('Token error:', err);
    return res.status(403).json({ message: 'Invalid or expired token' });
  }
};
