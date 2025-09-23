import mongoose from 'mongoose';

const orderSchema = new mongoose.Schema({
  supplier_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Supplier', required: true },
  supplier_name: { type: String, required: true },
  item_id: { type: mongoose.Schema.Types.ObjectId, ref: 'InventoryItem', required: true },
  item_name: { type: String, required: true },
  quantity: { type: Number, required: true },
  amount: { type: Number },
  status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
  finance_status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
  delivery_status: { type: String, enum: ['pending', 'delivered', 'received'], default: 'pending' }, // add 'received'
  delivered_at: { type: Date, default: null },
  received_at: { type: Date, default: null }, // <-- add received_at
  created_at: { type: Date, default: Date.now }
});

export default mongoose.model('Order', orderSchema);
