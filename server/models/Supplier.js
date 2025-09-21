import mongoose from 'mongoose';

const supplierSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, unique: true },
  phone: { type: String },
  password: { type: String, required: true },
  address: { type: String },
  status: { type: String, enum: ['active', 'pending', 'suspended'], default: 'pending' },
  created_at: { type: Date, default: Date.now }
});

export default mongoose.model('Supplier', supplierSchema);
