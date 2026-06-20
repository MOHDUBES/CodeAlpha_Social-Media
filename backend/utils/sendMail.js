const createTransporter = require('../config/mailer');

const sendMail = async (options) => {
  const transporter = await createTransporter();
  
  const message = {
    from: `${process.env.FROM_NAME || 'Loopline'} <${process.env.FROM_EMAIL || 'noreply@loopline.com'}>`,
    to: options.email,
    subject: options.subject,
    text: options.message,
    html: options.html
  };

  const info = await transporter.sendMail(message);
  console.log('Message sent: %s', info.messageId);
  if (info.messageId && process.env.SMTP_HOST === 'smtp.ethereal.email') {
    const nodemailer = require('nodemailer');
    console.log('Preview URL: %s', nodemailer.getTestMessageUrl(info));
  }
};

module.exports = sendMail;
