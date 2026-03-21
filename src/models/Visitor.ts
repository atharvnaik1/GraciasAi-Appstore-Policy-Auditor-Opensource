import mongoose from 'mongoose';

const VisitorSchema = new mongoose.Schema({
  count: { type: Number, default: 0 },
  label: { type: String, default: 'global', unique: true }
});

export const Visitor = mongoose.models.Visitor || mongoose.model('Visitor', VisitorSchema);
