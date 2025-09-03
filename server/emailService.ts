import { Resend } from 'resend';
import { randomBytes } from 'crypto';

const resend = new Resend(process.env.RESEND_API_KEY);

export class EmailService {
  static generateVerificationToken(): string {
    return randomBytes(32).toString('hex');
  }

  static async sendContactEmail(
    fromName: string,
    fromEmail: string,
    subject: string,
    message: string
  ): Promise<void> {
    const safeSubject = subject?.trim() || 'New Contact Form Message';
    const to = 'support@nusong.app';
    const html = `
      <div style="font-family: Arial, sans-serif;">
        <h2>New contact form submission</h2>
        <p><strong>From:</strong> ${fromName} &lt;${fromEmail}&gt;</p>
        <p><strong>Subject:</strong> ${safeSubject}</p>
        <p><strong>Message:</strong></p>
        <div style="white-space: pre-wrap; background:#111827; color:#e5e7eb; padding:12px; border-radius:8px;">${message}</div>
      </div>
    `;
    const text = `New contact form submission\nFrom: ${fromName} <${fromEmail}>\nSubject: ${safeSubject}\n\n${message}`;

    await resend.emails.send({
      from: 'NuSong Contact <contact@notifications.nusong.app>',
      to,
      subject: `[Contact] ${safeSubject}`,
      html,
      text,
      reply_to: fromEmail,
    } as any);
  }

  static generatePasswordResetToken(): string {
    return randomBytes(32).toString('hex');
  }

  static async sendVerificationEmail(
    email: string, 
    firstName: string, 
    verificationToken: string
  ): Promise<void> {
    const verificationUrl = `https://nusong.app/verify-email/${verificationToken}`;
    
    const emailHtml = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Verify Your NuSong Account</title>
      <style>
        body { margin: 0; padding: 0; font-family: 'Arial', sans-serif; background-color: #0a0a0a; color: #ffffff; }
        .container { max-width: 600px; margin: 0 auto; background: linear-gradient(135deg, #1a1a1a 0%, #2d1b69 100%); }
        .header { padding: 40px 30px; text-align: center; background: linear-gradient(135deg, #4c1d95 0%, #7c3aed 100%); }
        .logo { font-size: 32px; font-weight: bold; color: #ffffff; margin: 0; letter-spacing: -1px; }
        .content { padding: 40px 30px; }
        .welcome { font-size: 24px; font-weight: bold; margin: 0 0 16px 0; color: #ffffff; }
        .message { font-size: 16px; line-height: 1.6; margin: 0 0 32px 0; color: #e2e8f0; }
        .button-container { text-align: center; margin: 32px 0; }
        .verify-button { 
          display: inline-block; 
          padding: 16px 32px; 
          background: linear-gradient(135deg, #7c3aed 0%, #a855f7 100%); 
          color: #ffffff; 
          text-decoration: none; 
          border-radius: 8px; 
          font-size: 16px; 
          font-weight: 600; 
          box-shadow: 0 4px 12px rgba(124, 58, 237, 0.3);
          border: none;
        }
        .verify-button:hover { background: linear-gradient(135deg, #6d28d9 0%, #9333ea 100%); }
        .fallback { margin: 32px 0; padding: 20px; background: #1e293b; border-radius: 8px; border-left: 4px solid #7c3aed; }
        .fallback-text { font-size: 14px; color: #cbd5e1; margin: 0 0 12px 0; }
        .fallback-link { word-break: break-all; color: #a855f7; text-decoration: none; font-family: monospace; font-size: 12px; }
        .footer { padding: 30px; text-align: center; border-top: 1px solid #374151; background: #111827; }
        .footer-text { font-size: 12px; color: #9ca3af; margin: 0; }
        .security-note { margin: 24px 0; padding: 16px; background: #1f2937; border-radius: 6px; font-size: 14px; color: #d1d5db; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1 class="logo">🎵 NuSong</h1>
        </div>
        <div class="content">
          <h2 class="welcome">Welcome to NuSong, ${firstName}!</h2>
          <p class="message">
            Thank you for joining NuSong, the AI-powered music generation platform. 
            To complete your registration and start creating amazing music, please verify your email address.
          </p>
          
          <div class="button-container">
            <a href="${verificationUrl}" class="verify-button">Verify Email Address</a>
          </div>
          
          <div class="fallback">
            <p class="fallback-text">
              If the button above doesn't work, copy and paste this link into your browser:
            </p>
            <a href="${verificationUrl}" class="fallback-link">${verificationUrl}</a>
          </div>
          
          <div class="security-note">
            <strong>Security Note:</strong> This verification link will expire in 24 hours. 
            If you didn't create a NuSong account, you can safely ignore this email.
          </div>
        </div>
        <div class="footer">
          <p class="footer-text">
            © 2025 NuSong. All rights reserved.<br>
            This email was sent to ${email} because you signed up for a NuSong account.
          </p>
        </div>
      </div>
    </body>
    </html>
    `;

    const emailText = `
Welcome to NuSong, ${firstName}!

Thank you for joining NuSong, the AI-powered music generation platform. To complete your registration and start creating amazing music, please verify your email address.

Verify your email: ${verificationUrl}

This verification link will expire in 24 hours. If you didn't create a NuSong account, you can safely ignore this email.

© 2025 NuSong. All rights reserved.
    `;

    try {
      await resend.emails.send({
        from: 'NuSong <noreply@notifications.nusong.app>',
        to: email,
        subject: 'Verify Your NuSong Account',
        html: emailHtml,
        text: emailText,
      });
    } catch (error) {
      console.error('Failed to send verification email:', error);
      throw new Error('Failed to send verification email');
    }
  }

  static async sendWelcomeEmail(email: string, firstName: string): Promise<void> {
    const emailHtml = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Welcome to NuSong!</title>
      <style>
        body { margin: 0; padding: 0; font-family: 'Arial', sans-serif; background-color: #0a0a0a; color: #ffffff; }
        .container { max-width: 600px; margin: 0 auto; background: linear-gradient(135deg, #1a1a1a 0%, #2d1b69 100%); }
        .header { padding: 40px 30px; text-align: center; background: linear-gradient(135deg, #4c1d95 0%, #7c3aed 100%); }
        .logo { font-size: 32px; font-weight: bold; color: #ffffff; margin: 0; letter-spacing: -1px; }
        .content { padding: 40px 30px; }
        .welcome { font-size: 24px; font-weight: bold; margin: 0 0 16px 0; color: #ffffff; }
        .message { font-size: 16px; line-height: 1.6; margin: 0 0 24px 0; color: #e2e8f0; }
        .feature-list { list-style: none; padding: 0; margin: 24px 0; }
        .feature-item { padding: 12px 0; color: #d1d5db; font-size: 16px; }
        .feature-item:before { content: "🎵 "; margin-right: 8px; }
        .button-container { text-align: center; margin: 32px 0; }
        .get-started-button { 
          display: inline-block; 
          padding: 16px 32px; 
          background: linear-gradient(135deg, #7c3aed 0%, #a855f7 100%); 
          color: #ffffff; 
          text-decoration: none; 
          border-radius: 8px; 
          font-size: 16px; 
          font-weight: 600; 
          box-shadow: 0 4px 12px rgba(124, 58, 237, 0.3);
        }
        .footer { padding: 30px; text-align: center; border-top: 1px solid #374151; background: #111827; }
        .footer-text { font-size: 12px; color: #9ca3af; margin: 0; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1 class="logo">🎵 NuSong</h1>
        </div>
        <div class="content">
          <h2 class="welcome">Welcome to NuSong, ${firstName}!</h2>
          <p class="message">
            Your email has been verified and your account is now active! 
            You're ready to start creating amazing AI-powered music.
          </p>
          
          <ul class="feature-list">
            <li class="feature-item">Generate music from text descriptions</li>
            <li class="feature-item">Transform existing audio into new compositions</li>
            <li class="feature-item">Create custom lyrics with AI assistance</li>
            <li class="feature-item">Share your creations with the community</li>
            <li class="feature-item">Build your personal music library</li>
          </ul>
          
          <div class="button-container">
            <a href="https://nusong.app/" class="get-started-button">Start Creating Music</a>
          </div>
        </div>
        <div class="footer">
          <p class="footer-text">
            © 2025 NuSong. All rights reserved.<br>
            Happy music making!
          </p>
        </div>
      </div>
    </body>
    </html>
    `;

    try {
      await resend.emails.send({
        from: 'NuSong <noreply@notifications.nusong.app>',
        to: email,
        subject: 'Welcome to NuSong - Your Account is Ready!',
        html: emailHtml,
      });
    } catch (error) {
      console.error('Failed to send welcome email:', error);
      // Don't throw error for welcome email failures
    }
  }

  static async sendPasswordResetEmail(
    email: string, 
    firstName: string, 
    resetToken: string
  ): Promise<void> {
    const resetUrl = `https://nusong.app/reset-password/${resetToken}`;
    
    const emailHtml = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Reset Your NuSong Password</title>
      <style>
        body { margin: 0; padding: 0; font-family: 'Arial', sans-serif; background-color: #0a0a0a; color: #ffffff; }
        .container { max-width: 600px; margin: 0 auto; background: linear-gradient(135deg, #1a1a1a 0%, #2d1b69 100%); }
        .header { padding: 40px 30px; text-align: center; background: linear-gradient(135deg, #4c1d95 0%, #7c3aed 100%); }
        .logo { font-size: 32px; font-weight: bold; color: #ffffff; margin: 0; letter-spacing: -1px; }
        .content { padding: 40px 30px; }
        .welcome { font-size: 24px; font-weight: bold; margin: 0 0 16px 0; color: #ffffff; }
        .message { font-size: 16px; line-height: 1.6; margin: 0 0 32px 0; color: #e2e8f0; }
        .button-container { text-align: center; margin: 32px 0; }
        .reset-button { 
          display: inline-block; 
          padding: 16px 32px; 
          background: linear-gradient(135deg, #dc2626 0%, #ef4444 100%); 
          color: #ffffff; 
          text-decoration: none; 
          border-radius: 8px; 
          font-size: 16px; 
          font-weight: 600; 
          box-shadow: 0 4px 12px rgba(220, 38, 38, 0.3);
        }
        .reset-button:hover { background: linear-gradient(135deg, #b91c1c 0%, #dc2626 100%); }
        .fallback { margin: 32px 0; padding: 20px; background: #1e293b; border-radius: 8px; border-left: 4px solid #dc2626; }
        .fallback-text { font-size: 14px; color: #cbd5e1; margin: 0 0 12px 0; }
        .fallback-link { word-break: break-all; color: #ef4444; text-decoration: none; font-family: monospace; font-size: 12px; }
        .footer { padding: 30px; text-align: center; border-top: 1px solid #374151; background: #111827; }
        .footer-text { font-size: 12px; color: #9ca3af; margin: 0; }
        .security-note { margin: 24px 0; padding: 16px; background: #7f1d1d; border-radius: 6px; font-size: 14px; color: #fecaca; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1 class="logo">🎵 NuSong</h1>
        </div>
        <div class="content">
          <h2 class="welcome">Reset Your Password</h2>
          <p class="message">
            Hi ${firstName},<br><br>
            We received a request to reset your password for your NuSong account. 
            Click the button below to create a new password.
          </p>
          
          <div class="button-container">
            <a href="${resetUrl}" class="reset-button">Reset My Password</a>
          </div>
          
          <div class="fallback">
            <p class="fallback-text">If the button doesn't work, copy and paste this link:</p>
            <a href="${resetUrl}" class="fallback-link">${resetUrl}</a>
          </div>
          
          <div class="security-note">
            <strong>Important:</strong> This link will expire in 1 hour. If you didn't request a password reset, 
            you can safely ignore this email. Your password won't be changed until you access the link above.
          </div>
        </div>
        <div class="footer">
          <p class="footer-text">
            © 2025 NuSong. All rights reserved.<br>
            If you have any questions, please contact our support team.
          </p>
        </div>
      </div>
    </body>
    </html>
    `;

    const emailText = `
Reset Your NuSong Password

Hi ${firstName},

We received a request to reset your password for your NuSong account. Visit the following link to create a new password:

${resetUrl}

This link will expire in 1 hour. If you didn't request a password reset, you can safely ignore this email.

© 2025 NuSong. All rights reserved.
    `;

    try {
      await resend.emails.send({
        from: 'NuSong <noreply@notifications.nusong.app>',
        to: email,
        subject: 'Reset Your NuSong Password',
        html: emailHtml,
        text: emailText,
      });
    } catch (error) {
      console.error('Failed to send password reset email:', error);
      throw new Error('Failed to send password reset email');
    }
  }
}