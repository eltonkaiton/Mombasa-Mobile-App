import mongoose from 'mongoose';

const inventoryItemSchema = new mongoose.Schema({
  item_name: { type: String, required: true },
  category: { type: String },
  unit: { type: String, required: true },
  current_stock: { type: Number, default: 0 },
  reorder_level: { type: Number, default: 0 },
  created_at: { type: Date, default: Date.now }
});

export default mongoose.model('InventoryItem', inventoryItemSchema);
