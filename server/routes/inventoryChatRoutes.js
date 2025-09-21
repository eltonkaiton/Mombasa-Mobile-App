import express from 'express';
import InventoryChatMessage from '../models/InventoryChatMessage.js';
import { authenticateInventoryToken } from '../middleware/auth.js';

const router = express.Router();

// =============================
// GET all messages in a room
// =============================
router.get('/all/:roomId', authenticateInventoryToken, async (req, res) => {
  const { roomId } = req.params;
  try {
    const messages = await InventoryChatMessage.find({ roomId }).sort({ timestamp: 1 });
    res.status(200).json(messages);
  } catch (err) {
    console.error('Fetch chat messages error:', err);
    res.status(500).json({ message: 'Failed to fetch messages.' });
  }
});

// =============================
// POST a new message (optional, if saving via API as well)
// =============================
router.post('/send', authenticateInventoryToken, async (req, res) => {
  const { roomId, sender, message } = req.body;
  if (!roomId || !sender || !message) {
    return res.status(400).json({ message: 'Missing required fields' });
  }

  try {
    const newMessage = new InventoryChatMessage({ roomId, sender, message });
    await newMessage.save();
    res.status(201).json(newMessage);
  } catch (err) {
    console.error('Send chat message error:', err);
    res.status(500).json({ message: 'Failed to send message.' });
  }
});

export default router;
