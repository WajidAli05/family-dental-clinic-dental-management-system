import mongoose from "mongoose";

const { Schema } = mongoose;

// Backing store for the atomic auto-increment sequence helper
// (services/shared/counters.js). One document per counter name.
const counterSchema = new Schema({
  _id: { type: String, required: true },
  seq: { type: Number, required: true, default: 0 },
});

export default mongoose.models.Counter || mongoose.model("Counter", counterSchema);
