const jwt = require('jsonwebtoken');

const SECRET_KEY = 'jwt_secret_key'; // Use same secret as in login

const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];

  // Expected format: "Bearer <token>"
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ message: 'Access denied. No token provided.' });
  }

  jwt.verify(token, SECRET_KEY, (err, user) => {
    if (err) {
      return res.status(403).json({ message: 'Invalid or expired token.' });
    }

    req.user = user; // Attach decoded user info to the request
    next();
  });
};

module.exports = { authenticateToken };
