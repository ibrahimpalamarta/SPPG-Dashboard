import { SESv2Client, SendEmailCommand } from '@aws-sdk/client-sesv2';
import { env } from '../config/env.js';

/**
 * Outgoing email through SES. Credentials are never configured here: locally
 * the usual AWS_* chain, in ECS the task role. EMAIL_FROM must be a verified
 * SES identity.
 */
const client = new SESv2Client({ region: env.AWS_REGION });

export type SendMail = (to: string, subject: string, text: string) => Promise<void>;

export const sendMail: SendMail = async (to, subject, text) => {
  await client.send(
    new SendEmailCommand({
      FromEmailAddress: env.EMAIL_FROM,
      Destination: { ToAddresses: [to] },
      Content: { Simple: { Subject: { Data: subject }, Body: { Text: { Data: text } } } },
    }),
  );
};
