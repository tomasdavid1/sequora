import nodemailer from 'nodemailer';
import twilio from 'twilio';

// Email transport (SMTP). Configure via env:
// SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_FROM
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT || 587),
  secure: false,
  auth: process.env.SMTP_USER && process.env.SMTP_PASS ? {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  } : undefined,
});

// Twilio client (SMS). Configure via env:
// TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_FROM
const twilioSid = process.env.TWILIO_ACCOUNT_SID || '';
const twilioToken = process.env.TWILIO_AUTH_TOKEN || '';
const twilioFrom = process.env.TWILIO_FROM || '';
const smsEnabled = twilioSid && twilioToken && twilioFrom;
const smsClient = smsEnabled ? twilio(twilioSid, twilioToken) : null;

export type EmailParams = {
  to: string;
  subject: string;
  html?: string;
  text?: string;
  fromOverride?: string;
};

export async function sendEmail(params: EmailParams) {
  const from = params.fromOverride || process.env.SMTP_FROM || 'no-reply@healthx.com';
  await transporter.sendMail({
    from,
    to: params.to,
    subject: params.subject,
    text: params.text,
    html: params.html,
  });
}

export type SmsParams = {
  to: string; // E.164
  body: string;
};

export async function sendSms(params: SmsParams) {
  if (!smsClient) throw new Error('SMS provider not configured');
  await smsClient.messages.create({
    from: twilioFrom,
    to: params.to,
    body: params.body,
  });
}

// Convenience templates
export async function sendDailyCheckInReminder(toEmail?: string, toPhone?: string) {
  const subject = 'Daily Check-In Reminder';
  const text = 'Quick reminder to complete your daily check-in and stay on track.';
  const html = `<p>Quick reminder to complete your daily check-in and stay on track.</p>`;
  if (toEmail) await sendEmail({ to: toEmail, subject, text, html });
  if (toPhone) await sendSms({ to: toPhone, body: text });
}

export async function sendAssessmentDueReminder(toEmail?: string, toPhone?: string) {
  const subject = 'Assessment Reminder';
  const text = 'You have an assessment ready. Open the app to complete it.';
  const html = `<p>You have an assessment ready. Open the app to complete it.</p>`;
  if (toEmail) await sendEmail({ to: toEmail, subject, text, html });
  if (toPhone) await sendSms({ to: toPhone, body: text });
}

