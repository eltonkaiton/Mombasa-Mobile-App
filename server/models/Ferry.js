import mongoose from 'mongoose';

const ferrySchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true },
  capacity: { type: Number, required: true },
  status: { type: String, enum: ['active', 'inactive'], default: 'active' },
  created_at: { type: Date, default: Date.now },
});

const Ferry = mongoose.model('Ferry', ferrySchema);
export default Ferry;
