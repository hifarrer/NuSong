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
    const to = 'support@nusong.ai';
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
      from: 'NuSong Contact <contact@notifications.nusong.ai>',
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
    const verificationUrl = `https://nusong.ai/verify-email/${verificationToken}`;
    
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
        from: 'NuSong <noreply@notifications.nusong.ai>',
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
            <a href="https://nusong.ai/" class="get-started-button">Start Creating Music</a>
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
        from: 'NuSong <noreply@notifications.nusong.ai>',
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
    const resetUrl = `https://nusong.ai/reset-password/${resetToken}`;
    
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
        from: 'NuSong <noreply@notifications.nusong.ai>',
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

  static async sendKieCallbackEmail(callbackData: any): Promise<void> {
    try {
      const { callbackType, taskId, tracks } = callbackData;
      
      const html = `
        <div style="font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto;">
          <h2 style="color: #3b82f6;">KIE API Callback Received</h2>
          
          <div style="background: #f3f4f6; padding: 16px; border-radius: 8px; margin: 16px 0;">
            <h3 style="margin: 0 0 8px 0; color: #374151;">Callback Details</h3>
            <p style="margin: 4px 0;"><strong>Type:</strong> ${callbackType}</p>
            <p style="margin: 4px 0;"><strong>Task ID:</strong> ${taskId}</p>
            <p style="margin: 4px 0;"><strong>Timestamp:</strong> ${new Date().toISOString()}</p>
          </div>
          
          <h3 style="color: #374151; margin-top: 24px;">Generated Tracks (${tracks.length})</h3>
          
          ${tracks.map((track: any, index: number) => `
            <div style="border: 1px solid #e5e7eb; border-radius: 8px; padding: 16px; margin: 16px 0; background: #ffffff;">
              <h4 style="margin: 0 0 12px 0; color: #1f2937;">Track ${index + 1}: ${track.title || 'Untitled'}</h4>
              
              <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 12px;">
                <div>
                  <p style="margin: 4px 0; font-size: 14px;"><strong>ID:</strong> ${track.id}</p>
                  <p style="margin: 4px 0; font-size: 14px;"><strong>Model:</strong> ${track.modelName}</p>
                  <p style="margin: 4px 0; font-size: 14px;"><strong>Duration:</strong> ${track.duration ? `${Math.floor(track.duration / 60)}:${(track.duration % 60).toString().padStart(2, '0')}` : 'N/A'}</p>
                  <p style="margin: 4px 0; font-size: 14px;"><strong>Created:</strong> ${track.createTime}</p>
                </div>
                <div>
                  <p style="margin: 4px 0; font-size: 14px;"><strong>Tags:</strong> ${track.tags}</p>
                </div>
              </div>
              
              <div style="margin: 12px 0;">
                <p style="margin: 4px 0; font-size: 14px;"><strong>Prompt:</strong></p>
                <div style="background: #f9fafb; padding: 8px; border-radius: 4px; font-size: 14px; white-space: pre-wrap;">${track.prompt}</div>
              </div>
              
              <div style="margin: 12px 0;">
                <p style="margin: 4px 0; font-size: 14px;"><strong>Audio URLs:</strong></p>
                <ul style="margin: 4px 0; padding-left: 20px; font-size: 14px;">
                  <li><a href="${track.audioUrl}" target="_blank">Audio URL</a></li>
                  <li><a href="${track.sourceAudioUrl}" target="_blank">Source Audio URL</a></li>
                  <li><a href="${track.streamAudioUrl}" target="_blank">Stream Audio URL</a></li>
                  <li><a href="${track.sourceStreamAudioUrl}" target="_blank">Source Stream Audio URL</a></li>
                </ul>
              </div>
              
              <div style="margin: 12px 0;">
                <p style="margin: 4px 0; font-size: 14px;"><strong>Image URLs:</strong></p>
                <ul style="margin: 4px 0; padding-left: 20px; font-size: 14px;">
                  <li><a href="${track.imageUrl}" target="_blank">Image URL</a></li>
                  <li><a href="${track.sourceImageUrl}" target="_blank">Source Image URL</a></li>
                </ul>
              </div>
            </div>
          `).join('')}
          
          <div style="margin-top: 24px; padding: 16px; background: #fef3c7; border-radius: 8px; border-left: 4px solid #f59e0b;">
            <p style="margin: 0; font-size: 14px; color: #92400e;">
              <strong>Note:</strong> This is a temporary callback handler. The data above contains all the information received from the KIE API.
            </p>
          </div>
        </div>
      `;
      
      const text = `
KIE API Callback Received

Callback Details:
- Type: ${callbackType}
- Task ID: ${taskId}
- Timestamp: ${new Date().toISOString()}

Generated Tracks (${tracks.length}):

${tracks.map((track: any, index: number) => `
Track ${index + 1}: ${track.title || 'Untitled'}
- ID: ${track.id}
- Model: ${track.modelName}
- Duration: ${track.duration ? `${Math.floor(track.duration / 60)}:${(track.duration % 60).toString().padStart(2, '0')}` : 'N/A'}
- Created: ${track.createTime}
- Tags: ${track.tags}
- Prompt: ${track.prompt}
- Audio URL: ${track.audioUrl}
- Source Audio URL: ${track.sourceAudioUrl}
- Stream Audio URL: ${track.streamAudioUrl}
- Source Stream Audio URL: ${track.sourceStreamAudioUrl}
- Image URL: ${track.imageUrl}
- Source Image URL: ${track.sourceImageUrl}
`).join('\n')}

Note: This is a temporary callback handler. The data above contains all the information received from the KIE API.
      `;

      await resend.emails.send({
        from: 'NuSong KIE Callback <contact@notifications.nusong.ai>',
        to: 'contact@nusong.ai',
        subject: `[KIE Callback] ${callbackType} - Task ${taskId} - ${tracks.length} track(s)`,
        html,
        text,
      } as any);
      
      console.log('KIE callback email sent successfully');
    } catch (error) {
      console.error('Failed to send KIE callback email:', error);
      throw new Error('Failed to send KIE callback email');
    }
  }
}