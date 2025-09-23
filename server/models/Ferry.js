import mongoose from "mongoose";

const ferrySchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    capacity: { type: Number, required: true },
    status: { type: String, enum: ["available", "unavailable"], default: "available" },
  },
  { timestamps: true }
);

export default mongoose.model("Ferry", ferrySchema);
