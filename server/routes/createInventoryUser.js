import express from 'express';
import bcrypt from 'bcryptjs';
import User from '../models/User.js';

const router = express.Router();

// =============================
// Create Inventory User
// =============================
router.post('/create-inventory', async (req, res) => {
  const { full_name, email, password, phone } = req.body;

  try {
    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: 'User already exists with that email' });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create new user with role 'inventory'
    const newUser = new User({
      full_name,
      email,
      password: hashedPassword,
      phone,
      role: 'inventory',
    });

    await newUser.save();

    res.status(201).json({
      message: 'Inventory user created successfully',
      user: {
        id: newUser._id,
        full_name: newUser.full_name,
        email: newUser.email,
        phone: newUser.phone,
        role: newUser.role,
      },
    });
  } catch (error) {
    console.error('Create inventory user error:', error);
    res.status(500).json({ message: 'Server error. Could not create user.' });
  }
});

export default router;
