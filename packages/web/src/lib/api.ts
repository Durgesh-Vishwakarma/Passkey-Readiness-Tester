import { 
  startRegistration, 
  startAuthentication,
  type RegistrationResponseJSON,
  type AuthenticationResponseJSON
} from '@simplewebauthn/browser';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api';

export class WebAuthnService {
  static async startRegistration(payload: { username: string; email?: string; displayName?: string }) {
    const response = await fetch(`${API_BASE}/webauthn/register/start`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      try {
        const err = await response.json();
        throw new Error(err.message || `Registration start failed: ${response.statusText}`);
      } catch {
        throw new Error(`Registration start failed: ${response.statusText}`);
      }
    }

    const { options, user } = await response.json();
    
    let attResp: RegistrationResponseJSON;
    try {
      attResp = await startRegistration({ optionsJSON: options });
    } catch (error) {
      const errorMsg = (error as Error).message;
      if (errorMsg.includes('The operation either timed out or was not allowed')) {
        throw new Error('Registration timed out or was cancelled. Please try again and complete the biometric prompt.');
      } else if (errorMsg.includes('NotSupported')) {
        throw new Error('WebAuthn not supported on this device/browser. Please use a modern browser with biometric support.');
      } else if (errorMsg.includes('InvalidState')) {
        throw new Error('A passkey may already be registered. Try signing in instead.');
      } else if (errorMsg.includes('NotAllowed')) {
        throw new Error('Registration not allowed. Please enable biometrics in your device settings.');
      }
      throw new Error(`WebAuthn registration failed: ${errorMsg}`);
    }

    return { attResp, user };
  }

  static async finishRegistration(username: string, credential: RegistrationResponseJSON) {
    const response = await fetch(`${API_BASE}/webauthn/register/finish`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, credential })
    });

    if (!response.ok) {
      try {
        const error = await response.json();
        throw new Error(error.message || 'Registration verification failed');
      } catch {
        throw new Error('Registration verification failed');
      }
    }

    return response.json();
  }

  static async startAuthentication(username?: string) {
    const response = await fetch(`${API_BASE}/webauthn/authenticate/start`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username })
    });

    if (!response.ok) {
      try {
        const err = await response.json();
        throw new Error(err.message || `Authentication start failed: ${response.statusText}`);
      } catch {
        throw new Error(`Authentication start failed: ${response.statusText}`);
      }
    }

    const { options } = await response.json();
    
    let authResp: AuthenticationResponseJSON;
    try {
      authResp = await startAuthentication({ optionsJSON: options });
    } catch (error) {
      const errorMsg = (error as Error).message;
      if (errorMsg.includes('The operation either timed out or was not allowed')) {
        throw new Error('Authentication timed out or was cancelled. Please try again and complete the biometric prompt.');
      } else if (errorMsg.includes('NotSupported')) {
        throw new Error('WebAuthn not supported on this device/browser.');
      } else if (errorMsg.includes('InvalidState')) {
        throw new Error('No passkey found. Please register first.');
      } else if (errorMsg.includes('NotAllowed')) {
        throw new Error('Authentication not allowed. Please check your biometric settings.');
      }
      throw new Error(`WebAuthn authentication failed: ${errorMsg}`);
    }

    return authResp;
  }

  static async finishAuthentication(credential: AuthenticationResponseJSON, username?: string) {
    const response = await fetch(`${API_BASE}/webauthn/authenticate/finish`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ credential, username })
    });

    if (!response.ok) {
      try {
        const error = await response.json();
        throw new Error(error.message || 'Authentication verification failed');
      } catch {
        throw new Error('Authentication verification failed');
      }
    }

    return response.json();
  }
}

export class MetricsService {
  static async getSummary() {
    const response = await fetch(`${API_BASE}/metrics/summary`);
    if (!response.ok) throw new Error('Failed to fetch metrics');
    return response.json();
  }

  static async getUsers(page = 1, limit = 10) {
    const response = await fetch(`${API_BASE}/metrics/users?page=${page}&limit=${limit}`);
    if (!response.ok) throw new Error('Failed to fetch users');
    return response.json();
  }

  static async getSecurityEvents(page = 1, limit = 20) {
    const response = await fetch(`${API_BASE}/metrics/events?page=${page}&limit=${limit}`);
    if (!response.ok) throw new Error('Failed to fetch security events');
    return response.json();
  }
}

export class SecurityService {
  static async getAnalysis() {
    const response = await fetch(`${API_BASE}/security/analysis`);
    if (!response.ok) throw new Error('Failed to fetch security analysis');
    return response.json();
  }

  static async getThreats() {
    const response = await fetch(`${API_BASE}/security/threats`);
    if (!response.ok) throw new Error('Failed to fetch threat analysis');
    return response.json();
  }
}
