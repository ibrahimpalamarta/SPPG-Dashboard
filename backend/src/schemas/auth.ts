import { z } from 'zod';
import { passwordPolicy } from '../auth/password.js';

const email = z.string().trim().toLowerCase().email().max(254);
const code = z.string().trim().min(6).max(32);

// Login does not apply the password policy: an old account must still be able
// to try its (possibly weaker) password and get a plain "invalid credentials".
export const loginBody = z.object({ email, password: z.string().min(1).max(128) });

export const mfaVerifyBody = z.object({ mfaToken: z.string().min(1).max(200), code });

const resetToken = z.string().min(20).max(100);
export const resetPasswordBody = z.object({ token: resetToken, password: passwordPolicy });
export const invitationParam = z.object({ token: resetToken });

export const changePasswordBody = z.object({
  currentPassword: z.string().min(1).max(128),
  newPassword: passwordPolicy,
});

export const mfaEnableBody = z.object({ code });
export const mfaDisableBody = z.object({ password: z.string().min(1).max(128), code });
