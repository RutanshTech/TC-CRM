// Session Log Model
const mongoose = require('mongoose');

const sessionLogSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  lastActivity: { type: Date, default: Date.now },
  isActive: { type: Boolean, default: true },

}, { timestamps: true });

module.exports = mongoose.model('SessionLog', sessionLogSchema);
