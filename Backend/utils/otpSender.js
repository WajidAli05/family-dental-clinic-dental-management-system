/**
 * Pluggable OTP delivery interface.
 *
 * Implemented channels:
 *   email    — uses nodemailer + SMTP env vars (SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_FROM)
 *
 * Stub channels (wire to your gateway when ready):
 *   sms      — no-op, logs intent to console
 *   whatsapp — no-op, logs intent to console
 */

import nodemailer from "nodemailer";

function getTransporter() {
  return nodemailer.createTransport({
    host:   process.env.SMTP_HOST   || "smtp.gmail.com",
    port:   Number(process.env.SMTP_PORT) || 587,
    secure: process.env.SMTP_SECURE === "true",
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
}

async function sendEmail({ to, name, otp }) {
  const from = process.env.SMTP_FROM || process.env.SMTP_USER || "noreply@fdclinic.com";
  const transporter = getTransporter();
  await transporter.sendMail({
    from,
    to,
    subject: "FDC — Your verification code",
    text: [
      `Hello ${name},`,
      ``,
      `Your FDC verification code is: ${otp}`,
      ``,
      `This code expires in 10 minutes.`,
      `If you did not request this, please ignore this message and secure your account.`,
    ].join("\n"),
    html: `
      <div style="font-family:sans-serif;max-width:480px;margin:auto">
        <h2 style="color:#2ec4b6">FDC Verification Code</h2>
        <p>Hello <strong>${name}</strong>,</p>
        <p>Your verification code is:</p>
        <div style="font-size:2rem;font-weight:bold;letter-spacing:.2rem;color:#2ec4b6;padding:12px 0">
          ${otp}
        </div>
        <p style="color:#666">This code expires in <strong>10 minutes</strong>.</p>
        <p style="color:#999;font-size:.85rem">
          If you did not request this code, please ignore this email.
        </p>
      </div>`,
  });
}

async function sendSms({ to, otp }) {
  // SMS stub — replace with your SMS gateway (Twilio, etc.)
  console.log(`[otpSender] SMS stub — would send OTP to ${to}. Wire SMTP_* or SMS gateway.`);
}

async function sendWhatsApp({ to, otp }) {
  // WhatsApp stub — replace with your WhatsApp Business API
  console.log(`[otpSender] WhatsApp stub — would send OTP to ${to}. Wire WhatsApp API.`);
}

/**
 * Send an OTP via the specified channel.
 *
 * @param {object} opts
 * @param {"email"|"sms"|"whatsapp"} opts.channel
 * @param {string} opts.to      — email address or phone number
 * @param {string} opts.name    — recipient display name
 * @param {string} opts.otp     — the plaintext OTP (already generated)
 */
export async function sendOtp({ channel = "email", to, name = "", otp }) {
  switch (channel) {
    case "email":
      return sendEmail({ to, name, otp });
    case "sms":
      return sendSms({ to, otp });
    case "whatsapp":
      return sendWhatsApp({ to, otp });
    default:
      throw new Error(`[otpSender] Unknown channel: ${channel}`);
  }
}
