import mongoose from 'mongoose';

const supplyRequestSchema = new mongoose.Schema({
  supplier_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Supplier', required: true },
  item_name: { type: String, required: true },
  amount: { type: Number },
  finance_status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
  delivery_status: { type: String, enum: ['pending', 'delivered', 'received'], default: 'pending' },
  delivered_at: { type: Date },
  received_at: { type: Date },
  created_at: { type: Date, default: Date.now }
});

export default mongoose.model('SupplyRequest', supplyRequestSchema);
