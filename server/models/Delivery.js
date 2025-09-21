// models/Delivery.js
import mongoose from 'mongoose';

const deliverySchema = new mongoose.Schema({
  item_name: { type: String, required: true },
  quantity: { type: Number, required: true },
  delivered_at: { type: Date, default: Date.now },
  supplier_name: { type: String, required: true },
  amount: { type: Number, required: true }, // <-- added amount
});

export default mongoose.model('Delivery', deliverySchema);
