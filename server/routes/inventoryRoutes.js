import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import multer from 'multer';

import Staff from '../models/Staff.js';
import InventoryItem from '../models/InventoryItem.js';
import Supplier from '../models/Supplier.js';
import Order from '../models/Order.js';

const router = express.Router();

// JWT Secret — store in .env in production
const JWT_SECRET = 'super_secure_inventory_token_123';

// Multer setup for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, './uploads/'); // Ensure folder exists
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + '-' + file.originalname);
  },
});
const upload = multer({ storage });

// =============================
// Middleware: Authenticate Inventory Staff
// =============================
const authenticateInventoryToken = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(403).json({ message: 'No token provided' });
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    if (decoded.category && decoded.category.toLowerCase() !== 'inventory') {
      return res.status(403).json({ message: 'Access denied. Inventory staff only.' });
    }
    req.user = decoded;
    next();
  } catch (err) {
    console.error('Token error:', err);
    return res.status(403).json({ message: 'Invalid or expired token' });
  }
};

// =============================
// Inventory Staff Login
// =============================
router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  try {
    const user = await Staff.findOne({ email });
    if (!user || user.category.toLowerCase() !== 'inventory') {
      return res.status(401).json({ message: 'Staff not found or not inventory staff' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(401).json({ message: 'Invalid email or password' });

    const token = jwt.sign(
      { id: user._id, email: user.email, category: user.category },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.status(200).json({
      message: 'Login successful',
      token,
      user: {
        id: user._id,
        full_name: user.full_name,
        email: user.email,
        phone: user.phone,
        category: user.category,
      },
    });
  } catch (error) {
    console.error('Inventory login error:', error);
    res.status(500).json({ message: 'Server error. Please try again later.' });
  }
});

// =============================
// GET Inventory Items
// =============================
router.get('/items', authenticateInventoryToken, async (req, res) => {
  try {
    const items = await InventoryItem.find().sort({ created_at: -1 });
    res.status(200).json(items);
  } catch (error) {
    console.error('Error fetching items:', error);
    res.status(500).json({ message: 'Failed to fetch inventory items.' });
  }
});

// =============================
// POST New Inventory Item
// =============================
router.post('/items', authenticateInventoryToken, async (req, res) => {
  const { item_name, category, unit, current_stock, reorder_level } = req.body;

  if (!item_name || !unit) {
    return res.status(400).json({ message: 'Item name and unit are required.' });
  }

  try {
    const newItem = new InventoryItem({
      item_name,
      category,
      unit,
      current_stock: current_stock ?? 0,
      reorder_level: reorder_level ?? 0,
    });

    await newItem.save();
    res.status(201).json({ message: 'Inventory item uploaded successfully', item: newItem });
  } catch (error) {
    console.error('Upload inventory error:', error);
    res.status(500).json({ message: 'Failed to upload inventory item.' });
  }
});

// =============================
// PUT / Edit Inventory Item
// =============================
router.put('/items/:id', authenticateInventoryToken, async (req, res) => {
  const { id } = req.params;
  const { item_name, category, unit, current_stock, reorder_level } = req.body;

  try {
    const updatedItem = await InventoryItem.findByIdAndUpdate(
      id,
      {
        item_name,
        category,
        unit,
        current_stock,
        reorder_level,
      },
      { new: true }
    );

    if (!updatedItem) return res.status(404).json({ message: 'Inventory item not found' });

    res.status(200).json({ message: 'Inventory item updated successfully', item: updatedItem });
  } catch (err) {
    console.error('Edit inventory error:', err);
    res.status(500).json({ message: 'Failed to update inventory item.' });
  }
});

// =============================
// DELETE Inventory Item
// =============================
router.delete('/items/:id', authenticateInventoryToken, async (req, res) => {
  const { id } = req.params;

  try {
    const deletedItem = await InventoryItem.findByIdAndDelete(id);

    if (!deletedItem) return res.status(404).json({ message: 'Inventory item not found' });

    res.status(200).json({ message: 'Inventory item deleted successfully' });
  } catch (err) {
    console.error('Delete inventory error:', err);
    res.status(500).json({ message: 'Failed to delete inventory item.' });
  }
});

// =============================
// POST Upload Inventory File
// =============================
router.post('/upload', authenticateInventoryToken, upload.single('file'), (req, res) => {
  if (!req.file) return res.status(400).json({ message: 'No file uploaded' });
  res.status(200).json({ message: 'File uploaded successfully', file: req.file });
});

// =============================
// GET All Suppliers
// =============================
router.get('/suppliers', authenticateInventoryToken, async (req, res) => {
  try {
    const suppliers = await Supplier.find().sort({ createdAt: -1 });
    res.status(200).json(suppliers);
  } catch (error) {
    console.error('Error fetching suppliers:', error);
    res.status(500).json({ message: 'Failed to fetch suppliers.' });
  }
});

// =============================
// POST New Order
// =============================
router.post('/orders', authenticateInventoryToken, async (req, res) => {
  const { item_id, supplier_id, quantity, amount } = req.body;

  if (!item_id || !supplier_id || quantity === undefined) {
    return res.status(400).json({ message: 'Missing required fields' });
  }

  try {
    const supplier = await Supplier.findById(supplier_id);
    if (!supplier) return res.status(404).json({ message: 'Supplier not found' });

    const item = await InventoryItem.findById(item_id);
    if (!item) return res.status(404).json({ message: 'Inventory item not found' });

    const newOrder = new Order({
      item_id,
      item_name: item.item_name,
      supplier_id,
      supplier_name: supplier.name || supplier.full_name || 'Unknown',
      quantity,
      amount: amount ?? 0,
      delivery_status: 'pending',
    });

    await newOrder.save();
    res.status(201).json({ message: 'Order placed successfully', order: newOrder });
  } catch (error) {
    console.error('Order creation error:', error);
    res.status(500).json({ message: 'Failed to place order.' });
  }
});

// =============================
// GET All Orders / Deliveries
// =============================
router.get('/deliveries', authenticateInventoryToken, async (req, res) => {
  try {
    const allOrders = await Order.find()
      .populate('item_id', 'item_name')
      .populate('supplier_id', 'name')
      .sort({ created_at: -1 });

    const deliveries = allOrders.map((o) => ({
      item_name: o.item_name || o.item_id?.item_name,
      supplier_name: o.supplier_name || o.supplier_id?.name,
      quantity: o.quantity,
      amount: o.amount,
      delivered_at: o.delivered_at,
      delivery_status: o.delivery_status, // include status
      order_id: o._id,
    }));

    res.status(200).json(deliveries);
  } catch (err) {
    console.error('Error fetching deliveries:', err);
    res.status(500).json({ message: 'Failed to fetch deliveries.' });
  }
});

// =============================
// PATCH: Mark Delivery as Delivered (supplier-side)
// =============================
router.patch('/deliveries/:id/received', authenticateInventoryToken, async (req, res) => {
  const { id } = req.params;

  try {
    const order = await Order.findById(id);
    if (!order) return res.status(404).json({ message: 'Order not found' });

    order.delivery_status = 'delivered';
    order.delivered_at = new Date();
    await order.save();

    res.status(200).json({ message: 'Delivery marked as delivered', order });
  } catch (err) {
    console.error('Mark delivery received error:', err);
    res.status(500).json({ message: 'Failed to mark delivery as delivered' });
  }
});

// =============================
// PATCH: Inventory confirms delivery received (idempotent) + auto stock update
// =============================
router.patch('/deliveries/:id/confirm-received', authenticateInventoryToken, async (req, res) => {
  const { id } = req.params;

  try {
    const order = await Order.findById(id);
    if (!order) return res.status(404).json({ message: 'Order not found' });

    // Cannot confirm if supplier hasn't delivered
    if (order.delivery_status === 'pending') {
      return res.status(400).json({ message: 'Cannot confirm receipt. Supplier has not delivered yet.' });
    }

    // Already received — idempotent
    if (order.delivery_status === 'received') {
      return res.status(200).json({ message: 'Delivery already confirmed as received', order });
    }

    // Only allow confirmation if supplier has delivered
    if (order.delivery_status === 'delivered') {
      // mark order as received
      order.delivery_status = 'received';
      order.received_at = new Date();

      // Try to update inventory item stock
      try {
        const item = await InventoryItem.findById(order.item_id);
        if (item) {
          // Ensure order.quantity is a number
          const qty = Number(order.quantity) || 0;
          item.current_stock = (Number(item.current_stock) || 0) + qty;
          await item.save();
        }
      } catch (itemErr) {
        // Log item update errors but continue to save order status
        console.error('Failed to update inventory item stock:', itemErr);
      }

      await order.save();

      return res.status(200).json({ message: 'Delivery confirmed as received and inventory updated', order });
    }

    // Fallback for unexpected status
    return res.status(400).json({ message: 'Cannot confirm receipt for this delivery status' });

  } catch (err) {
    console.error('Confirm received error:', err);
    res.status(500).json({ message: 'Failed to confirm delivery receipt' });
  }
});

export default router;
