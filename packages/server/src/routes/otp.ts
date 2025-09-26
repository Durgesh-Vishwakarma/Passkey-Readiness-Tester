import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { asyncHandler } from '@/middleware/error.js';
import { OTPController } from '@/controllers/OTPController.js';

const router = Router();
const otpController = new OTPController();

// Validation schemas
const sendRegistrationSchema = z.object({
  username: z.string().min(3).max(100).optional(),
  email: z.string().email().optional(),
  phoneNumber: z.string().min(6).max(20).optional(),
  method: z.enum(['email', 'sms'])
});

const verifyRegistrationSchema = z.object({
  otpId: z.string().min(1),
  otp: z.string().min(4).max(10),
  username: z.string().min(3).max(100) // can be email too
});

const sendAuthenticationSchema = z.object({
  username: z.string().min(3).max(100).optional(),
  email: z.string().email().optional(),
  phoneNumber: z.string().min(6).max(20).optional(),
  method: z.enum(['email', 'sms'])
});

const verifyAuthenticationSchema = z.object({
  otpId: z.string().min(1),
  otp: z.string().min(4).max(10),
  username: z.string().min(3).max(100).optional(),
  email: z.string().email().optional(),
  identifier: z.string().min(3).max(100).optional()
});

// Routes
router.post('/register/send', asyncHandler(async (req: Request, res: Response) => {
  const validated = sendRegistrationSchema.parse(req.body);
  req.body = validated;
  await otpController.sendRegistrationOTP(req, res);
}));

router.post('/register/verify', asyncHandler(async (req: Request, res: Response) => {
  const validated = verifyRegistrationSchema.parse(req.body);
  req.body = validated;
  await otpController.verifyRegistrationOTP(req, res);
}));

router.post('/authenticate/send', asyncHandler(async (req: Request, res: Response) => {
  const validated = sendAuthenticationSchema.parse(req.body);
  req.body = validated;
  await otpController.sendAuthenticationOTP(req, res);
}));

router.post('/authenticate/verify', asyncHandler(async (req: Request, res: Response) => {
  const validated = verifyAuthenticationSchema.parse(req.body);
  req.body = validated;
  await otpController.verifyAuthenticationOTP(req, res);
}));

router.get('/stats', asyncHandler(async (req: Request, res: Response) => {
  await otpController.getFallbackStats(req, res);
}));

export { router as otpRoutes };
