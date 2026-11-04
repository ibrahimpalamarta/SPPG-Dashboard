import nodemailer from 'nodemailer';
import { env } from '../config/env.js';

/**
 * Outgoing email over SMTP. SMTP_URL carries host, port and credentials in one
 * value, e.g. smtps://user:app-password@smtp.gmail.com:465 (Secret Manager on
 * Cloud Run). EMAIL_FROM must be a sender the SMTP account may use.
 */
const transport = env.SMTP_URL ? nodemailer.createTransport(env.SMTP_URL) : null;

export type SendMail = (to: string, subject: string, text: string, html?: string) => Promise<void>;

export const sendMail: SendMail = async (to, subject, text, html) => {
  if (!transport) throw new Error('SMTP_URL is not set');
  await transport.sendMail({ from: env.EMAIL_FROM, to, subject, text, html });
};
