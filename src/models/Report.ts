import mongoose from 'mongoose';

const ReportSchema = new mongoose.Schema({
  userId: { type: String, required: true },
  reportContent: { type: String, required: true },
  filesScanned: { type: Number, required: true },
  createdAt: { type: Date, default: Date.now },
});

export const Report = mongoose.models.Report || mongoose.model('Report', ReportSchema);
