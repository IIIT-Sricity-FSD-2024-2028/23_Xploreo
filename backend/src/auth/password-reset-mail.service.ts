import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import * as nodemailer from 'nodemailer';

const GMAIL_SMTP_HOST = 'smtp.gmail.com';
const DEFAULT_SENDER = 'xploreo2324@gmail.com';

/** Sends password-reset emails. SMTP credentials are intentionally environment-only. */
@Injectable()
export class PasswordResetMailService {
  assertConfigured(): void {
    // Evaluate the configuration before looking up an email address so a missing
    // mail setup cannot become an account-enumeration signal.
    void this.configuration;
  }

  private get configuration() {
    const user = process.env.SMTP_USER || DEFAULT_SENDER;
    const password = process.env.SMTP_PASS;
    if (!password) {
      throw new ServiceUnavailableException(
        'Password-reset email is not configured. Set SMTP_PASS before using this feature.',
      );
    }

    return {
      host: process.env.SMTP_HOST || GMAIL_SMTP_HOST,
      port: Number(process.env.SMTP_PORT || 465),
      secure: (process.env.SMTP_SECURE || 'true').toLowerCase() === 'true',
      auth: { user, pass: password },
      from: process.env.SMTP_FROM || `Xploreo Support <${user}>`,
    };
  }

  async sendPasswordReset(email: string, resetUrl: string): Promise<void> {
    const config = this.configuration;
    const transport = nodemailer.createTransport({
      host: config.host,
      port: config.port,
      secure: config.secure,
      auth: config.auth,
    });

    await transport.sendMail({
      from: config.from,
      to: email,
      subject: 'Reset your Xploreo password',
      text: [
        'We received a request to reset your Xploreo password.',
        `Use this link within 5 minutes: ${resetUrl}`,
        'If you did not request this, you can safely ignore this email.',
      ].join('\n\n'),
      html: `<p>We received a request to reset your Xploreo password.</p>
        <p><a href="${resetUrl}">Reset your password</a></p>
        <p>This link expires in <strong>5 minutes</strong>. If you did not request this, you can safely ignore this email.</p>`,
    });
  }
}
