import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import PDFDocument from 'pdfkit';
import Booking from '../models/Booking.js';
import Staff from '../models/Staff.js';
import Order from '../models/Order.js';
import axios from 'axios';

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'super_secure_finance_token';
const BASE_URL = process.env.BASE_URL || 'http://localhost:3000/api/finance';

// ============================
// Middleware
// ============================

// Authenticate finance staff
const authenticateFinanceToken = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(403).json({ message: 'No token provided' });
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    console.error('Token error:', err);
    return res.status(403).json({ message: 'Invalid or expired token' });
  }
};

// Check finance category
const checkFinanceCategory = (req, res, next) => {
  if (req.user.category !== 'finance') {
    return res.status(403).json({ message: 'Access denied. Finance staff only.' });
  }
  next();
};

// ============================
// Routes
// ============================

// Finance login
router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  try {
    if (!email || !password) return res.status(400).json({ message: 'Email and password required' });

    const staff = await Staff.findOne({ email });
    if (!staff || staff.category !== 'finance') {
      return res.status(401).json({ message: 'Invalid credentials or not finance staff' });
    }

    const isMatch = await bcrypt.compare(password, staff.password);
    if (!isMatch) return res.status(401).json({ message: 'Invalid credentials' });

    const token = jwt.sign({ id: staff._id, category: staff.category }, JWT_SECRET, { expiresIn: '1d' });

    res.json({
      token,
      user: { id: staff._id, full_name: staff.full_name, email: staff.email, category: staff.category },
    });
  } catch (err) {
    console.error('Finance login error:', err);
    res.status(500).json({ message: 'Server error during login' });
  }
});

// Get all bookings
router.get('/bookings', authenticateFinanceToken, checkFinanceCategory, async (req, res) => {
  try {
    const bookings = await Booking.find().populate('user_id', 'full_name').sort({ created_at: -1 });
    res.json({ bookings });
  } catch (err) {
    console.error('Fetch bookings error:', err);
    res.status(500).json({ message: 'Error fetching bookings' });
  }
});

// ============================
// Booking payment routes
// ============================

// Approve booking payment
router.post('/approve-payment', authenticateFinanceToken, checkFinanceCategory, async (req, res) => {
  const { bookingId } = req.body;
  try {
    const booking = await Booking.findByIdAndUpdate(
      bookingId,
      { payment_status: 'paid' },
      { new: true }
    );
    if (!booking) return res.status(404).json({ message: 'Booking not found' });
    res.json({ message: 'Payment approved successfully.', booking });
  } catch (err) {
    console.error('Approve payment error:', err);
    res.status(500).json({ message: 'Error approving payment' });
  }
});

// Reject booking payment
router.post('/reject-payment', authenticateFinanceToken, checkFinanceCategory, async (req, res) => {
  const { bookingId } = req.body;
  try {
    const booking = await Booking.findByIdAndUpdate(
      bookingId,
      { payment_status: 'rejected' },
      { new: true }
    );
    if (!booking) return res.status(404).json({ message: 'Booking not found' });
    res.json({ message: 'Payment rejected successfully.', booking });
  } catch (err) {
    console.error('Reject payment error:', err);
    res.status(500).json({ message: 'Error rejecting payment' });
  }
});

// Approve booking
router.post('/approve-booking', authenticateFinanceToken, checkFinanceCategory, async (req, res) => {
  const { bookingId } = req.body;
  try {
    const booking = await Booking.findByIdAndUpdate(
      bookingId,
      { booking_status: 'approved' },
      { new: true }
    );
    if (!booking) return res.status(404).json({ message: 'Booking not found' });
    res.json({ message: 'Booking approved successfully.', booking });
  } catch (err) {
    console.error('Approve booking error:', err);
    res.status(500).json({ message: 'Error approving booking' });
  }
});

// Place booking on ferry
router.post('/place-on-ferry', authenticateFinanceToken, checkFinanceCategory, async (req, res) => {
  const { bookingId, ferryName } = req.body;
  if (!bookingId || !ferryName) return res.status(400).json({ message: 'bookingId and ferryName required' });

  try {
    const booking = await Booking.findById(bookingId);
    if (!booking) return res.status(404).json({ message: 'Booking not found' });
    if (booking.booking_status !== 'approved') {
      return res.status(400).json({ message: 'Booking must be approved before assigning ferry' });
    }

    booking.ferry_name = ferryName;
    booking.booking_status = 'assigned';
    await booking.save();

    res.json({ message: 'Booking placed on ferry successfully', booking });
  } catch (err) {
    console.error('Place on ferry error:', err);
    res.status(500).json({ message: 'Error placing booking on ferry' });
  }
});

// ============================
// Orders routes
// ============================

// Fetch orders
router.get('/orders', authenticateFinanceToken, checkFinanceCategory, async (req, res) => {
  try {
    const orders = await Order.find()
      .populate('supplier_id', 'supplier_name')
      .populate('item_id', 'item_name')
      .sort({ created_at: -1 })
      .select('supplier_name item_name quantity amount status finance_status delivery_status created_at');
    res.json({ orders });
  } catch (err) {
    console.error('Fetch orders error:', err);
    res.status(500).json({ message: 'Error fetching orders' });
  }
});

// Approve order payment
router.post('/approve-order-payment', authenticateFinanceToken, checkFinanceCategory, async (req, res) => {
  const { orderId } = req.body;
  try {
    const order = await Order.findByIdAndUpdate(
      orderId,
      { finance_status: 'approved' },
      { new: true }
    );
    if (!order) return res.status(404).json({ message: 'Order not found' });
    res.json({ message: 'Order payment approved successfully', order });
  } catch (err) {
    console.error('Approve order payment error:', err);
    res.status(500).json({ message: 'Error approving order payment' });
  }
});

// Reject order payment
router.post('/reject-order-payment', authenticateFinanceToken, checkFinanceCategory, async (req, res) => {
  const { orderId } = req.body;
  try {
    const order = await Order.findByIdAndUpdate(
      orderId,
      { finance_status: 'rejected' },
      { new: true }
    );
    if (!order) return res.status(404).json({ message: 'Order not found' });
    res.json({ message: 'Order payment rejected successfully', order });
  } catch (err) {
    console.error('Reject order payment error:', err);
    res.status(500).json({ message: 'Error rejecting order payment' });
  }
});

// Optional: approve order without payment
router.post('/approve-order', authenticateFinanceToken, checkFinanceCategory, async (req, res) => {
  const { orderId } = req.body;
  try {
    const order = await Order.findByIdAndUpdate(
      orderId,
      { status: 'approved' },
      { new: true }
    );
    if (!order) return res.status(404).json({ message: 'Order not found' });
    res.json({ message: 'Order approved successfully', order });
  } catch (err) {
    console.error('Approve order error:', err);
    res.status(500).json({ message: 'Error approving order' });
  }
});

// Optional: reject order without payment
router.post('/reject-order', authenticateFinanceToken, checkFinanceCategory, async (req, res) => {
  const { orderId } = req.body;
  try {
    const order = await Order.findByIdAndUpdate(
      orderId,
      { status: 'rejected' },
      { new: true }
    );
    if (!order) return res.status(404).json({ message: 'Order not found' });
    res.json({ message: 'Order rejected successfully', order });
  } catch (err) {
    console.error('Reject order error:', err);
    res.status(500).json({ message: 'Error rejecting order' });
  }
});

// ============================
// Finance summary
// ============================

router.get('/summary', authenticateFinanceToken, checkFinanceCategory, async (req, res) => {
  try {
    const totalBookings = await Booking.countDocuments();
    const allBookings = await Booking.find();

    const totalRevenue = allBookings.reduce((sum, b) => (b.payment_status === 'paid' ? sum + (b.amount_paid || 0) : sum), 0);
    const pendingAmount = allBookings.reduce((sum, b) => (b.payment_status === 'pending' ? sum + (b.amount_paid || 0) : sum), 0);
    const rejectedAmount = allBookings.reduce((sum, b) => (b.payment_status === 'rejected' ? sum + (b.amount_paid || 0) : sum), 0);

    res.json({ totalBookings, totalRevenue, pendingAmount, rejectedAmount });
  } catch (err) {
    console.error('Finance summary error:', err);
    res.status(500).json({ message: 'Error fetching finance summary' });
  }
});

export default router;
