import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
  full_name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  phone: { type: String },
  password: { type: String, required: true },
  role: { type: String, enum: ['passenger', 'admin', 'staff'], default: 'passenger' },
  status: { type: String, enum: ['pending', 'active', 'approved', 'suspended', 'rejected'], default: 'pending' },
  created_at: { type: Date, default: Date.now }
});

export default mongoose.model('User', userSchema);
