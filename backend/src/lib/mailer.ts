import { SESv2Client, SendEmailCommand } from '@aws-sdk/client-sesv2';
import nodemailer from 'nodemailer';
import { env } from '../config/env.js';

/**
 * Outgoing email. SMTP_URL (host, port and credentials in one value, e.g.
 * smtps://user:app-password@smtp.gmail.com:465) selects SMTP; without it SES is
 * used, with the usual AWS_* credential chain. EMAIL_FROM must be a sender the
 * chosen provider accepts (a verified SES identity, or an address the SMTP
 * account may use).
 *
 * ponytail: both live here while the AWS -> GCP move is in flight. Delete the
 * SES half (and @aws-sdk/client-sesv2) once SMTP is the only path.
 */
const smtp = env.SMTP_URL ? nodemailer.createTransport(env.SMTP_URL) : null;
const ses = smtp ? null : new SESv2Client({ region: env.AWS_REGION });

export type SendMail = (to: string, subject: string, text: string, html?: string) => Promise<void>;

export const sendMail: SendMail = async (to, subject, text, html) => {
  if (smtp) {
    await smtp.sendMail({ from: env.EMAIL_FROM, to, subject, text, html });
    return;
  }
  await ses!.send(
    new SendEmailCommand({
      FromEmailAddress: env.EMAIL_FROM,
      Destination: { ToAddresses: [to] },
      Content: { Simple: { Subject: { Data: subject }, Body: { Text: { Data: text }, ...(html && { Html: { Data: html } }) } } },
    }),
  );
};
