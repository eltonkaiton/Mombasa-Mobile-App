import express from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';

import User from '../models/User.js';
import Supplier from '../models/Supplier.js';
import Staff from '../models/Staff.js';
import Booking from '../models/Booking.js';

dotenv.config();

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'jwt_secret_key';

// ✅ JWT Middleware
export const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) return res.status(401).json({ message: 'Access token missing' });

  jwt.verify(token, JWT_SECRET, (err, decoded) => {
    if (err) return res.status(403).json({ message: 'Invalid or expired token' });
    req.user = decoded;
    next();
  });
};

// ✅ Register User
router.post('/register', async (req, res) => {
  const { full_name, email, phone, password } = req.body;
  if (!full_name || !email || !password) {
    return res.status(400).json({ message: 'Full name, email, and password are required.' });
  }

  try {
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(409).json({ message: 'Email already registered.' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await User.create({
      full_name,
      email,
      phone,
      password: hashedPassword,
      role: 'passenger',
      status: 'pending',
    });

    res.status(201).json({ message: 'User registered successfully. Please wait for approval.' });
  } catch (err) {
    console.error('Registration error:', err);
    res.status(500).json({ message: 'Server error during registration.' });
  }
});

// ✅ Login (for users and inventory staff via role)
router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ message: 'Email and password are required.' });
  }

  try {
    // Try normal user first
    let user = await User.findOne({ email });

    if (user) {
      if (!['active', 'approved'].includes(user.status)) {
        return res.status(403).json({ message: 'Your account has not been approved yet.' });
      }

      const validPassword = await bcrypt.compare(password, user.password);
      if (!validPassword) {
        return res.status(401).json({ message: 'Invalid email or password.' });
      }

      const token = jwt.sign(
        { id: user._id, email: user.email, role: user.role },
        JWT_SECRET,
        { expiresIn: '7d' }
      );

      return res.json({
        message: 'Login successful',
        token,
        user: {
          id: user._id,
          full_name: user.full_name,
          email: user.email,
          phone: user.phone,
          role: user.role,
          status: user.status,
        },
      });
    }

    // Fallback: try inventory staff login via Staff collection
    const staff = await Staff.findOne({ email });

    if (!staff || staff.category !== 'inventory') {
      return res.status(401).json({ message: 'Invalid credentials or not inventory staff.' });
    }

    if (staff.status !== 'active') {
      return res.status(403).json({ message: 'Staff account is not active.' });
    }

    const isMatch = await bcrypt.compare(password, staff.password);
    if (!isMatch) return res.status(401).json({ message: 'Invalid credentials.' });

    const token = jwt.sign(
      { id: staff._id, email: staff.email, role: 'inventory' },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    return res.json({
      message: 'Login successful',
      token,
      user: {
        id: staff._id,
        full_name: staff.full_name,
        email: staff.email,
        role: 'inventory',
        status: staff.status,
      },
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ message: 'Server error during login.' });
  }
});

// ✅ Supplier Login
router.post('/suppliers/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ message: 'Email and password are required.' });

  try {
    const supplier = await Supplier.findOne({ email });
    if (!supplier) return res.status(401).json({ message: 'Invalid email or password.' });

    if (supplier.status !== 'active') {
      return res.status(403).json({ message: 'Your account is not active.' });
    }

    const match = await bcrypt.compare(password, supplier.password);
    if (!match) return res.status(401).json({ message: 'Invalid email or password.' });

    const token = jwt.sign({ id: supplier._id, email: supplier.email, role: 'supplier' }, JWT_SECRET, { expiresIn: '7d' });

    res.json({
      message: 'Login successful',
      token,
      user: {
        id: supplier._id,
        full_name: supplier.name,
        email: supplier.email,
        role: 'supplier',
        status: supplier.status,
      },
    });
  } catch (err) {
    console.error('Supplier login error:', err);
    res.status(500).json({ message: 'Server error during login.' });
  }
});

// ✅ Dashboard
router.get('/dashboard', authenticateToken, async (req, res) => {
  const userId = req.user.id;

  try {
    const totalBookings = await Booking.countDocuments({ user_id: userId });
    const pendingBookings = await Booking.countDocuments({ user_id: userId, booking_status: 'pending' });
    const completedBookings = await Booking.countDocuments({ user_id: userId, booking_status: 'completed' });

    const recentBookings = await Booking.find({ user_id: userId })
      .sort({ travel_date: -1, travel_time: -1 })
      .limit(5)
      .select('route booking_type travel_date travel_time booking_status');

    res.json({
      stats: { totalBookings, pendingBookings, completedBookings },
      recentBookings,
    });
  } catch (err) {
    console.error('Dashboard error:', err);
    res.status(500).json({ message: 'Server error fetching dashboard data.' });
  }
});

// ✅ Get Current User
router.get('/me', authenticateToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('full_name email phone role status');
    if (!user) {
      return res.status(404).json({ message: 'User not found.' });
    }

    res.json({ user: { id: user._id, ...user.toObject() } });
  } catch (err) {
    console.error('Get user error:', err);
    res.status(500).json({ message: 'Failed to fetch user data.' });
  }
});

export default router;