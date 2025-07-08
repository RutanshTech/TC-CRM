// Call Log Model
const mongoose = require('mongoose');

const callLogSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  leadId: { type: mongoose.Schema.Types.ObjectId, ref: 'Lead' },
  callStatus: { type: String, enum: ['Call Cut', 'Not Picking', 'Call Back', 'Converted', 'Not Interested'], required: true },
  statusDate: { type: Date, required: true },
}, { timestamps: true });

module.exports = mongoose.model('CallLog', callLogSchema);
