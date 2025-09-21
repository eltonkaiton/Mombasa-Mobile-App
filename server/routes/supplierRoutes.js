import express from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { authenticateToken } from './userRoutes.js'; // adjust path if needed

import Supplier from '../models/Supplier.js';
import Order from '../models/Order.js';

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'jwt_secret_key';

// ✅ Supplier Login
router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password)
    return res.status(400).json({ message: 'Email and password are required' });

  try {
    const supplier = await Supplier.findOne({ email });
    if (!supplier)
      return res.status(401).json({ message: 'Invalid email or password' });

    const isMatch = await bcrypt.compare(password, supplier.password);
    if (!isMatch)
      return res.status(401).json({ message: 'Invalid email or password' });

    const token = jwt.sign({ id: supplier._id, role: 'supplier' }, JWT_SECRET, {
      expiresIn: '1d',
    });

    res.json({
      message: 'Login successful',
      token,
      user: {
        id: supplier._id,
        name: supplier.name,
        email: supplier.email,
        role: 'supplier',
      },
    });
  } catch (error) {
    console.error('Supplier login error:', error);
    res.status(500).json({ message: 'Server error during login' });
  }
});

// ✅ Supplier fetches their own orders (with populated item name)
router.get('/orders', authenticateToken, async (req, res) => {
  try {
    const supplierId = req.user.id;

    const orders = await Order.find({ supplier_id: supplierId })
      .populate('item_id', 'item_name') // only include item_name
      .sort({ created_at: -1 });

    res.json(orders);
  } catch (error) {
    console.error('Error fetching supplier orders:', error);
    res.status(500).json({ message: 'Server error fetching orders' });
  }
});

// ✅ Supplier accepts an order
router.put('/orders/:id/accept', authenticateToken, async (req, res) => {
  try {
    const supplierId = req.user.id;

    const updated = await Order.findOneAndUpdate(
      { _id: req.params.id, supplier_id: supplierId, status: 'pending' },
      { status: 'approved' },
      { new: true }
    );

    if (!updated)
      return res.status(404).json({ message: 'Order not found or already processed' });

    res.json({ message: 'Order accepted successfully', order: updated });
  } catch (error) {
    console.error('Accept order error:', error);
    res.status(500).json({ message: 'Server error accepting order' });
  }
});

// ✅ Supplier rejects an order
router.put('/orders/:id/reject', authenticateToken, async (req, res) => {
  try {
    const supplierId = req.user.id;

    const updated = await Order.findOneAndUpdate(
      { _id: req.params.id, supplier_id: supplierId, status: 'pending' },
      { status: 'rejected' },
      { new: true }
    );

    if (!updated)
      return res.status(404).json({ message: 'Order not found or already processed' });

    res.json({ message: 'Order rejected successfully', order: updated });
  } catch (error) {
    console.error('Reject order error:', error);
    res.status(500).json({ message: 'Server error rejecting order' });
  }
});

// ✅ Supplier submits supply with amount
router.put('/supply/:id', authenticateToken, async (req, res) => {
  const { amount } = req.body;
  const supplierId = req.user.id;

  if (!amount) return res.status(400).json({ message: 'Amount is required' });

  try {
    const updated = await Order.findOneAndUpdate(
      { _id: req.params.id, supplier_id: supplierId, status: 'approved' },
      { amount, finance_status: 'pending' },
      { new: true }
    );

    if (!updated) {
      return res.status(404).json({ message: 'Order not found or unauthorized' });
    }

    res.json({ message: 'Supply submitted. Awaiting finance approval.', order: updated });
  } catch (error) {
    console.error('Supply submit error:', error);
    res.status(500).json({ message: 'Server error during supply submit' });
  }
});

// ✅ Finance approves/rejects supply amount
router.put('/approve-finance/:id', authenticateToken, async (req, res) => {
  const { decision } = req.body;

  if (!['approved', 'rejected'].includes(decision)) {
    return res.status(400).json({ message: 'Invalid decision' });
  }

  try {
    const updated = await Order.findByIdAndUpdate(
      req.params.id,
      { finance_status: decision },
      { new: true }
    );

    if (!updated) return res.status(404).json({ message: 'Order not found' });

    res.json({ message: `Finance ${decision} the supply.`, order: updated });
  } catch (error) {
    console.error('Finance approval error:', error);
    res.status(500).json({ message: 'Server error during finance approval' });
  }
});

// ✅ Supplier marks order as delivered
router.put('/mark-delivered/:id', authenticateToken, async (req, res) => {
  const supplierId = req.user.id;

  try {
    const updated = await Order.findOneAndUpdate(
      { _id: req.params.id, supplier_id: supplierId, delivery_status: 'pending' },
      { delivery_status: 'delivered', delivered_at: new Date() },
      { new: true }
    );

    if (!updated)
      return res.status(404).json({ message: 'Order not found or unauthorized' });

    res.json({ message: 'Marked as delivered', order: updated });
  } catch (error) {
    console.error('Delivery mark error:', error);
    res.status(500).json({ message: 'Server error marking delivery' });
  }
});

// ✅ Inventory confirms order as received
router.put('/mark-received/:id', authenticateToken, async (req, res) => {
  try {
    const updated = await Order.findOneAndUpdate(
      { _id: req.params.id, delivery_status: 'delivered' },
      { delivery_status: 'received', received_at: new Date() },
      { new: true }
    );

    if (!updated)
      return res.status(404).json({ message: 'Order not found or not yet delivered' });

    res.json({ message: 'Order confirmed as received by inventory', order: updated });
  } catch (error) {
    console.error('Confirm received error:', error);
    res.status(500).json({ message: 'Server error confirming received order' });
  }
});

export default router;
