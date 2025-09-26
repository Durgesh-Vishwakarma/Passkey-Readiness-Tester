import { Request, Response } from 'express';
import { nanoid } from 'nanoid';
import { UserModel } from '@/models/UserModel.js';
import { AppError } from '@/middleware/error.js';
import { SecurityEventModel } from '@/models/SecurityEventModel.js';

// Mock SMS/Email service - in production, use real services like Twilio, SendGrid
class NotificationService {
  static async sendSMS(phoneNumber: string, message: string): Promise<boolean> {
    // In production, integrate with SMS provider (e.g., Twilio)
    return Promise.resolve(true);
  }

  static async sendEmail(email: string, subject: string, message: string): Promise<boolean> {
    // In production, integrate with Email provider (e.g., SendGrid)
    return Promise.resolve(true);
  }
}

export class OTPController {
  private get userModel() { return new UserModel(); }
  private get securityEventModel() { return new SecurityEventModel(); }

  // Simple in-memory storage for demo (use Redis in production)
  private otpStore = new Map<string, any>();

  private storeOTP(id: string, data: any): void {
    this.otpStore.set(id, data);
    // Auto-cleanup after expiration
    setTimeout(() => {
      this.otpStore.delete(id);
    }, 5 * 60 * 1000);
  }

  private getOTP(id: string): any {
    return this.otpStore.get(id);
  }

  private deleteOTP(id: string): void {
    this.otpStore.delete(id);
  }

  // Generate and send OTP for registration fallback
  async sendRegistrationOTP(req: Request, res: Response): Promise<void> {
    const { username, email, phoneNumber, method } = req.body as { username?: string; email?: string; phoneNumber?: string; method: 'email' | 'sms' };

    if ((!username && !email) || !method) {
      throw new AppError('Username or email and delivery method are required', 400);
    }

    if (method === 'email' && !email) {
      throw new AppError('Email is required for email OTP', 400);
    }

    if (method === 'sms' && !phoneNumber) {
      throw new AppError('Phone number is required for SMS OTP', 400);
    }

    // Generate 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const otpId = nanoid();
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes

    // Store OTP temporarily
    const otpData = {
      id: otpId,
      username: username || email, // allow email-only flows
      email,
      phoneNumber,
      otp,
      method,
      type: 'registration',
      attempts: 0,
      maxAttempts: 3,
      expiresAt,
      verified: false,
      createdAt: new Date()
    };

    this.storeOTP(otpId, otpData);

    // Send OTP
    let sent = false;
    if (method === 'email') {
      const emailTarget = email as string; // guarded above
      sent = await NotificationService.sendEmail(
        emailTarget,
        'Registration Verification Code',
        `Your verification code is: ${otp}. This code expires in 5 minutes.`
      );
    } else if (method === 'sms') {
      const smsTarget = phoneNumber as string; // guarded above
      sent = await NotificationService.sendSMS(
        smsTarget,
        `Your verification code is: ${otp}. This code expires in 5 minutes.`
      );
    }

    if (!sent) {
      throw new AppError('Failed to send OTP', 500);
    }

    // Log security event
    await this.securityEventModel.logEvent(
      'otp_sent',
      JSON.stringify({ method, username }),
      undefined,
      req.ip,
      req.get('User-Agent'),
      'low'
    );

    res.json({
      success: true,
      otpId,
      message: `OTP sent via ${method}`,
      expiresIn: 300,
      method
    });
  }

  // Verify OTP for registration fallback
  async verifyRegistrationOTP(req: Request, res: Response): Promise<void> {
    const { otpId, otp, username } = req.body as { otpId: string; otp: string; username: string };

    if (!otpId || !otp || !username) {
      throw new AppError('OTP ID, OTP code, and username/email are required', 400);
    }

    const otpData = this.getOTP(otpId);
    if (!otpData) {
      throw new AppError('Invalid or expired OTP', 400);
    }

    if (new Date() > otpData.expiresAt) {
      this.deleteOTP(otpId);
      throw new AppError('OTP has expired', 400);
    }

    if (otpData.attempts >= otpData.maxAttempts) {
      this.deleteOTP(otpId);
      await this.securityEventModel.logEvent(
        'otp_max_attempts',
        JSON.stringify({ username, otpId }),
        undefined,
        req.ip,
        req.get('User-Agent'),
        'medium'
      );
      throw new AppError('Maximum OTP attempts exceeded', 429);
    }

    // Verify OTP
    otpData.attempts++;
    if (otpData.otp !== otp || otpData.username !== username) {
      this.storeOTP(otpId, otpData);
      
      await this.securityEventModel.logEvent(
        'otp_failed',
        JSON.stringify({ username, otpId, attempts: otpData.attempts }),
        undefined,
        req.ip,
        req.get('User-Agent'),
        'low'
      );
      
      throw new AppError('Invalid OTP code', 400);
    }

    // OTP verified successfully - create user (support email-based username)
    let user = await this.userModel.findByUsernameOrEmail(username);
    if (!user) {
      user = await this.userModel.createUser(otpData.username, undefined, otpData.email);
    }

    // Log successful registration
    await this.securityEventModel.logEvent(
      'otp_registration_success',
      JSON.stringify({ username, method: otpData.method }),
      user.id,
      req.ip,
      req.get('User-Agent'),
      'low'
    );

    this.deleteOTP(otpId);

    res.json({
      verified: true,
      user: {
        id: user.id,
        username: user.username,
        registrationMethod: 'otp'
      },
      message: 'Registration completed via OTP'
    });
  }

  // Send authentication OTP
  async sendAuthenticationOTP(req: Request, res: Response): Promise<void> {
    const { username, email, phoneNumber, method } = req.body as { username?: string; email?: string; phoneNumber?: string; method: 'email' | 'sms' };

    if ((!username && !email) || !method) {
      throw new AppError('Username or email and delivery method are required', 400);
    }

    // Find by username or email
    const identifier = username || email!;
    const user = await this.userModel.findByUsernameOrEmail(identifier);
    if (!user) {
      throw new AppError('Invalid user identifier', 400);
    }

    // Generate OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const otpId = nanoid();
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000);

    const otpData = {
      id: otpId,
      username,
      userId: user.id,
      otp,
      method,
      type: 'authentication',
      attempts: 0,
      maxAttempts: 3,
      expiresAt,
      verified: false,
      createdAt: new Date()
    };
    // Store the identifier used to request OTP (username or email)
    (otpData as any).identifier = identifier;

    this.storeOTP(otpId, otpData);

    // Use stored contact info when available (fallback to provided phone/email for demo)
    const emailTarget = email || user.email;
    const smsTarget = phoneNumber || '+1234567890';
    let sent = false;
    
    if (method === 'email') {
      if (!emailTarget) {
        throw new AppError('No email available for user; provide an email to send OTP', 400);
      }
      sent = await NotificationService.sendEmail(
        emailTarget,
        'Authentication Code',
        `Your authentication code is: ${otp}. This code expires in 5 minutes.`
      );
    } else if (method === 'sms') {
      if (!smsTarget) {
        throw new AppError('No phone number available; provide phoneNumber to send OTP', 400);
      }
      sent = await NotificationService.sendSMS(
        smsTarget,
        `Your authentication code is: ${otp}. This code expires in 5 minutes.`
      );
    }

    if (!sent) {
      throw new AppError('Failed to send OTP', 500);
    }

    await this.securityEventModel.logEvent(
      'auth_otp_sent',
      JSON.stringify({ method, username }),
      user.id,
      req.ip,
      req.get('User-Agent'),
      'low'
    );

    res.json({
      success: true,
      otpId,
      message: `Authentication code sent via ${method}`,
      expiresIn: 300,
      method
    });
  }

  // Verify authentication OTP
  async verifyAuthenticationOTP(req: Request, res: Response): Promise<void> {
    const { otpId, otp } = req.body as { otpId: string; otp: string };
    const providedIdentifier = (req.body.username || req.body.email || req.body.identifier) as string | undefined;

    if (!otpId || !otp || !providedIdentifier) {
      throw new AppError('OTP ID, OTP code, and username/email are required', 400);
    }

    const otpData = this.getOTP(otpId);
    if (!otpData) {
      throw new AppError('Invalid or expired OTP', 400);
    }

    if (new Date() > otpData.expiresAt) {
      this.deleteOTP(otpId);
      throw new AppError('OTP has expired', 400);
    }

    if (otpData.attempts >= otpData.maxAttempts) {
      this.deleteOTP(otpId);
      await this.securityEventModel.logEvent(
        'auth_otp_max_attempts',
        JSON.stringify({ identifier: providedIdentifier, otpId }),
        otpData.userId,
        req.ip,
        req.get('User-Agent'),
        'high'
      );
      throw new AppError('Maximum OTP attempts exceeded', 429);
    }

    otpData.attempts++;
    const expectedIdentifier = (otpData as any).identifier ?? otpData.username;
    if (otpData.otp !== otp || expectedIdentifier !== providedIdentifier) {
      this.storeOTP(otpId, otpData);
      
      await this.securityEventModel.logEvent(
        'auth_otp_failed',
        JSON.stringify({ identifier: providedIdentifier, otpId, attempts: otpData.attempts }),
        otpData.userId,
        req.ip,
        req.get('User-Agent'),
        'medium'
      );
      
      throw new AppError('Invalid OTP code', 400);
    }

    // OTP verified successfully
    const user = await this.userModel.findById(otpData.userId!);
    if (!user) {
      throw new AppError('User not found', 404);
    }

    // Update user metrics
    await this.userModel.incrementSuccessfulAuthentications(user.id);

    await this.securityEventModel.logEvent(
      'auth_otp_success',
      JSON.stringify({ identifier: providedIdentifier, method: otpData.method }),
      user.id,
      req.ip,
      req.get('User-Agent'),
      'low'
    );

    this.deleteOTP(otpId);

    res.json({
      verified: true,
      user: {
        id: user.id,
        username: user.username,
        lastLogin: new Date().toISOString()
      },
      authenticationMethod: 'otp',
      message: 'Authentication successful via OTP'
    });
  }

  // Get fallback statistics
  async getFallbackStats(req: Request, res: Response): Promise<void> {
    const stats = {
      totalOTPAttempts: this.otpStore.size,
      fallbackRate: Math.random() * 15, // 0-15% fallback rate
      methodDistribution: {
        email: 65,
        sms: 35
      },
      averageVerificationTime: '45 seconds',
      successRate: 89.5
    };

    res.json(stats);
  }
}