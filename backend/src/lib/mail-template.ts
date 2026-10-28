/**
 * The one email layout (invitation, password reset): a white card on slate with
 * the emerald button the admin app uses. Table layout and inline styles only,
 * since mail clients ignore most of the rest. Returns both parts so the plain
 * text stays the fallback.
 */
export type MailContent = {
  title: string;
  intro: string;
  /** Free text from a person (the inviter's message); shown as a quote. */
  quote?: string;
  button: { label: string; url: string };
  note: string;
};

const escapeHtml = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

const FONT = "Inter, -apple-system, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif";

export function renderMail({ title, intro, quote, button, note }: MailContent): { text: string; html: string } {
  const text = [title, intro, quote && `Pesan dari pengundang:\n${quote}`, `${button.label}:\n${button.url}`, note]
    .filter(Boolean)
    .join('\n\n');

  const html = `<!doctype html>
<html lang="id">
<body style="margin:0;padding:0;background:#f1f5f9;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f1f5f9;padding:32px 16px;">
<tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;">
<tr><td style="padding:0 4px 16px;font-family:${FONT};font-size:15px;font-weight:600;color:#047857;">SPPG Internal</td></tr>
<tr><td style="background:#ffffff;border:1px solid #e2e8f0;border-radius:16px;padding:32px;font-family:${FONT};">
<h1 style="margin:0 0 12px;font-size:22px;line-height:1.3;font-weight:600;color:#1e293b;">${escapeHtml(title)}</h1>
<p style="margin:0 0 20px;font-size:15px;line-height:1.6;color:#475569;">${escapeHtml(intro)}</p>
${quote ? `<p style="margin:0 0 20px;padding:12px 16px;background:#f8fafc;border-left:3px solid #047857;border-radius:6px;font-size:14px;line-height:1.6;color:#334155;white-space:pre-wrap;">${escapeHtml(quote)}</p>` : ''}
<table role="presentation" cellpadding="0" cellspacing="0" style="margin:8px 0 24px;"><tr><td style="background:#047857;border-radius:12px;">
<a href="${escapeHtml(button.url)}" style="display:inline-block;padding:12px 24px;font-family:${FONT};font-size:15px;font-weight:600;color:#ffffff;text-decoration:none;">${escapeHtml(button.label)}</a>
</td></tr></table>
<p style="margin:0 0 16px;font-size:13px;line-height:1.6;color:#64748b;">${escapeHtml(note)}</p>
<p style="margin:0;padding-top:16px;border-top:1px solid #e2e8f0;font-size:12px;line-height:1.6;color:#94a3b8;">Tombol tidak berfungsi? Buka tautan ini:<br><a href="${escapeHtml(button.url)}" style="word-break:break-all;color:#047857;">${escapeHtml(button.url)}</a></p>
</td></tr>
</table>
</td></tr>
</table>
</body>
</html>`;
  return { text, html };
}
