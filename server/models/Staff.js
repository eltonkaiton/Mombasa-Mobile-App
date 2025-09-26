import mongoose from 'mongoose';

const staffSchema = new mongoose.Schema({
  name: {   // ✅ keep "name" for consistency
    type: String,
    required: true,
  },
  email: {
    type: String,
    required: true,
    unique: true,
  },
  phone: {
    type: String,
  },
  password: {
    type: String,
    required: true,
  },
  category: {
    type: String,
    enum: ['staff', 'finance', 'inventory', 'admin', 'operating'], // ✅ standardized
    required: true,
  },
  status: {
    type: String,
    enum: ['active', 'suspended', 'rejected'],
    default: 'active',
  },
  created_at: {
    type: Date,
    default: Date.now,
  },
});

const Staff = mongoose.model('Staff', staffSchema);
export default Staff;
