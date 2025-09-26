import { Router, Request, Response } from 'express';
import { asyncHandler } from '@/middleware/error.js';
import { WebAuthnController } from '@/controllers/WebAuthnController.js';
import { z } from 'zod';

const router = Router();
const webauthnController = new WebAuthnController();

// Validation schemas
const registrationStartSchema = z.object({
  // Allow username to be either a traditional handle or an email
  username: z.string().min(3).max(100),
  email: z.string().email().optional(),
  displayName: z.string().min(1).max(100).optional()
});

const registrationFinishSchema = z.object({
  username: z.string(),  
  credential: z.any() // WebAuthn credential response
});

const authenticationStartSchema = z.object({
  // username can be a traditional username or an email identifier
  username: z.string().min(3).max(100).optional()
});

const authenticationFinishSchema = z.object({
  username: z.string().optional(),
  credential: z.any() // WebAuthn credential response
});

// Start registration process
router.post('/register/start', asyncHandler(async (req: Request, res: Response) => {
  const validatedBody = registrationStartSchema.parse(req.body);
  req.body = validatedBody;
  await webauthnController.startRegistration(req, res);
}));

// Complete registration process  
router.post('/register/finish', asyncHandler(async (req: Request, res: Response) => {
  const validatedBody = registrationFinishSchema.parse(req.body);
  req.body = validatedBody;
  await webauthnController.finishRegistration(req, res);
}));

// Start authentication process
router.post('/authenticate/start', asyncHandler(async (req: Request, res: Response) => {
  const validatedBody = authenticationStartSchema.parse(req.body);
  req.body = validatedBody;
  await webauthnController.startAuthentication(req, res);
}));

// Complete authentication process
router.post('/authenticate/finish', asyncHandler(async (req: Request, res: Response) => {
  const validatedBody = authenticationFinishSchema.parse(req.body);
  req.body = validatedBody;
  await webauthnController.finishAuthentication(req, res);
}));

export { router as webauthnRoutes };