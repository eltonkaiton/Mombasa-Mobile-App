import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';

dotenv.config();

const JWT_SECRET = process.env.JWT_SECRET || 'super_secure_mombasa_token_123';

// Generic role-based authentication middleware
export const authenticateRole = (requiredRole) => {
  return (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(403).json({ message: 'No token provided' });
    }

    const token = authHeader.split(' ')[1];
    try {
      const decoded = jwt.verify(token, JWT_SECRET);

      // Check role
      if (!decoded.role || decoded.role.toLowerCase() !== requiredRole.toLowerCase()) {
        return res.status(403).json({ message: `Access denied. ${requiredRole} only.` });
      }

      req.user = decoded;
      next();
    } catch (err) {
      console.error('Token error:', err);
      return res.status(403).json({ message: 'Invalid or expired token' });
    }
  };
};

// Predefined middleware
export const authenticateInventoryToken = authenticateRole('inventory');
export const authenticateFerryCrewToken = authenticateRole('ferrycrew');
export const authenticateAdminToken = authenticateRole('admin');
export const authenticateStaffToken = authenticateRole('staff'); // ✅ Added staff
