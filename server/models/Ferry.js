import mongoose from 'mongoose';

const ferrySchema = new mongoose.Schema({
  name: { type: String, required: true },
  capacity: Number,
  status: { type: String, enum: ['active', 'maintenance'], default: 'active' },
  created_at: { type: Date, default: Date.now }
});

export default mongoose.model('Ferry', ferrySchema);
