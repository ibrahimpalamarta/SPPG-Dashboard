/**
 * Single source of truth for every error response the API sends. Add a new
 * key here instead of inlining `res.status(...).json(...)` at the call site.
 */
export const ERRORS = {
  VALIDATION_ERROR: { status: 400, body: { error: 'validation_error', message: 'Invalid request' } },
  MISSING_TOKEN: { status: 401, body: { error: 'unauthorized', message: 'Missing bearer token' } },
  INVALID_TOKEN: { status: 401, body: { error: 'unauthorized', message: 'Invalid or expired token' } },
  // One body for unknown email, wrong password, locked and disabled accounts.
  INVALID_CREDENTIALS: { status: 401, body: { error: 'invalid_credentials', message: 'Email atau password salah.' } },
  INVALID_MFA_CODE: { status: 401, body: { error: 'invalid_mfa_code', message: 'Kode verifikasi tidak valid.' } },
  INVALID_RESET_TOKEN: {
    status: 400,
    body: { error: 'invalid_reset_token', message: 'Link tidak valid atau sudah kedaluwarsa.' },
  },
  MFA_ENROLLMENT_REQUIRED: {
    status: 403,
    body: { error: 'mfa_enrollment_required', message: 'Aktifkan verifikasi dua langkah untuk melanjutkan.' },
  },
  FORBIDDEN: { status: 403, body: { error: 'forbidden', message: 'Insufficient role' } },
  // SCRUM-20: PRD §9 copy, shown to the user as-is.
  FORBIDDEN_KITCHEN: {
    status: 403,
    body: { error: 'forbidden_kitchen', message: 'Anda tidak memiliki akses ke kitchen ini.' },
  },
  NOT_FOUND: { status: 404, body: { error: 'not_found' } },
  CONFLICT: { status: 409, body: { error: 'conflict', message: 'Resource already exists' } },
  INVALID_TRANSITION: {
    status: 409,
    body: { error: 'invalid_transition', message: 'Status batch tidak bisa diubah ke status tersebut.' },
  },
  // SCRUM-51: quarantine. `details.openCritical` says how many are left.
  BATCH_BLOCKED: {
    status: 409,
    body: { error: 'batch_blocked', message: 'Masih ada temuan "Wajib diperbaiki" yang belum ditandai sudah dicek.' },
  },
  // SCRUM-121: member administration.
  LAST_ADMIN: {
    status: 409,
    body: { error: 'last_admin', message: 'Admin terakhir tidak bisa dinonaktifkan atau diturunkan perannya.' },
  },
  NOT_AN_INVITATION: {
    status: 409,
    body: { error: 'not_an_invitation', message: 'Akun ini tidak sedang menunggu aktivasi.' },
  },
  UNPROCESSABLE: {
    status: 422,
    body: { error: 'unprocessable', message: 'File was read but its contents were rejected' },
  },
  TOO_MANY_REQUESTS: { status: 429, body: { error: 'too_many_requests', message: 'Rate limit exceeded' } },
  INTERNAL_ERROR: { status: 500, body: { error: 'internal_error' } },
} as const;

export type ErrorKey = keyof typeof ERRORS;
