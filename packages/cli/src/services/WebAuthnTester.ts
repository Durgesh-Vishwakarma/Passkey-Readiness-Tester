import axios, { AxiosResponse } from 'axios';
import chalk from 'chalk';

export class WebAuthnTester {
  constructor(private serverUrl: string) {}

  async validateEndpoints(): Promise<any> {
    const results = {
      status: 'pass',
      message: 'WebAuthn endpoints validated successfully',
      details: [] as string[],
      recommendations: [] as string[]
    };

    try {
      // Test registration start endpoint
      const regStartTest = await this.testRegistrationStart();
      if (regStartTest.status === 'fail') {
        results.status = 'fail';
        results.message = 'WebAuthn endpoint validation failed';
        results.details.push(`Registration start: ${regStartTest.message}`);
        results.recommendations.push(...regStartTest.recommendations);
      } else {
        results.details.push('Registration start endpoint: OK');
      }

      // Test authentication start endpoint
      const authStartTest = await this.testAuthenticationStart();
      if (authStartTest.status === 'fail') {
        results.status = 'fail';
        results.message = 'WebAuthn endpoint validation failed';
        results.details.push(`Authentication start: ${authStartTest.message}`);
        results.recommendations.push(...authStartTest.recommendations);
      } else {
        results.details.push('Authentication start endpoint: OK');
      }

      // Test CORS configuration
      const corsTest = await this.testCorsConfiguration();
      if (corsTest.status === 'fail') {
        results.status = 'fail';
        results.message = 'WebAuthn endpoint validation failed';
        results.details.push(`CORS configuration: ${corsTest.message}`);
        results.recommendations.push(...corsTest.recommendations);
      } else {
        results.details.push('CORS configuration: OK');
      }

    } catch (error) {
      results.status = 'fail';
      results.message = `Endpoint validation error: ${error instanceof Error ? error.message : 'Unknown error'}`;
      results.recommendations.push('Verify server is running and endpoints are accessible');
    }

    return results;
  }

  private async testRegistrationStart(): Promise<any> {
    try {
      const response = await axios.post(`${this.serverUrl}/api/webauthn/register/start`, {
        username: 'test-user-cli'
      }, {
        headers: { 'Content-Type': 'application/json' },
        timeout: 10000
      });

      if (response.status === 200 && response.data.options) {
        const options = response.data.options;
        
        // Validate required WebAuthn registration options
        const requiredFields = ['challenge', 'rp', 'user', 'pubKeyCredParams'];
        const missingFields = requiredFields.filter(field => !options[field]);
        
        if (missingFields.length > 0) {
          return {
            status: 'fail',
            message: `Missing required registration options: ${missingFields.join(', ')}`,
            recommendations: ['Ensure all required WebAuthn registration options are included']
          };
        }

        // Validate RP configuration
        if (!options.rp.name || !options.rp.id) {
          return {
            status: 'fail',
            message: 'Invalid RP configuration in registration options',
            recommendations: ['Verify RP name and ID are properly configured']
          };
        }

        // Validate user configuration
        if (!options.user.id || !options.user.name || !options.user.displayName) {
          return {
            status: 'fail',
            message: 'Invalid user configuration in registration options',
            recommendations: ['Ensure user ID, name, and displayName are properly set']
          };
        }

        // Validate challenge
        if (!options.challenge || options.challenge.length < 32) {
          return {
            status: 'fail',
            message: 'Challenge is too short or missing',
            recommendations: ['Use a cryptographically secure challenge of at least 32 bytes']
          };
        }

        return {
          status: 'pass',
          message: 'Registration start endpoint is properly configured'
        };

      } else {
        return {
          status: 'fail',
          message: `Unexpected response format from registration start endpoint`,
          recommendations: ['Check registration start endpoint response format']
        };
      }

    } catch (error: any) {
      if (axios.isAxiosError(error)) {
        return {
          status: 'fail',
          message: `Registration start failed: ${error.response?.status} ${error.response?.statusText}`,
          recommendations: [
            'Verify the registration start endpoint exists and is accessible',
            'Check request format and required parameters'
          ]
        };
      }
      throw error;
    }
  }

  private async testAuthenticationStart(): Promise<any> {
    try {
      const response = await axios.post(`${this.serverUrl}/api/webauthn/authenticate/start`, {
        username: 'test-user-cli'
      }, {
        headers: { 'Content-Type': 'application/json' },
        timeout: 10000
      });

      if (response.status === 200 && response.data.options) {
        const options = response.data.options;
        
        // Validate required WebAuthn authentication options
        const requiredFields = ['challenge', 'rpId'];
        const missingFields = requiredFields.filter(field => !options[field]);
        
        if (missingFields.length > 0) {
          return {
            status: 'fail',
            message: `Missing required authentication options: ${missingFields.join(', ')}`,
            recommendations: ['Ensure all required WebAuthn authentication options are included']
          };
        }

        // Validate challenge
        if (!options.challenge || options.challenge.length < 32) {
          return {
            status: 'fail',
            message: 'Authentication challenge is too short or missing',
            recommendations: ['Use a cryptographically secure challenge of at least 32 bytes']
          };
        }

        return {
          status: 'pass',
          message: 'Authentication start endpoint is properly configured'
        };

      } else {
        return {
          status: 'fail',
          message: `Unexpected response format from authentication start endpoint`,
          recommendations: ['Check authentication start endpoint response format']
        };
      }

    } catch (error: any) {
      if (axios.isAxiosError(error)) {
        return {
          status: 'fail',
          message: `Authentication start failed: ${error.response?.status} ${error.response?.statusText}`,
          recommendations: [
            'Verify the authentication start endpoint exists and is accessible',
            'Check request format and required parameters'
          ]
        };
      }
      throw error;
    }
  }

  private async testCorsConfiguration(): Promise<any> {
    try {
      // Test CORS preflight request
      const preflightResponse = await axios.options(`${this.serverUrl}/api/webauthn/register/start`, {
        headers: {
          'Origin': 'http://localhost:3000',
          'Access-Control-Request-Method': 'POST',
          'Access-Control-Request-Headers': 'Content-Type'
        },
        timeout: 5000
      });

      const corsHeaders = preflightResponse.headers;
      
      // Validate CORS headers
      if (!corsHeaders['access-control-allow-origin']) {
        return {
          status: 'fail',
          message: 'CORS Access-Control-Allow-Origin header missing',
          recommendations: ['Configure CORS to allow frontend origins']
        };
      }

      if (!corsHeaders['access-control-allow-methods']?.includes('POST')) {
        return {
          status: 'fail',
          message: 'CORS does not allow POST method',
          recommendations: ['Configure CORS to allow POST method for WebAuthn endpoints']
        };
      }

      if (!corsHeaders['access-control-allow-headers']?.includes('content-type')) {
        return {
          status: 'fail',
          message: 'CORS does not allow Content-Type header',
          recommendations: ['Configure CORS to allow Content-Type header']
        };
      }

      return {
        status: 'pass',
        message: 'CORS configuration is properly set up'
      };

    } catch (error) {
      return {
        status: 'fail',
        message: `CORS test failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        recommendations: [
          'Verify CORS is properly configured for WebAuthn endpoints',
          'Ensure preflight requests are handled correctly'
        ]
      };
    }
  }

  async testErrorHandling(): Promise<any> {
    const results = {
      status: 'pass',
      message: 'Error handling validated successfully',
      details: [] as string[],
      recommendations: [] as string[]
    };

    try {
      // Test 1: Invalid username format
      const invalidUsernameTest = await this.testInvalidUsername();
      if (invalidUsernameTest.status === 'fail') {
        results.status = 'fail';
        results.message = 'Error handling validation failed';
        results.details.push(`Invalid username handling: ${invalidUsernameTest.message}`);
        results.recommendations.push(...invalidUsernameTest.recommendations);
      } else {
        results.details.push('Invalid username handling: OK');
      }

      // Test 2: Missing required fields
      const missingFieldsTest = await this.testMissingFields();
      if (missingFieldsTest.status === 'fail') {
        results.status = 'fail';
        results.message = 'Error handling validation failed';
        results.details.push(`Missing fields handling: ${missingFieldsTest.message}`);
        results.recommendations.push(...missingFieldsTest.recommendations);
      } else {
        results.details.push('Missing fields handling: OK');
      }

      // Test 3: Invalid content type
      const contentTypeTest = await this.testInvalidContentType();
      if (contentTypeTest.status === 'fail') {
        results.status = 'fail';
        results.message = 'Error handling validation failed';
        results.details.push(`Content type handling: ${contentTypeTest.message}`);
        results.recommendations.push(...contentTypeTest.recommendations);
      } else {
        results.details.push('Content type handling: OK');
      }

    } catch (error) {
      results.status = 'fail';
      results.message = `Error handling test failed: ${error instanceof Error ? error.message : 'Unknown error'}`;
      results.recommendations.push('Review error handling implementation in WebAuthn endpoints');
    }

    return results;
  }

  private async testInvalidUsername(): Promise<any> {
    try {
      const response = await axios.post(`${this.serverUrl}/api/webauthn/register/start`, {
        username: '' // Invalid empty username
      }, {
        headers: { 'Content-Type': 'application/json' },
        timeout: 5000,
        validateStatus: () => true // Don't throw on error status codes
      });

      if (response.status === 400 && response.data.error) {
        return {
          status: 'pass',
          message: 'Invalid username properly rejected'
        };
      } else {
        return {
          status: 'fail',
          message: 'Invalid username not properly handled',
          recommendations: ['Implement proper username validation and return 400 status for invalid usernames']
        };
      }

    } catch (error) {
      return {
        status: 'fail',
        message: `Invalid username test failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        recommendations: ['Ensure error handling doesn\'t cause server crashes']
      };
    }
  }

  private async testMissingFields(): Promise<any> {
    try {
      const response = await axios.post(`${this.serverUrl}/api/webauthn/register/start`, {
        // Missing username field
      }, {
        headers: { 'Content-Type': 'application/json' },
        timeout: 5000,
        validateStatus: () => true
      });

      if (response.status === 400 && response.data.error) {
        return {
          status: 'pass',
          message: 'Missing required fields properly handled'
        };
      } else {
        return {
          status: 'fail',
          message: 'Missing required fields not properly handled',
          recommendations: ['Implement proper field validation and return 400 status for missing required fields']
        };
      }

    } catch (error) {
      return {
        status: 'fail',
        message: `Missing fields test failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        recommendations: ['Ensure error handling doesn\'t cause server crashes']
      };
    }
  }

  private async testInvalidContentType(): Promise<any> {
    try {
      const response = await axios.post(`${this.serverUrl}/api/webauthn/register/start`, 'invalid-json', {
        headers: { 'Content-Type': 'text/plain' },
        timeout: 5000,
        validateStatus: () => true
      });

      if (response.status === 400 || response.status === 415) {
        return {
          status: 'pass',
          message: 'Invalid content type properly handled'
        };
      } else {
        return {
          status: 'fail',
          message: 'Invalid content type not properly handled',
          recommendations: ['Implement proper content-type validation and return appropriate error status']
        };
      }

    } catch (error) {
      return {
        status: 'fail',
        message: `Content type test failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        recommendations: ['Ensure error handling doesn\'t cause server crashes']
      };
    }
  }

}