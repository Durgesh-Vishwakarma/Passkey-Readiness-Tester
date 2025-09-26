import { Request, Response } from 'express';
import {
  generateRegistrationOptions,
  generateAuthenticationOptions,
  verifyRegistrationResponse,
  verifyAuthenticationResponse,
  VerifiedRegistrationResponse,
  VerifiedAuthenticationResponse
} from '@simplewebauthn/server';
import { isoBase64URL } from '@simplewebauthn/server/helpers';

import { UserModel } from '@/models/UserModel.js';
import { CredentialModel } from '@/models/CredentialModel.js';
import { ChallengeModel } from '@/models/ChallengeModel.js';
import { SecurityEventModel } from '@/models/SecurityEventModel.js';
import { getEnv } from '@/utils/env.js';
import { AppError } from '@/middleware/error.js';

// Helper to canonicalize a credential ID that may have been double-encoded
function canonicalizeCredentialId(id: string): { canonical: string; transformations: string[] } {
  const steps: string[] = [];
  let current = id;
  try {
    // Attempt to detect and unwrap a double-encoded base64url string.
    // Case: we stored base64url(Buffer.from(base64urlStringAsBytes)) producing a longer 58/60 char string.
    for (let i = 0; i < 2; i++) {
      const buf = Buffer.from(current, 'base64url');
      const ascii = buf.toString('utf8');
      // If the decoded bytes themselves look like a base64url string AND shorter than current, unwrap once
      if (/^[A-Za-z0-9_-]+$/.test(ascii) && ascii.length < current.length) {
        steps.push(`unwrap-layer-${i + 1}`);
        current = ascii;
        continue;
      }
      // Otherwise produce canonical base64url of the raw bytes
      const canonical = isoBase64URL.fromBuffer(buf);
      if (canonical !== current) {
        steps.push('re-encode-raw');
      }
      current = canonical;
      break;
    }
  } catch (e) {
    steps.push('canonicalization-error:' + String(e));
  }
  return { canonical: current, transformations: steps };
}

export class WebAuthnController {
  private get userModel() { return new UserModel(); }
  private get credentialModel() { return new CredentialModel(); }
  private get challengeModel() { return new ChallengeModel(); }
  private get securityEventModel() { return new SecurityEventModel(); }

  // Start registration process
  async startRegistration(req: Request, res: Response): Promise<void> {
    const { username, email, displayName } = req.body as { username: string; email?: string; displayName?: string };
    const env = getEnv();

    if (!username || typeof username !== 'string') {
      throw new AppError('Username is required', 400);
    }

    // Find or create user
    // Allow identifier to be username or email; create with provided profile
    // If creating with email, ensure no existing user uses this email
    let user = await this.userModel.findByUsernameOrEmail(username);
    if (!user) {
      if (email) {
        const emailOwner = await this.userModel.findByEmail(email);
        if (emailOwner) {
          throw new AppError('Email already in use. Please sign in or use a different email.', 409);
        }
      }
      user = await this.userModel.createUser(username, displayName, email);
    }

    // Get existing credentials for excludeCredentials
    const existingCredentials = await this.credentialModel.findByUserId(user.id);
    // Minimal diagnostics retained in development

    const options = await generateRegistrationOptions({
      rpName: env.RP_NAME,
      rpID: env.RP_ID,
      userID: Buffer.from(user.id, 'utf8'), // raw nanoid bytes
      userName: user.username,
      userDisplayName: user.displayName || user.username,
      attestationType: env.ENABLE_ATTESTATION ? 'direct' : 'none',
      excludeCredentials: existingCredentials.map(cred => ({
        // Keep as base64url string (spec allows ArrayBuffer when invoking browser API; library handles conversion)
        id: cred.id,
        type: 'public-key' as const,
        transports: cred.transports as any
      })),
      authenticatorSelection: {
        authenticatorAttachment: 'platform',
        residentKey: 'required',
        userVerification: 'required'
      },
      timeout: 60000
    });

    // Avoid verbose logs in production

    // Store challenge
    await this.challengeModel.createChallenge(options.challenge, 'registration', user.id);

    // Log security event
    await this.securityEventModel.logEvent(
      'registration_start',
      JSON.stringify({ username }),
      user.id,
      req.ip,
      req.get('User-Agent'),
      'low'
    );

    res.json({
      options,
      user: {
        id: user.id,
        username: user.username,
        displayName: user.displayName
      }
    });
  }

  // Complete registration process
  async finishRegistration(req: Request, res: Response): Promise<void> {
    const { username, credential } = req.body;
    const env = getEnv();

    const user = await this.userModel.findByUsername(username);
    if (!user) {
      throw new AppError('User not found', 404);
    }

    const challenge = await this.challengeModel.findValidChallenge('registration', user.id);
    if (!challenge) {
      throw new AppError('Invalid or expired challenge', 400);
    }

    let verification: VerifiedRegistrationResponse;
    try {
      verification = await verifyRegistrationResponse({
        response: credential,
        expectedChallenge: challenge.challenge,
        expectedOrigin: env.CORS_ORIGINS,
        expectedRPID: env.RP_ID,
        requireUserVerification: false
      });
    } catch (error) {
      await this.securityEventModel.logEvent(
        'registration_failed',
        JSON.stringify({ error: (error as Error).message }),
        user.id,
        req.ip,
        req.get('User-Agent'),
        'medium'
      );
      throw new AppError('Registration verification failed', 400);
    }

    if (!verification.verified || !verification.registrationInfo) {
      throw new AppError('Registration verification failed', 400);
    }

  const { credentialID, credentialPublicKey, counter } = verification.registrationInfo;

  // Properly derive the base64url identifier for storage (avoid double-encoding)
  // credentialID is a Buffer/Uint8Array already; ensure proper base64url encoding
  const canonicalId = isoBase64URL.fromBuffer(Buffer.from(credentialID));
  // Keep storage concise
    
    const credentialToStore = {
      id: canonicalId,
      userId: user.id,
      publicKey: Buffer.from(credentialPublicKey),
      counter,
      deviceType: (credential.response.authenticatorAttachment === 'platform' || 
                   (credential.response.transports && credential.response.transports.includes('internal')) 
                   ? 'platform' : 'cross-platform') as 'platform' | 'cross-platform',
      transports: credential.response.transports || [],
      createdAt: new Date(),
      lastUsedAt: new Date(),
      useCount: 0
    };
    
    // Omit verbose storage logs
    
    await this.credentialModel.createCredential(credentialToStore);

    // Mark challenge as used
    await this.challengeModel.markChallengeAsUsed(challenge.id);

    // Update user metrics
    await this.userModel.incrementPasskeyRegistrations(user.id);

    // Log success event
    await this.securityEventModel.logEvent(
      'registration_success',
      JSON.stringify({
        credentialId: Buffer.from(credentialID).toString('base64url'),
        deviceType: credential.response.authenticatorAttachment
      }),
      user.id,
      req.ip,
      req.get('User-Agent'),
      'low'
    );

    res.json({
      verified: true,
      user: {
        id: user.id,
        username: user.username,
        credentialCount: user.passkeyRegistrations + 1
      }
    });
  }

  // Start authentication process
  async startAuthentication(req: Request, res: Response): Promise<void> {
  //
    try {
      const { username } = req.body;
      const env = getEnv();
  //

      let allowCredentials = undefined;
      let user = null;

      if (username) {
  // Allow email or username identifier
  user = await this.userModel.findByUsernameOrEmail(username);
        if (!user) {
          // For security, don't reveal if user exists or not
          // Still generate options to prevent user enumeration
          console.log(`🔍 [AUTH START] Authentication attempt for non-existent user: ${username}`);
        } else {
          //
          const userCredentials = await this.credentialModel.findByUserId(user.id);
          //
          if (userCredentials.length === 0) {
            // For now, throw a clear error instead of falling back
            console.log(`🔍 [AUTH START] User ${username} has no registered passkeys`);
            throw new AppError('No passkeys registered for this user. Please register a passkey first.', 400);
          } else {
            //
            
            allowCredentials = userCredentials.map(cred => ({
              id: cred.id,
              type: 'public-key' as const,
              transports: cred.transports as any
            }));
            
            //
          }
        }
      }

      // Decide strategy: if we have user + credentials, explicitly restrict via allowCredentials.
      // Otherwise fall back to userless discoverable flow.
      let options;
      //
      
  if (allowCredentials && Array.isArray(allowCredentials) && allowCredentials.length > 0) {
        const binaryAllow = allowCredentials.map((ac, _index) => {
          try { 
            const binary = isoBase64URL.toBuffer(ac.id);
            return { ...ac, id: binary }; 
          }
          catch (e) { 
            // Fallback to utf8 representation
            return { ...ac, id: Buffer.from(ac.id, 'utf8') }; 
          }
        });
        
        try {
          options = await generateAuthenticationOptions({
            rpID: env.RP_ID,
            allowCredentials: binaryAllow as any,
            userVerification: 'required',
            timeout: 60000
          });
        } catch (e) {
          //
          // Fall back to userless discoverable flow instead of 500
          options = await generateAuthenticationOptions({
            rpID: env.RP_ID,
            userVerification: 'required',
            timeout: 60000
          });
        }
      } else {
        try {
          options = await generateAuthenticationOptions({
            rpID: env.RP_ID,
            userVerification: 'required',
            timeout: 60000
          });
        } catch (e) {
          //
          // Return 400 with a clear message instead of generic 500
          throw new AppError('Failed to prepare authentication options. Check RP_ID and origin configuration.', 400);
        }
      }

      //

      // Store challenge
      try {
        await this.challengeModel.createChallenge(options.challenge, 'authentication', user?.id);
      } catch (challengeError) {
        throw new AppError('Failed to store authentication challenge', 500);
      }
      // Log auth attempt for metrics
      await this.securityEventModel.logEvent(
        'authentication_start',
        JSON.stringify({ username }),
        user?.id,
        req.ip,
        req.get('User-Agent'),
        'low'
      );

      res.json({ options });
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError('Failed to start authentication', 500);
    }
  }

  // Complete authentication process
  async finishAuthentication(req: Request, res: Response): Promise<void> {
    const { credential } = req.body;
    const env = getEnv();

    // Get user from userHandle in the credential response (for userless authentication)
    let authUser = null;
    if (credential.response.userHandle) {
      const rawHandle = credential.response.userHandle;
      //
      try {
        const decoded = Buffer.from(rawHandle, 'base64url').toString('utf8');
        authUser = await this.userModel.findById(decoded);
      } catch (e) {
        authUser = await this.userModel.findById(rawHandle);
      }
    } else {
      //
    }

    // Find credential by multiple ID formats since WebAuthn can return different formats
    const credentialId = credential.rawId || credential.id;
  //
    
    // Attempt direct lookup
    let credentialRecord = await this.credentialModel.findById(credentialId);
    let lookupMethod = 'direct';

    // If not found, try canonical forms (handle potential double-encoding)
    if (!credentialRecord) {
      const receivedCanon = canonicalizeCredentialId(credentialId);
      //
      if (receivedCanon.canonical !== credentialId) {
        credentialRecord = await this.credentialModel.findById(receivedCanon.canonical);
        if (credentialRecord) lookupMethod = 'canonical-received';
      }
    }

    // If still not found, scan user credentials (if user known) and attempt canonical match
    if (!credentialRecord) {
      const userForScan = authUser ? await this.credentialModel.findByUserId(authUser.id) : [];
      for (const cred of userForScan) {
        const canon = canonicalizeCredentialId(cred.id);
        if (canon.canonical !== cred.id) {
          // Compare canonical forms
            if (canon.canonical === credentialId) {
              credentialRecord = cred;
              lookupMethod = 'user-scan-canonical';
              break;
            }
        }
      }
    }

    // As a last resort, brute-force decode all credentials (small demo DB assumption)
    if (!credentialRecord) {
      const allForUser = authUser ? await this.credentialModel.findByUserId(authUser.id) : [];
      for (const cred of allForUser) {
        try {
          const storedCanon = canonicalizeCredentialId(cred.id);
          const storedBuf = isoBase64URL.toBuffer(storedCanon.canonical);
          const receivedBuf = isoBase64URL.toBuffer(credentialId);
          if (Buffer.from(storedBuf).compare(Buffer.from(receivedBuf)) === 0) {
            credentialRecord = cred;
            lookupMethod = 'binary-match';
            break;
          }
        } catch { /* ignore */ }
      }
    }

    if (!credentialRecord) {
      //
      throw new AppError('Credential not found', 404);
    }

    // Produce canonical credential ID and optionally persist migration
    const storedCanon = canonicalizeCredentialId(credentialRecord.id);
    const receivedCanon = canonicalizeCredentialId(credentialId);
    const storedBuf = (() => { try { return isoBase64URL.toBuffer(storedCanon.canonical); } catch { return null; } })();
    const receivedBuf = (() => { try { return isoBase64URL.toBuffer(receivedCanon.canonical); } catch { return null; } })();
  const buffersMatch = !!(storedBuf && receivedBuf && Buffer.from(storedBuf).compare(Buffer.from(receivedBuf)) === 0);

    //

    // If canonical differs from stored, migrate (best effort)
    if (storedCanon.canonical !== credentialRecord.id && buffersMatch) {
  //
      credentialRecord.id = storedCanon.canonical;
      // Fire and forget, ignore result for now
      this.credentialModel.updateCredential(storedCanon.canonical, {});
    }

    // Find challenge
    const challenge = await this.challengeModel.findValidChallenge('authentication');
    if (!challenge) {
      throw new AppError('Invalid or expired challenge', 400);
    }

    let verification: VerifiedAuthenticationResponse;
    try {
      // Ensure credentialPublicKey is a Buffer
      let publicKey: any = credentialRecord.publicKey;
      if (publicKey && !Buffer.isBuffer(publicKey)) {
        // Mongo might have returned BSON Binary or something similar
        if (publicKey.buffer && Buffer.isBuffer(publicKey.buffer)) {
          publicKey = publicKey.buffer;
        } else if (publicKey._bsontype === 'Binary' && publicKey.buffer) {
          publicKey = Buffer.from(publicKey.buffer);
        } else if (Array.isArray(publicKey)) {
          publicKey = Buffer.from(publicKey);
        }
      }

      console.log('🔍 [AUTH FINISH] PublicKey diagnostics:', {
        isBuffer: Buffer.isBuffer(publicKey),
        type: typeof publicKey,
        ctor: publicKey?.constructor?.name,
        byteLength: Buffer.isBuffer(publicKey) ? publicKey.length : undefined
      });

      // Decode stored credential ID (which we canonicalized earlier) for verification
      const authenticatorCredentialID = (() => {
        try { return isoBase64URL.toBuffer(storedCanon.canonical); } catch { return isoBase64URL.toBuffer(credentialRecord.id); }
      })();

      verification = await verifyAuthenticationResponse({
        response: credential,
        expectedChallenge: challenge.challenge,
        expectedOrigin: env.CORS_ORIGINS,
        expectedRPID: env.RP_ID,
        authenticator: {
          credentialID: authenticatorCredentialID as any,
          credentialPublicKey: Buffer.isBuffer(publicKey) ? publicKey : Buffer.from(publicKey),
          counter: credentialRecord.counter
        }
      });
    } catch (error) {
      //
      
      await this.securityEventModel.logEvent(
        'authentication_failed',
        JSON.stringify({ error: (error as Error).message }),
        credentialRecord.userId,
        req.ip,
        req.get('User-Agent'),
        'medium'
      );
      throw new AppError('Authentication verification failed', 400);
    }

    if (!verification.verified) {
      throw new AppError('Authentication verification failed', 400);
    }

    // Update credential counter
    await this.credentialModel.updateCounter(credentialRecord.id, verification.authenticationInfo.newCounter);

    // Mark challenge as used
    await this.challengeModel.markChallengeAsUsed(challenge.id);

    // Update user metrics
    await this.userModel.incrementSuccessfulAuthentications(credentialRecord.userId);

    // Get user info
    const user = await this.userModel.findById(credentialRecord.userId);

    // Log success event
    await this.securityEventModel.logEvent(
      'authentication_success',
      JSON.stringify({ credentialId: credentialRecord.id }),
      credentialRecord.userId,
      req.ip,
      req.get('User-Agent'),
      'low'
    );

    res.json({
      verified: true,
      user: {
        id: user?.id,
        username: user?.username,
        lastLogin: new Date().toISOString()
      }
    });
  }
}