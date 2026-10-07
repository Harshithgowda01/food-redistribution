const nodemailer = require('nodemailer');

// In-memory deduplication cache with 60-second TTL
const recentEmailCache = new Map();
const DEDUPLICATION_TTL_MS = 60 * 1000;

const cleanupCache = () => {
  const now = Date.now();
  for (const [key, timestamp] of recentEmailCache.entries()) {
    if (now - timestamp > DEDUPLICATION_TTL_MS) {
      recentEmailCache.delete(key);
    }
  }
};
setInterval(cleanupCache, 30 * 1000);

let transporter = null;

const getTransporter = () => {
  if (transporter) return transporter;

  const host = process.env.SMTP_HOST;
  const port = parseInt(process.env.SMTP_PORT, 10) || 587;
  const secure = process.env.SMTP_SECURE === 'true' || port === 465;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (!host || !user) {
    return null;
  }

  transporter = nodemailer.createTransport({
    host,
    port,
    secure,
    auth: {
      user,
      pass
    },
    // Useful for local testing / self-signed certs
    tls: {
      rejectUnauthorized: process.env.NODE_ENV === 'production'
    }
  });

  return transporter;
};

/**
 * Generate responsive modern HTML email template
 */
const buildHtmlTemplate = ({ title, message, details = [], actionUrl, actionText }) => {
  const detailsHtml = details && details.length > 0
    ? `
      <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px; margin: 20px 0;">
        <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
          ${details.map(d => `
            <tr>
              <td style="padding: 6px 0; color: #64748b; font-weight: 500; width: 35%;">${d.label}:</td>
              <td style="padding: 6px 0; color: #1e293b; font-weight: 600;">${d.value}</td>
            </tr>
          `).join('')}
        </table>
      </div>
    `
    : '';

  const buttonHtml = actionUrl && actionText
    ? `
      <div style="text-align: center; margin: 28px 0 16px;">
        <a href="${actionUrl}" style="background: linear-gradient(135deg, #16a34a, #15803d); color: #ffffff; text-decoration: none; padding: 12px 28px; border-radius: 6px; font-weight: 600; font-size: 15px; display: inline-block; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
          ${actionText}
        </a>
      </div>
    `
    : '';

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>${title || 'Food Redistribution Platform'}</title>
    </head>
    <body style="margin: 0; padding: 0; background-color: #f1f5f9; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
      <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f1f5f9; padding: 24px 0;">
        <tr>
          <td align="center">
            <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 580px; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);">
              <!-- Header -->
              <tr>
                <td style="background: linear-gradient(135deg, #16a34a, #0d9488); padding: 24px 32px; text-align: left;">
                  <h1 style="color: #ffffff; margin: 0; font-size: 20px; font-weight: 700; letter-spacing: -0.5px;">
                    🌱 Food Redistribution Platform
                  </h1>
                  <p style="color: #dcfce7; margin: 4px 0 0 0; font-size: 13px;">AI-Powered Surplus Food Management</p>
                </td>
              </tr>
              <!-- Body -->
              <tr>
                <td style="padding: 32px;">
                  <h2 style="color: #0f172a; margin: 0 0 16px; font-size: 18px; font-weight: 600;">
                    ${title}
                  </h2>
                  <p style="color: #334155; font-size: 15px; line-height: 1.6; margin: 0 0 16px;">
                    ${message}
                  </p>
                  ${detailsHtml}
                  ${buttonHtml}
                </td>
              </tr>
              <!-- Footer -->
              <tr>
                <td style="background-color: #f8fafc; padding: 20px 32px; border-top: 1px solid #e2e8f0; text-align: center;">
                  <p style="color: #94a3b8; font-size: 12px; margin: 0;">
                    This is an automated notification from the Food Redistribution Platform. Please do not reply directly to this email.
                  </p>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </body>
    </html>
  `;
};

/**
 * Send notification email with deduplication and safe error handling
 *
 * @param {Object} options
 * @param {string} options.to - Recipient email address
 * @param {string} options.subject - Email subject
 * @param {string} options.title - Notification title
 * @param {string} options.message - Notification message
 * @param {Array<{label: string, value: string}>} [options.details] - Key-value details
 * @param {string} [options.actionUrl] - Optional action CTA URL
 * @param {string} [options.actionText] - Optional action CTA text
 * @param {string} [options.deduplicationKey] - Unique key to prevent duplicate sends
 */
const sendNotificationEmail = async ({
  to,
  subject,
  title,
  message,
  details = [],
  actionUrl = '',
  actionText = '',
  deduplicationKey = null
}) => {
  try {
    if (!to) {
      return { success: false, reason: 'No recipient email provided' };
    }

    // Deduplication check
    const dedupKey = deduplicationKey || `${to}:${subject}:${title}`;
    const now = Date.now();
    const lastSent = recentEmailCache.get(dedupKey);

    if (lastSent && now - lastSent < DEDUPLICATION_TTL_MS) {
      console.log(`[Email Service] Skipped duplicate email to ${to} for key: ${dedupKey}`);
      return { success: true, skipped: true, reason: 'Duplicate suppressed' };
    }

    recentEmailCache.set(dedupKey, now);

    const transport = getTransporter();
    const fromAddress = process.env.EMAIL_FROM || '"Food Redistribution Platform" <no-reply@foodredistribution.org>';

    const html = buildHtmlTemplate({
      title: title || subject,
      message,
      details,
      actionUrl,
      actionText
    });

    const plainDetails = details && details.length > 0
      ? '\n' + details.map(d => `${d.label}: ${d.value}`).join('\n')
      : '';
    const text = `${title || subject}\n\n${message}${plainDetails}\n\n${actionUrl ? `${actionText}: ${actionUrl}` : ''}`;

    if (!transport) {
      // Safe development/fallback logging without crashing
      console.log(`[Email Service - Dev Simulation] To: ${to} | Subject: "${subject}" | Message: "${message}"`);
      return { success: true, simulated: true };
    }

    const info = await transport.sendMail({
      from: fromAddress,
      to,
      subject,
      text,
      html
    });

    console.log(`[Email Service] Email sent successfully to ${to} (MessageId: ${info.messageId})`);
    return { success: true, messageId: info.messageId };

  } catch (error) {
    // Log safely without leaking credentials
    console.error(`[Email Service] Error sending email to ${to}:`, error.message);
    return { success: false, error: error.message };
  }
};

module.exports = {
  sendNotificationEmail,
  getTransporter
};
