import mongoose from 'mongoose';

const inventoryChatSchema = new mongoose.Schema({
  roomId: { type: String, required: true }, // unique room for supplier ↔ inventory
  sender: { type: String, required: true },
  message: { type: String, required: true },
  timestamp: { type: Date, default: Date.now },
});

export default mongoose.model('InventoryChatMessage', inventoryChatSchema);
