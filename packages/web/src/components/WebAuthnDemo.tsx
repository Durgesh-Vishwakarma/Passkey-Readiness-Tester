'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { User, Fingerprint, Smartphone, AlertCircle, CheckCircle2, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { WebAuthnService } from '@/lib/api';

interface DemoState {
  step: 'username' | 'registering' | 'registered' | 'authenticating' | 'authenticated';
  username: string;
  email: string;
  displayName: string;
  loading: boolean;
  error: string | null;
  success: string | null;
  user: any;
  registrationTime: number | null;
  credentialId: string | null;
}

export function WebAuthnDemo() {
  const [state, setState] = useState<DemoState>({
    step: 'username',
    username: 'demo_user_2025',
    email: 'demo@passkey-auth.com',
    displayName: 'Demo User',
    loading: false,
    error: null,
    success: null,
    user: null,
    registrationTime: null,
    credentialId: null
  });

  const handleRegister = async () => {
    if (!state.username.trim()) {
      setState(prev => ({ ...prev, error: 'Please enter a username' }));
      return;
    }

    setState(prev => ({ ...prev, loading: true, error: null, step: 'registering' }));

    try {
      const { attResp, user } = await WebAuthnService.startRegistration({
        username: state.username,
        email: state.email || undefined,
        displayName: state.displayName || undefined
      });
      const result = await WebAuthnService.finishRegistration(state.username, attResp);
      
      setState(prev => ({ 
        ...prev, 
        loading: false, 
        step: 'registered',
        user: result.user
      }));
    } catch (error) {
      setState(prev => ({ 
        ...prev, 
        loading: false, 
        error: (error as Error).message,
        step: 'username'
      }));
    }
  };

  const handleAuthenticate = async () => {
    setState(prev => ({ ...prev, loading: true, error: null, step: 'authenticating' }));

    try {
      // Prefer username, fallback to email if username attempt fails with a recoverable error
  const primaryId = state.username?.trim() || state.email?.trim() || '';
  let authResp: any;
  let result: any;
      try {
        authResp = await WebAuthnService.startAuthentication(primaryId);
      } catch (e) {
        // If first attempt fails and we have an alternate identifier, retry with email
        const altId = (primaryId === state.email?.trim()) ? state.username?.trim() : state.email?.trim();
        if (altId) {
          authResp = await WebAuthnService.startAuthentication(altId);
          result = await WebAuthnService.finishAuthentication(authResp, altId);
          setState(prev => ({ 
            ...prev, 
            loading: false, 
            step: 'authenticated',
            user: result.user
          }));
          return;
        }
        throw e;
      }
      result = await WebAuthnService.finishAuthentication(authResp, primaryId);
      
      setState(prev => ({ 
        ...prev, 
        loading: false, 
        step: 'authenticated',
        user: result.user
      }));
    } catch (error) {
      const errorMessage = (error as Error).message;
      let userFriendlyMessage = errorMessage;
      
      if (errorMessage.includes('timed out') || errorMessage.includes('not allowed')) {
        userFriendlyMessage = 'Authentication cancelled or timed out. Please try again and complete the biometric prompt.';
      } else if (errorMessage.includes('NotSupported')) {
        userFriendlyMessage = 'WebAuthn not supported on this device/browser.';
      } else if (errorMessage.includes('InvalidState')) {
        userFriendlyMessage = 'No passkey found. Please register first.';
      } else if (errorMessage.includes('NotAllowed')) {
        userFriendlyMessage = 'Authentication blocked. Check if biometrics are enabled.';
      } else if (errorMessage.includes('No passkeys registered')) {
        userFriendlyMessage = 'No passkey found for this user. Please register first.';
      } else if (errorMessage.includes('Internal Server Error') || errorMessage.includes('500')) {
        userFriendlyMessage = 'Server error. Please register a passkey first before trying to authenticate.';
      }
      
      setState(prev => ({ 
        ...prev, 
        loading: false, 
        error: userFriendlyMessage,
        step: 'registered'
      }));
    }
  };

  const resetDemo = () => {
    setState({
      step: 'username',
      username: '',
      email: '',
      displayName: '',
      loading: false,
      error: null,
      success: null,
      user: null,
      registrationTime: null,
      credentialId: null
    });
  };

  return (
    <div className="max-w-4xl mx-auto">
      <div className="text-center mb-12">
        <h2 className="text-3xl font-bold text-gray-900 mb-4">Live WebAuthn Demo</h2>
        <p className="text-lg text-gray-600">
          Experience passwordless authentication with your device's biometrics or security key
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-8">
        {/* Demo Interface */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6 }}
        >
          <Card className="h-full hover:shadow-lg transition-shadow">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Fingerprint className="h-5 w-5 text-blue-600" />
                Interactive Demo
              </CardTitle>
              <CardDescription>
                Try registering and authenticating with WebAuthn
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 p-4">
              {state.error && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="space-y-2"
                >
                  <div className="flex items-start gap-2 p-3 bg-red-50 text-red-700 rounded-md border border-red-200">
                    <AlertCircle className="h-4 w-4 flex-shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <span className="text-sm font-medium block mb-1">
                        {(state.step === 'authenticating' || state.step === 'authenticated' || state.step === 'registered') && !state.error?.includes('passkey')
                          ? 'Authentication Failed'
                          : 'Registration Failed'}
                      </span>
                      <span className="text-xs">{state.error}</span>
                    </div>
                  </div>
                  
                  {state.error.includes('timed out') || state.error.includes('cancelled') ? (
                    <div className="bg-blue-50 border border-blue-200 rounded-md p-2">
                      <p className="text-xs text-blue-800 font-medium mb-1">💡 Common Solutions:</p>
                      <ul className="text-xs text-blue-700 space-y-0.5">
                        <li>• Enable biometrics in your device settings</li>
                        <li>• Try using your device PIN instead</li>
                        <li>• Make sure no other apps are using biometrics</li>
                        <li>• Clear browser cache and try again</li>
                      </ul>
                    </div>
                  ) : null}
                </motion.div>
              )}

              {state.success && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex items-center gap-2 p-2 bg-green-50 text-green-700 rounded-md border border-green-200"
                >
                  <CheckCircle2 className="h-3 w-3 flex-shrink-0" />
                  <span className="text-xs">{state.success}</span>
                </motion.div>
              )}

              {state.step === 'username' && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="space-y-4"
                >
                  {/* Registration Form */}
                  <div className="space-y-3">
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">
                        Username *
                      </label>
                      <input
                        type="text"
                        value={state.username}
                        onChange={(e) => setState(prev => ({ ...prev, username: e.target.value, error: null }))}
                        placeholder="demo_user_2025"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-transparent cursor-text hover:border-blue-400 transition-all duration-200 text-sm"
                        onKeyPress={(e) => e.key === 'Enter' && handleRegister()}
                      />

                    </div>
                    
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">
                        Email Address *
                      </label>
                      <input
                        type="email"
                        value={state.email}
                        onChange={(e) => setState(prev => ({ ...prev, email: e.target.value, error: null }))}
                        placeholder="demo@passkey-auth.com"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-transparent cursor-text hover:border-blue-400 transition-all duration-200 text-sm"
                        onKeyPress={(e) => e.key === 'Enter' && handleRegister()}
                      />

                    </div>
                    
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">
                        Display Name *
                      </label>
                      <input
                        type="text"
                        value={state.displayName}
                        onChange={(e) => setState(prev => ({ ...prev, displayName: e.target.value, error: null }))}
                        placeholder="Demo User"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-transparent cursor-text hover:border-blue-400 transition-all duration-200 text-sm"
                        onKeyPress={(e) => e.key === 'Enter' && handleRegister()}
                      />

                    </div>
                  </div>

                  {/* Information Card */}
                  <div className="bg-blue-50 border border-blue-200 rounded-md p-2 text-center">
                    <p className="text-xs text-blue-800">
                      <Fingerprint className="inline h-3 w-3 mr-1" />
                      Secure passkey authentication - no passwords needed
                    </p>
                  </div>
                  
                  {/* Browser Compatibility Notice */}
                  <div className="text-xs text-gray-500 text-center">
                    <p>✅ Works on: Chrome, Firefox, Safari, Edge (latest versions)</p>
                    <p>📱 Supports: Touch ID, Face ID, Windows Hello, Security Keys</p>
                  </div>

                  {/* Quick Fill Button */}
                  <div className="text-center">
                    <button
                      type="button"
                      onClick={() => setState(prev => ({ 
                        ...prev, 
                        username: 'demo_user_2025',
                        email: 'demo@passkey-auth.com',
                        displayName: 'Demo User',
                        error: null 
                      }))}
                      className="text-xs text-blue-600 hover:text-blue-800 cursor-pointer underline"
                    >
                      Use demo data
                    </button>
                  </div>

                  {/* Register Button */}
                  <Button 
                    onClick={handleRegister} 
                    className="w-full bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-600 hover:from-blue-700 hover:via-purple-700 hover:to-indigo-700 text-white font-medium text-sm py-2 px-4 rounded-md shadow-md hover:shadow-lg transform hover:scale-105 transition-all duration-200" 
                    size="default"
                    disabled={!state.username.trim() || !state.email.trim() || !state.displayName.trim()}
                  >
                    <Fingerprint className="h-4 w-4 mr-2" />
                    Create Passkey Account
                  </Button>


                </motion.div>
              )}

              {state.step === 'registering' && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="text-center py-6"
                >
                  <div className="relative">
                    <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full mx-auto mb-3 flex items-center justify-center">
                      <Loader2 className="h-6 w-6 animate-spin text-white" />
                    </div>
                    <div className="absolute -top-1 -right-1 w-6 h-6 bg-yellow-400 rounded-full flex items-center justify-center">
                      <Fingerprint className="h-3 w-3 text-yellow-800" />
                    </div>
                  </div>
                  
                  <h3 className="text-base font-semibold text-gray-900 mb-2">Creating Your Passkey</h3>
                  <p className="text-sm text-gray-600 mb-2">Follow your device prompts to complete registration</p>
                  <div className="text-xs text-blue-600 bg-blue-50 p-2 rounded-md">
                    <p className="font-medium mb-1">💡 Quick Tips:</p>
                    <p>• Don't close this tab during registration</p>
                    <p>• Complete the biometric prompt within 60 seconds</p>
                    <p>• If cancelled, just click the button again</p>
                  </div>
                </motion.div>
              )}

              {state.step === 'registered' && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="space-y-4"
                >
                  <div className="bg-green-50 border border-green-200 rounded-md p-3 text-center">
                    <CheckCircle2 className="h-8 w-8 text-green-600 mx-auto mb-2" />
                    <h3 className="text-sm font-semibold text-green-800 mb-1">Passkey Created!</h3>
                    <p className="text-xs text-green-700">Welcome, {state.user?.displayName || state.displayName}</p>
                  </div>
                  
                  <div className="text-center">
                    <p className="text-sm text-gray-600 mb-3">
                      Ready! Now test authentication.
                    </p>
                    <Button 
                      onClick={handleAuthenticate} 
                      className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-sm" 
                      size="default"
                    >
                      <Fingerprint className="h-4 w-4 mr-2" />
                      Test Authentication
                    </Button>
                  </div>
                </motion.div>
              )}

              {state.step === 'authenticating' && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="text-center py-6"
                >
                  <div className="relative">
                    <div className="w-12 h-12 bg-gradient-to-r from-green-500 to-emerald-500 rounded-full mx-auto mb-3 flex items-center justify-center">
                      <Loader2 className="h-6 w-6 animate-spin text-white" />
                    </div>
                    <div className="absolute -top-1 -right-1 w-6 h-6 bg-green-400 rounded-full flex items-center justify-center">
                      <User className="h-3 w-3 text-green-800" />
                    </div>
                  </div>
                  
                  <h3 className="text-base font-semibold text-gray-900 mb-2">Authenticating</h3>
                  <p className="text-sm text-gray-600 mb-2">Use your biometric or device PIN to sign in</p>
                  <div className="text-xs text-green-600 bg-green-50 p-2 rounded-md">
                    <p className="font-medium mb-1">🔐 Authentication Tips:</p>
                    <p>• Use the same finger/face as registration</p>
                    <p>• Complete within 60 seconds</p>
                    <p>• Try again if it times out</p>
                  </div>
                </motion.div>
              )}

              {state.step === 'authenticated' && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="space-y-4"
                >
                  <div className="bg-green-50 border border-green-200 rounded-md p-3 text-center">
                    <CheckCircle2 className="h-8 w-8 text-green-600 mx-auto mb-2" />
                    <h3 className="text-sm font-semibold text-green-800 mb-1">Authentication Successful!</h3>
                    <p className="text-xs text-green-700">Welcome back, {state.user?.displayName || state.displayName}</p>
                  </div>
                  
                  <div className="flex gap-2">
                    <Button 
                      onClick={handleAuthenticate} 
                      variant="outline" 
                      className="flex-1 text-xs border-green-300 text-green-700 hover:bg-green-50"
                      size="sm"
                    >
                      Auth Again
                    </Button>
                    <Button 
                      onClick={resetDemo} 
                      className="flex-1 text-xs bg-blue-600 hover:bg-blue-700"
                      size="sm"
                    >
                      New Demo
                    </Button>
                  </div>
                </motion.div>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Information Panel */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
        >
          <Card className="h-full hover:shadow-lg transition-shadow">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Smartphone className="h-5 w-5 text-green-600" />
                What's Happening?
              </CardTitle>
              <CardDescription>
                Understanding the WebAuthn flow
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0 w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-sm font-semibold">
                    1
                  </div>
                  <div>
                    <h4 className="font-semibold text-gray-900">Registration</h4>
                    <p className="text-sm text-gray-600">
                      Your device generates a unique cryptographic key pair. The private key stays on your device.
                    </p>
                  </div>
                </div>
                
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0 w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-sm font-semibold">
                    2
                  </div>
                  <div>
                    <h4 className="font-semibold text-gray-900">Biometric Verification</h4>
                    <p className="text-sm text-gray-600">
                      Use Touch ID, Face ID, Windows Hello, or a security key to verify it's really you.
                    </p>
                  </div>
                </div>
                
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0 w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-sm font-semibold">
                    3
                  </div>
                  <div>
                    <h4 className="font-semibold text-gray-900">Authentication</h4>
                    <p className="text-sm text-gray-600">
                      Future sign-ins use cryptographic proof instead of passwords - impossible to phish!
                    </p>
                  </div>
                </div>
              </div>
              
              <div className="space-y-4">
                <div className="p-3 bg-blue-50 rounded-lg">
                  <h4 className="font-semibold text-blue-900 mb-2">Security Benefits</h4>
                  <ul className="text-sm text-blue-800 space-y-1">
                    <li>• No passwords to remember or steal</li>
                    <li>• Phishing resistant authentication</li>
                    <li>• Biometric verification</li>
                    <li>• Cross-platform compatibility</li>
                  </ul>
                </div>
                
                <div className="p-3 bg-yellow-50 rounded-lg border border-yellow-200">
                  <h4 className="font-semibold text-yellow-900 mb-2">🔧 Troubleshooting</h4>
                  <div className="text-sm text-yellow-800 space-y-2">
                    <div>
                      <p className="font-medium">If registration/auth fails:</p>
                      <ul className="text-xs mt-1 space-y-0.5 ml-2">
                        <li>• Enable biometrics in device settings</li>
                        <li>• Try using device PIN/password</li>
                        <li>• Use latest browser version</li>
                        <li>• Check HTTPS connection (required)</li>
                      </ul>
                    </div>
                    <div>
                      <p className="font-medium">Supported browsers:</p>
                      <p className="text-xs">Chrome 67+, Firefox 60+, Safari 14+, Edge 18+</p>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}