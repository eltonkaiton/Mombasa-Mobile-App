// routes/bookingRoutes.js
import express from 'express';
import Booking from '../models/Booking.js';
import { authenticateToken } from '../middleware/authMiddleware.js';
import PDFDocument from 'pdfkit';
import path from 'path';
import { fileURLToPath } from 'url';

const router = express.Router();

// Helper for __dirname in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// =============================
// Create Booking
// =============================
router.post('/create', authenticateToken, async (req, res) => {
  try {
    const {
      booking_type,
      travel_date,
      travel_time,
      route,
      num_passengers,
      vehicle_type,
      vehicle_plate,
      cargo_description,
      cargo_weight_kg,
      payment_method,
      amount_paid,
      transaction_id,
      ferry_name,
    } = req.body;

    const newBooking = new Booking({
      user_id: req.user.id,
      booking_type,
      travel_date,
      travel_time,
      route,
      num_passengers,
      vehicle_type,
      vehicle_plate,
      cargo_description,
      cargo_weight_kg,
      payment_method,
      amount_paid,
      transaction_id,
      ferry_name: ferry_name || null,
      payment_status: amount_paid > 0 ? 'paid' : 'pending',
      booking_status: 'pending',
    });

    await newBooking.save();
    res.status(201).json({
      success: true,
      message: 'Booking created successfully',
      booking: newBooking,
    });
  } catch (err) {
    console.error('Booking creation error:', err);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

// =============================
// Get My Bookings (passenger only, with optional filter)
// =============================
router.get('/mybookings', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'passenger') {
      return res.status(403).json({ success: false, message: 'Only passengers can view their bookings' });
    }

    const { page = 1, limit = 10, booking_status } = req.query;
    const filters = { user_id: req.user.id };

    if (booking_status) {
      filters.booking_status = booking_status;
    }

    const bookings = await Booking.find(filters)
      .populate('user_id', 'full_name email')
      .sort({ created_at: -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit));

    const total = await Booking.countDocuments(filters);

    res.json({
      success: true,
      bookings,
      total,
      page: Number(page),
      totalPages: Math.ceil(total / limit),
    });
  } catch (err) {
    console.error('Fetch bookings error:', err);
    res.status(500).json({ success: false, message: 'Error fetching bookings' });
  }
});

// =============================
// Get Paid Bookings (role-aware: passenger sees own, crew sees all)
// =============================
router.get('/paid', authenticateToken, async (req, res) => {
  try {
    const { page = 1, limit = 10 } = req.query;
    let filters = { payment_status: 'paid' };

    if (req.user.role === 'passenger') {
      filters.user_id = req.user.id; // passengers only see their own paid bookings
    }
    // ferry crew: no user_id filter → sees all paid bookings

    const bookings = await Booking.find(filters)
      .populate('user_id', 'full_name email')
      .sort({ created_at: -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit));

    const total = await Booking.countDocuments(filters);

    res.json({
      success: true,
      bookings,
      total,
      page: Number(page),
      totalPages: Math.ceil(total / limit),
    });
  } catch (err) {
    console.error('Fetch paid bookings error:', err);
    res.status(500).json({ success: false, message: 'Error fetching paid bookings' });
  }
});

// =============================
// Cancel Booking (passenger only)
// =============================
router.patch('/:id/cancel', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'passenger') {
      return res.status(403).json({ success: false, message: 'Only passengers can cancel bookings' });
    }

    const booking = await Booking.findOne({
      _id: req.params.id,
      user_id: req.user.id,
    });

    if (!booking) {
      return res.status(404).json({ success: false, message: 'Booking not found' });
    }

    booking.booking_status = 'cancelled';
    await booking.save();

    res.json({
      success: true,
      message: 'Booking cancelled successfully',
      booking,
    });
  } catch (err) {
    console.error('Cancel booking error:', err);
    res.status(500).json({ success: false, message: 'Error cancelling booking' });
  }
});

// =============================
// Get Booking Receipt (PDF)
// =============================
router.get('/:id/receipt/pdf', authenticateToken, async (req, res) => {
  try {
    let bookingQuery = { _id: req.params.id };

    if (req.user.role === 'passenger') {
      bookingQuery.user_id = req.user.id; // passengers can fetch only their own bookings
    }
    // ferry crew: no user_id filter → can fetch any booking by ID

    const booking = await Booking.findOne(bookingQuery).populate('user_id', 'full_name email');

    if (!booking) {
      return res.status(404).json({ success: false, message: 'Booking not found' });
    }

    if (['approved', 'assigned'].includes(booking.booking_status) && booking.payment_status === 'paid') {
      const doc = new PDFDocument();
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `inline; filename=receipt-${booking._id}.pdf`);
      doc.pipe(res);

      // Optional logo
      const logoPath = path.join(__dirname, '../public/mombasafs.jpg');
      try {
        doc.image(logoPath, 50, 20, { width: 70 });
      } catch {}

      doc.fontSize(18).text('Mombasa Ferry Services', 150, 30, { align: 'left' });
      doc.moveDown();
      doc.fontSize(20).text('Booking Receipt', { align: 'center' });
      doc.moveDown();

      // Passenger Details
      doc.fontSize(12).text(`Passenger Name: ${booking.user_id.full_name}`);
      doc.text(`Email: ${booking.user_id.email}`);

      // Booking Details
      doc.text(`Booking ID: ${booking._id}`);
      doc.text(`Type: ${booking.booking_type}`);
      doc.text(`Route: ${booking.route}`);
      doc.text(`Date: ${new Date(booking.travel_date).toDateString()}`);
      doc.text(`Time: ${booking.travel_time}`);
      doc.text(`Passengers: ${booking.num_passengers || 'N/A'}`);
      doc.text(`Vehicle: ${booking.vehicle_type || 'N/A'} (${booking.vehicle_plate || 'N/A'})`);
      doc.text(`Cargo: ${booking.cargo_description || 'N/A'}`);
      doc.text(`Weight: ${booking.cargo_weight_kg || 'N/A'} kg`);
      doc.text(`Amount Paid: KES ${booking.amount_paid}`);
      doc.text(`Payment Method: ${booking.payment_method}`);
      doc.text(`Payment Status: ${booking.payment_status}`);
      doc.text(`Booking Status: ${booking.booking_status}`);
      doc.text(`Ferry: ${booking.ferry_name || 'Not yet assigned'}`);
      doc.text(`Created At: ${booking.created_at.toDateString()}`);

      doc.end();
    } else {
      return res.status(403).json({
        success: false,
        message: 'Receipt available only for approved/assigned and paid bookings',
      });
    }
  } catch (err) {
    console.error('Receipt PDF error:', err);
    res.status(500).json({ success: false, message: 'Error generating receipt PDF' });
  }
});

export default router;
