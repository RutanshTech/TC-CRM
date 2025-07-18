// WhatsApp Follow-up Service
const Lead = require('../models/Lead');

// Mocking WhatsApp service
const sendWhatsAppMessage = (number, message) => {
  console.log(`Sent WhatsApp to ${number}: ${message}`);
};

const autoFollowUpReminder = async () => {
  const today = new Date().toISOString().slice(0, 10);
  const leads = await Lead.find({ nextFollowUpDate: { $eq: today } });

  leads.forEach((lead) => {
    const message = `Hello ${lead.name}, need trademark service?`;
    sendWhatsAppMessage(lead.number, message);
  });
};

module.exports = { autoFollowUpReminder };
