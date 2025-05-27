import nodemailer from 'nodemailer';

interface EmailOptions {
  to: string;
  subject: string;
  html: string;
}

class EmailService {
  private transporter: nodemailer.Transporter;

  constructor() {
    // Use consistent environment variable names
    const emailUser = process.env.EMAIL_USER || process.env.NEXT_PUBLIC_EMAIL_USER;
    const emailPass = process.env.EMAIL_PASS || process.env.NEXT_PUBLIC_EMAIL_PASS;

    // Debug logging (remove in production)
    console.log('Email User:', emailUser ? 'Set' : 'Not set');
    console.log('Email Pass:', emailPass ? 'Set' : 'Not set');

    if (!emailUser || !emailPass) {
      throw new Error('Email credentials are not properly configured');
    }

    this.transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: emailUser,
        pass: emailPass,
      },
    });
  }

  async sendEmail({ to, subject, html }: EmailOptions): Promise<boolean> {
    try {
      const emailUser = process.env.EMAIL_USER || process.env.NEXT_PUBLIC_EMAIL_USER;
      
      const mailOptions = {
        from: `"UniArchive" <${emailUser}>`,
        to,
        subject,
        html,
      };

      await this.transporter.sendMail(mailOptions);
      return true;
    } catch (error) {
      console.error('Email sending failed:', error);
      return false;
    }
  }

  generateVerificationEmail(name: string, verificationCode: string): string {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Verify Your Email - UniArchive</title>
      </head>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
          <h1 style="color: white; margin: 0; font-size: 28px;">UniArchive</h1>
          <p style="color: white; margin: 10px 0 0 0; opacity: 0.9;">Email Verification</p>
        </div>
        
        <div style="background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px;">
          <h2 style="color: #333; margin-top: 0;">Hello ${name}!</h2>
          <p>Thank you for signing up with UniArchive. To complete your registration, please verify your email address.</p>
          
          <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0; text-align: center; border-left: 4px solid #667eea;">
            <h3 style="margin: 0 0 10px 0; color: #667eea;">Your Verification Code</h3>
            <div style="font-size: 32px; font-weight: bold; color: #333; letter-spacing: 4px; font-family: monospace;">
              ${verificationCode}
            </div>
          </div>
          
          <p>This code will expire in 15 minutes. If you didn't create an account with UniArchive, please ignore this email.</p>
          
          <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd; font-size: 12px; color: #666;">
            <p>This is an automated email. Please do not reply to this message.</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  generatePasswordResetEmail(name: string, resetToken: string): string {
    const resetUrl = `${process.env.APP_URL}/reset-password?token=${resetToken}`;
    
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Reset Your Password - UniArchive</title>
      </head>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
          <h1 style="color: white; margin: 0; font-size: 28px;">UniArchive</h1>
          <p style="color: white; margin: 10px 0 0 0; opacity: 0.9;">Password Reset</p>
        </div>
        
        <div style="background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px;">
          <h2 style="color: #333; margin-top: 0;">Hello ${name}!</h2>
          <p>We received a request to reset your password for your UniArchive account.</p>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${resetUrl}" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; font-weight: bold; display: inline-block;">
              Reset Password
            </a>
          </div>
          
          <p>Or copy and paste this link in your browser:</p>
          <p style="background: #e9ecef; padding: 10px; border-radius: 4px; word-break: break-all; font-family: monospace; font-size: 12px;">
            ${resetUrl}
          </p>
          
          <p>This link will expire in 1 hour. If you didn't request a password reset, please ignore this email.</p>
          
          <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd; font-size: 12px; color: #666;">
            <p>This is an automated email. Please do not reply to this message.</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  async sendVerificationEmail(to: string, name: string, verificationCode: string): Promise<boolean> {
    return this.sendEmail({
      to,
      subject: 'Verify Your Email - UniArchive',
      html: this.generateVerificationEmail(name, verificationCode),
    });
  }

  async sendPasswordResetEmail(to: string, name: string, resetToken: string): Promise<boolean> {
    return this.sendEmail({
      to,
      subject: 'Reset Your Password - UniArchive',
      html: this.generatePasswordResetEmail(name, resetToken),
    });
  }
}

export const emailService = new EmailService();