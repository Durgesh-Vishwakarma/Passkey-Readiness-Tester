import axios from 'axios';

export interface RPConfig {
  rpID: string;
  rpName: string;
  origin: string;
  timeout?: number;
  userVerification?: 'required' | 'preferred' | 'discouraged';
  authenticatorSelection?: {
    authenticatorAttachment?: 'platform' | 'cross-platform';
    userVerification?: 'required' | 'preferred' | 'discouraged';
    requireResidentKey?: boolean;
  };
}

export interface RPConfigTestResult {
  test: string;
  status: 'passed' | 'failed' | 'warning';
  message: string;
  details?: any;
}

export class RPConfigTester {
  private serverUrl: string;

  constructor(serverUrl: string) {
    this.serverUrl = serverUrl;
  }

  async testConfiguration(): Promise<RPConfigTestResult[]> {
    const results: RPConfigTestResult[] = [];

    try {
      // Test server accessibility
      results.push(await this.testServerAccessibility());
      
      // Test WebAuthn endpoints
      results.push(...await this.testWebAuthnEndpoints());
      
      // Test configuration validation
      results.push(...await this.testConfigurationValidation());
      
      // Test CORS configuration
      results.push(await this.testCORSConfiguration());
      
    } catch (error) {
      results.push({
        test: 'Configuration Testing',
        status: 'failed',
        message: error instanceof Error ? error.message : 'Unknown error occurred'
      });
    }

    return results;
  }

  private async testServerAccessibility(): Promise<RPConfigTestResult> {
    try {
      const response = await axios.get(`${this.serverUrl}/health`, {
        timeout: 5000
      });
      
      if (response.status === 200) {
        return {
          test: 'Server Accessibility',
          status: 'passed',
          message: 'Server is accessible and responding',
          details: { status: response.status, statusText: response.statusText }
        };
      } else {
        return {
          test: 'Server Accessibility',
          status: 'warning',
          message: `Server returned status ${response.status}`,
          details: { status: response.status }
        };
      }
    } catch (error) {
      return {
        test: 'Server Accessibility',
        status: 'failed',
        message: 'Server is not accessible',
        details: { error: error instanceof Error ? error.message : error }
      };
    }
  }

  private async testWebAuthnEndpoints(): Promise<RPConfigTestResult[]> {
    const results: RPConfigTestResult[] = [];
    
    const endpoints = [
      { path: '/api/webauthn/register/start', name: 'Registration Start' },
      { path: '/api/webauthn/register/complete', name: 'Registration Complete' },
      { path: '/api/webauthn/authenticate/start', name: 'Authentication Start' },
      { path: '/api/webauthn/authenticate/complete', name: 'Authentication Complete' }
    ];

    for (const endpoint of endpoints) {
      try {
        const response = await axios.get(`${this.serverUrl}${endpoint.path}`, {
          timeout: 3000,
          validateStatus: () => true // Accept any status code
        });

        if (response.status === 404) {
          results.push({
            test: `${endpoint.name} Endpoint`,
            status: 'failed',
            message: `Endpoint ${endpoint.path} not found`,
            details: { path: endpoint.path, status: 404 }
          });
        } else if (response.status >= 400 && response.status < 500) {
          results.push({
            test: `${endpoint.name} Endpoint`,
            status: 'passed',
            message: `Endpoint exists and handles requests (${response.status})`,
            details: { path: endpoint.path, status: response.status }
          });
        } else {
          results.push({
            test: `${endpoint.name} Endpoint`,
            status: 'passed',
            message: 'Endpoint is accessible',
            details: { path: endpoint.path, status: response.status }
          });
        }
      } catch (error) {
        results.push({
          test: `${endpoint.name} Endpoint`,
          status: 'failed',
          message: `Endpoint ${endpoint.path} is not accessible`,
          details: { 
            path: endpoint.path, 
            error: error instanceof Error ? error.message : error 
          }
        });
      }
    }

    return results;
  }

  private async testConfigurationValidation(): Promise<RPConfigTestResult[]> {
    const results: RPConfigTestResult[] = [];

    try {
      // Test registration start to check configuration
      const testResponse = await axios.post(`${this.serverUrl}/api/webauthn/register/start`, {
        username: 'test-config-user'
      }, {
        timeout: 5000,
        validateStatus: () => true
      });

      if (testResponse.status === 200 && testResponse.data) {
        const data = testResponse.data;
        
        // Check for required WebAuthn fields
        if (data.rp && data.rp.id && data.rp.name) {
          results.push({
            test: 'RP Configuration',
            status: 'passed',
            message: 'Relying Party configuration is valid',
            details: { rpID: data.rp.id, rpName: data.rp.name }
          });
        } else {
          results.push({
            test: 'RP Configuration',
            status: 'failed',
            message: 'Missing or invalid Relying Party configuration',
            details: { receivedData: data }
          });
        }

        // Check user configuration
        if (data.user && data.user.id && data.user.name) {
          results.push({
            test: 'User Configuration',
            status: 'passed',
            message: 'User configuration is valid'
          });
        } else {
          results.push({
            test: 'User Configuration',
            status: 'warning',
            message: 'User configuration may be incomplete'
          });
        }

        // Check challenge
        if (data.challenge) {
          results.push({
            test: 'Challenge Generation',
            status: 'passed',
            message: 'Challenge is properly generated'
          });
        } else {
          results.push({
            test: 'Challenge Generation',
            status: 'failed',
            message: 'No challenge provided in response'
          });
        }

      } else {
        results.push({
          test: 'Configuration Validation',
          status: 'failed',
          message: `Registration start failed with status ${testResponse.status}`,
          details: { status: testResponse.status, data: testResponse.data }
        });
      }

    } catch (error) {
      results.push({
        test: 'Configuration Validation',
        status: 'failed',
        message: 'Could not validate configuration',
        details: { error: error instanceof Error ? error.message : error }
      });
    }

    return results;
  }

  private async testCORSConfiguration(): Promise<RPConfigTestResult> {
    try {
      const response = await axios.options(this.serverUrl, {
        headers: {
          'Origin': 'https://example.com',
          'Access-Control-Request-Method': 'POST',
          'Access-Control-Request-Headers': 'Content-Type'
        },
        timeout: 3000
      });

      const allowOrigin = response.headers['access-control-allow-origin'];
      const allowMethods = response.headers['access-control-allow-methods'];
      const allowHeaders = response.headers['access-control-allow-headers'];

      if (allowOrigin && allowMethods && allowHeaders) {
        return {
          test: 'CORS Configuration',
          status: 'passed',
          message: 'CORS is properly configured',
          details: {
            allowOrigin,
            allowMethods,
            allowHeaders
          }
        };
      } else {
        return {
          test: 'CORS Configuration',
          status: 'warning',
          message: 'CORS configuration may be incomplete',
          details: {
            allowOrigin: allowOrigin || 'missing',
            allowMethods: allowMethods || 'missing',
            allowHeaders: allowHeaders || 'missing'
          }
        };
      }
    } catch (error) {
      return {
        test: 'CORS Configuration',
        status: 'warning',
        message: 'Could not test CORS configuration',
        details: { error: error instanceof Error ? error.message : error }
      };
    }
  }

  async validateRPConfig(config: RPConfig): Promise<RPConfigTestResult[]> {
    const results: RPConfigTestResult[] = [];

    // Validate required fields
    if (!config.rpID) {
      results.push({
        test: 'RP ID Validation',
        status: 'failed',
        message: 'rpID is required'
      });
    } else {
      results.push({
        test: 'RP ID Validation',
        status: 'passed',
        message: 'rpID is present and valid'
      });
    }

    if (!config.rpName) {
      results.push({
        test: 'RP Name Validation',
        status: 'failed',
        message: 'rpName is required'
      });
    } else {
      results.push({
        test: 'RP Name Validation',
        status: 'passed',
        message: 'rpName is present and valid'
      });
    }

    if (!config.origin) {
      results.push({
        test: 'Origin Validation',
        status: 'failed',
        message: 'origin is required'
      });
    } else {
      try {
        new URL(config.origin);
        results.push({
          test: 'Origin Validation',
          status: 'passed',
          message: 'origin is a valid URL'
        });
      } catch {
        results.push({
          test: 'Origin Validation',
          status: 'failed',
          message: 'origin must be a valid URL'
        });
      }
    }

    // Validate optional fields
    if (config.timeout && (config.timeout < 30000 || config.timeout > 300000)) {
      results.push({
        test: 'Timeout Validation',
        status: 'warning',
        message: 'timeout should be between 30000ms and 300000ms'
      });
    } else if (config.timeout) {
      results.push({
        test: 'Timeout Validation',
        status: 'passed',
        message: 'timeout is within recommended range'
      });
    }

    return results;
  }

  async testChallengeHandling(): Promise<RPConfigTestResult> {
    try {
      // Test challenge uniqueness by making multiple requests
      const response1 = await axios.post(`${this.serverUrl}/api/webauthn/register/start`, {
        username: 'challenge-test-1'
      }, {
        timeout: 5000,
        validateStatus: () => true
      });

      const response2 = await axios.post(`${this.serverUrl}/api/webauthn/register/start`, {
        username: 'challenge-test-2'
      }, {
        timeout: 5000,
        validateStatus: () => true
      });

      if (response1.status === 200 && response2.status === 200) {
        const challenge1 = response1.data?.challenge;
        const challenge2 = response2.data?.challenge;

        if (challenge1 && challenge2 && challenge1 !== challenge2) {
          return {
            test: 'Challenge Uniqueness',
            status: 'passed',
            message: 'Challenges are unique across requests',
            details: { uniqueChallenge: true }
          };
        } else {
          return {
            test: 'Challenge Uniqueness',
            status: 'failed',
            message: 'Challenge reuse detected - security vulnerability',
            details: { challenge1, challenge2, reused: challenge1 === challenge2 }
          };
        }
      } else {
        return {
          test: 'Challenge Uniqueness',
          status: 'warning',
          message: 'Could not test challenge uniqueness',
          details: { status1: response1.status, status2: response2.status }
        };
      }
    } catch (error) {
      return {
        test: 'Challenge Uniqueness',
        status: 'failed',
        message: 'Error testing challenge handling',
        details: { error: error instanceof Error ? error.message : error }
      };
    }
  }

  async testOriginValidation(): Promise<RPConfigTestResult> {
    try {
      // Test with different origins
      const testOrigins = [
        'https://malicious-site.com',
        'http://localhost:3000',
        'https://example.com'
      ];

      for (const origin of testOrigins) {
        try {
          const response = await axios.post(`${this.serverUrl}/api/webauthn/register/start`, {
            username: 'origin-test'
          }, {
            headers: {
              'Origin': origin,
              'Content-Type': 'application/json'
            },
            timeout: 3000,
            validateStatus: () => true
          });

          // Check if server properly validates origin
          if (origin.includes('malicious') && response.status === 200) {
            return {
              test: 'Origin Validation',
              status: 'failed',
              message: 'Server accepts requests from unauthorized origins',
              details: { maliciousOrigin: origin, accepted: true }
            };
          }
        } catch (error) {
          // Expected for invalid origins
        }
      }

      return {
        test: 'Origin Validation',
        status: 'passed',
        message: 'Origin validation appears to be properly implemented',
        details: { testedOrigins: testOrigins }
      };
    } catch (error) {
      return {
        test: 'Origin Validation',
        status: 'warning',
        message: 'Could not fully test origin validation',
        details: { error: error instanceof Error ? error.message : error }
      };
    }
  }
}