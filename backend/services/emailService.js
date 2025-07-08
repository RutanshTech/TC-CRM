// Email Export Service
const nodemailer = require('nodemailer');
const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');
dotenv.config();

// You can also store email + password in .env
const transporter = nodemailer.createTransport({
  service: 'gmail', // or use SMTP host
  auth: {
    user: process.env.ADMIN_EMAIL,      // sender email
    pass: process.env.ADMIN_EMAIL_PASS  // app password (not normal email password)
  }
});

/**
 * Send email with the downloaded file attachment
 * @param {String} filePath - Path to the file (CSV/Excel/etc.)
 */
const sendLeadsToAdmin = async (filePath) => {
  const filename = path.basename(filePath);

  const mailOptions = {
    from: process.env.ADMIN_EMAIL,
    to: process.env.ADMIN_EMAIL,
    subject: 'Leads Downloaded',
    text: `The admin downloaded leads. See attachment: ${filename}`,
    attachments: [
      {
        filename,
        path: filePath
      }
    ]
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log('Leads emailed to admin successfully');
  } catch (error) {
    console.error('Failed to send email:', error);
    throw error;
  }
};

module.exports = { sendLeadsToAdmin };
