import axios from 'axios';

export interface SecurityFinding {
  id: string;
  title: string;
  description: string;
  severity: 'critical' | 'high' | 'medium' | 'low' | 'info';
  category: string;
  recommendation: string;
  evidence?: any;
}

export interface SecurityAnalysisResult {
  serverUrl: string;
  timestamp: string;
  findings: SecurityFinding[];
  summary: {
    total: number;
    critical: number;
    high: number;
    medium: number;
    low: number;
    info: number;
    securityScore: number;
  };
}

export class SecurityAnalyzer {
  private serverUrl: string;
  private findings: SecurityFinding[] = [];

  constructor(serverUrl?: string) {
    this.serverUrl = serverUrl || '';
  }

  async analyzeEndpoints(serverUrl: string, strict: boolean = false): Promise<SecurityFinding[]> {
    this.serverUrl = serverUrl;
    this.findings = [];

    // Analyze WebAuthn endpoints
    await this.analyzeWebAuthnEndpoints(strict);
    
    // Analyze security headers
    await this.analyzeSecurityHeaders();
    
    // Analyze SSL/TLS configuration
    await this.analyzeSSLConfiguration();
    
    // Analyze authentication flow
    await this.analyzeAuthenticationFlow(strict);

    return this.findings;
  }

  async performFullAnalysis(serverUrl: string): Promise<SecurityAnalysisResult> {
    const findings = await this.analyzeEndpoints(serverUrl, true);
    
    const summary = {
      total: findings.length,
      critical: findings.filter(f => f.severity === 'critical').length,
      high: findings.filter(f => f.severity === 'high').length,
      medium: findings.filter(f => f.severity === 'medium').length,
      low: findings.filter(f => f.severity === 'low').length,
      info: findings.filter(f => f.severity === 'info').length,
      securityScore: this.calculateSecurityScore(findings)
    };

    return {
      serverUrl,
      timestamp: new Date().toISOString(),
      findings,
      summary
    };
  }

  private async analyzeWebAuthnEndpoints(strict: boolean): Promise<void> {
    const endpoints = [
      { path: '/api/webauthn/register/start', method: 'POST', name: 'Registration Start' },
      { path: '/api/webauthn/register/complete', method: 'POST', name: 'Registration Complete' },
      { path: '/api/webauthn/authenticate/start', method: 'POST', name: 'Authentication Start' },
      { path: '/api/webauthn/authenticate/complete', method: 'POST', name: 'Authentication Complete' }
    ];

    for (const endpoint of endpoints) {
      try {
        // Test endpoint accessibility
        const response = await axios({
          method: endpoint.method,
          url: `${this.serverUrl}${endpoint.path}`,
          data: { username: 'security-test' },
          timeout: 5000,
          validateStatus: () => true
        });

        // Check for information disclosure
        if (response.data && response.data.stack) {
          this.addFinding({
            id: `info-disclosure-${endpoint.path}`,
            title: 'Information Disclosure',
            description: `${endpoint.name} endpoint exposes stack traces in error responses`,
            severity: 'medium',
            category: 'Information Disclosure',
            recommendation: 'Remove stack traces from production error responses',
            evidence: { endpoint: endpoint.path, hasStackTrace: true }
          });
        }

        // Check for detailed error messages
        if (response.data && response.data.error && response.data.error.length > 100) {
          this.addFinding({
            id: `verbose-errors-${endpoint.path}`,
            title: 'Verbose Error Messages',
            description: `${endpoint.name} returns overly detailed error messages`,
            severity: 'low',
            category: 'Information Disclosure',
            recommendation: 'Use generic error messages in production',
            evidence: { endpoint: endpoint.path, errorLength: response.data.error.length }
          });
        }

        // Check for proper HTTP status codes
        if (endpoint.method === 'POST' && response.status === 200 && !response.data) {
          this.addFinding({
            id: `improper-status-${endpoint.path}`,
            title: 'Improper HTTP Status Code',
            description: `${endpoint.name} returns 200 for invalid requests`,
            severity: 'low',
            category: 'HTTP Security',
            recommendation: 'Return appropriate 4xx status codes for invalid requests',
            evidence: { endpoint: endpoint.path, status: response.status }
          });
        }

      } catch (error) {
        if (strict) {
          this.addFinding({
            id: `endpoint-unavailable-${endpoint.path}`,
            title: 'Endpoint Unavailable',
            description: `${endpoint.name} endpoint is not accessible`,
            severity: 'high',
            category: 'Availability',
            recommendation: 'Ensure all required WebAuthn endpoints are accessible',
            evidence: { endpoint: endpoint.path, error: error instanceof Error ? error.message : error }
          });
        }
      }
    }
  }

  private async analyzeSecurityHeaders(): Promise<void> {
    try {
      const response = await axios.get(this.serverUrl, {
        timeout: 5000
      });

      const headers = response.headers;
      
      // Critical security headers
      const criticalHeaders = {
        'strict-transport-security': {
          severity: 'high' as const,
          title: 'Missing HSTS Header',
          description: 'HTTP Strict Transport Security header is not set'
        },
        'x-frame-options': {
          severity: 'medium' as const,
          title: 'Missing X-Frame-Options Header',
          description: 'X-Frame-Options header is not set, page may be vulnerable to clickjacking'
        },
        'x-content-type-options': {
          severity: 'low' as const,
          title: 'Missing X-Content-Type-Options Header',
          description: 'X-Content-Type-Options header is not set'
        },
        'referrer-policy': {
          severity: 'low' as const,
          title: 'Missing Referrer-Policy Header',
          description: 'Referrer-Policy header is not set'
        }
      };

      Object.entries(criticalHeaders).forEach(([header, config]) => {
        if (!headers[header] && !headers[header.toLowerCase()]) {
          this.addFinding({
            id: `missing-header-${header}`,
            title: config.title,
            description: config.description,
            severity: config.severity,
            category: 'Security Headers',
            recommendation: `Add ${header} header to improve security posture`,
            evidence: { missingHeader: header }
          });
        }
      });

      // Check for insecure headers
      if (headers['server']) {
        this.addFinding({
          id: 'server-header-disclosure',
          title: 'Server Information Disclosure',
          description: 'Server header exposes server information',
          severity: 'low',
          category: 'Information Disclosure',
          recommendation: 'Remove or obfuscate server header',
          evidence: { serverHeader: headers['server'] }
        });
      }

    } catch (error) {
      this.addFinding({
        id: 'header-analysis-failed',
        title: 'Security Header Analysis Failed',
        description: 'Could not analyze security headers',
        severity: 'info',
        category: 'Analysis',
        recommendation: 'Ensure server is accessible for complete security analysis',
        evidence: { error: error instanceof Error ? error.message : error }
      });
    }
  }

  private async analyzeSSLConfiguration(): Promise<void> {
    if (!this.serverUrl.startsWith('https://')) {
      this.addFinding({
        id: 'no-https',
        title: 'HTTPS Not Used',
        description: 'Server is not using HTTPS',
        severity: 'critical',
        category: 'Transport Security',
        recommendation: 'Use HTTPS for all WebAuthn implementations',
        evidence: { protocol: 'http' }
      });
      return;
    }

    // Basic HTTPS check - more detailed SSL analysis would require additional tools
    try {
      await axios.get(this.serverUrl, { timeout: 5000 });
      this.addFinding({
        id: 'https-enabled',
        title: 'HTTPS Enabled',
        description: 'Server properly uses HTTPS',
        severity: 'info',
        category: 'Transport Security',
        recommendation: 'Continue using HTTPS for all communications',
        evidence: { protocol: 'https' }
      });
    } catch (error) {
      if (error instanceof Error && error.message.includes('certificate')) {
        this.addFinding({
          id: 'ssl-certificate-issue',
          title: 'SSL Certificate Issue',
          description: 'SSL certificate validation failed',
          severity: 'high',
          category: 'Transport Security',
          recommendation: 'Ensure SSL certificate is valid and properly configured',
          evidence: { error: error.message }
        });
      }
    }
  }

  private async analyzeAuthenticationFlow(strict: boolean): Promise<void> {
    // Test for common authentication vulnerabilities
    try {
      // Test registration with duplicate username
      const duplicateTest = await axios.post(`${this.serverUrl}/api/webauthn/register/start`, {
        username: 'duplicate-test'
      }, {
        timeout: 5000,
        validateStatus: () => true
      });

      // Make the same request again
      const duplicateTest2 = await axios.post(`${this.serverUrl}/api/webauthn/register/start`, {
        username: 'duplicate-test'
      }, {
        timeout: 5000,
        validateStatus: () => true
      });

      if (duplicateTest.status === 200 && duplicateTest2.status === 200) {
        // Check if different challenges are returned
        if (duplicateTest.data?.challenge === duplicateTest2.data?.challenge) {
          this.addFinding({
            id: 'challenge-reuse',
            title: 'Challenge Reuse Vulnerability',
            description: 'Same challenge returned for multiple registration attempts',
            severity: 'high',
            category: 'Authentication',
            recommendation: 'Generate unique challenges for each authentication attempt',
            evidence: { reuseDetected: true }
          });
        }
      }

      // Test for username enumeration
      const commonUsernames = ['admin', 'administrator', 'root', 'test'];
      for (const username of commonUsernames) {
        try {
          const response = await axios.post(`${this.serverUrl}/api/webauthn/authenticate/start`, {
            username
          }, {
            timeout: 3000,
            validateStatus: () => true
          });

          // Check response time and content for enumeration hints
          if (response.status === 200 && response.data) {
            this.addFinding({
              id: `username-enumeration-${username}`,
              title: 'Potential Username Enumeration',
              description: `Authentication start succeeds for common username: ${username}`,
              severity: 'low',
              category: 'Authentication',
              recommendation: 'Return consistent responses for valid and invalid usernames',
              evidence: { username, status: response.status }
            });
          }
        } catch (error) {
          // Expected for non-existent users
        }
      }

    } catch (error) {
      if (strict) {
        this.addFinding({
          id: 'auth-flow-analysis-failed',
          title: 'Authentication Flow Analysis Failed',
          description: 'Could not complete authentication flow security analysis',
          severity: 'info',
          category: 'Analysis',
          recommendation: 'Ensure WebAuthn endpoints are accessible for complete analysis',
          evidence: { error: error instanceof Error ? error.message : error }
        });
      }
    }
  }

  private addFinding(finding: SecurityFinding): void {
    this.findings.push(finding);
  }

  private calculateSecurityScore(findings: SecurityFinding[]): number {
    const weights = {
      critical: 100,
      high: 50,
      medium: 25,
      low: 10,
      info: 1
    };

    const maxScore = 1000;
    const deductions = findings.reduce((total, finding) => {
      return total + (weights[finding.severity] || 0);
    }, 0);

    return Math.max(0, maxScore - deductions);
  }

  // Utility method for generating security reports
  generateSecurityReport(analysis: SecurityAnalysisResult): string {
    let report = `Security Analysis Report\n`;
    report += `========================\n\n`;
    report += `Server: ${analysis.serverUrl}\n`;
    report += `Timestamp: ${analysis.timestamp}\n`;
    report += `Security Score: ${analysis.summary.securityScore}/1000\n\n`;

    report += `Summary:\n`;
    report += `- Total Findings: ${analysis.summary.total}\n`;
    report += `- Critical: ${analysis.summary.critical}\n`;
    report += `- High: ${analysis.summary.high}\n`;
    report += `- Medium: ${analysis.summary.medium}\n`;
    report += `- Low: ${analysis.summary.low}\n`;
    report += `- Info: ${analysis.summary.info}\n\n`;

    if (analysis.findings.length > 0) {
      report += `Detailed Findings:\n`;
      report += `==================\n\n`;

      analysis.findings.forEach((finding, index) => {
        report += `${index + 1}. ${finding.title} [${finding.severity.toUpperCase()}]\n`;
        report += `   Category: ${finding.category}\n`;
        report += `   Description: ${finding.description}\n`;
        report += `   Recommendation: ${finding.recommendation}\n\n`;
      });
    }

    return report;
  }

  async analyzeHeaders(serverUrl?: string): Promise<SecurityFinding[]> {
    const targetUrl = serverUrl || this.serverUrl;
    await this.analyzeSecurityHeaders();
    return this.findings.filter(f => f.category === 'Security Headers');
  }

  async testRateLimiting(serverUrl?: string): Promise<SecurityFinding[]> {
    const targetUrl = serverUrl || this.serverUrl;
    const findings: SecurityFinding[] = [];

    try {
      // Test rate limiting by making rapid requests
      const startTime = Date.now();
      const requests = [];
      
      for (let i = 0; i < 10; i++) {
        requests.push(
          axios.post(`${targetUrl}/api/webauthn/register/start`, {
            username: `rate-test-${i}`
          }, {
            timeout: 2000,
            validateStatus: () => true
          })
        );
      }

      const responses = await Promise.allSettled(requests);
      const successResponses = responses
        .filter(r => r.status === 'fulfilled' && r.value.status === 200)
        .length;

      if (successResponses >= 8) {
        findings.push({
          id: 'rate-limiting-missing',
          title: 'Missing Rate Limiting',
          description: 'Server does not implement rate limiting for WebAuthn endpoints',
          severity: 'medium',
          category: 'Rate Limiting',
          recommendation: 'Implement rate limiting to prevent brute force attacks',
          evidence: { rapidRequests: successResponses, timeWindow: Date.now() - startTime }
        });
      } else {
        findings.push({
          id: 'rate-limiting-present',
          title: 'Rate Limiting Detected',
          description: 'Server appears to implement rate limiting',
          severity: 'info',
          category: 'Rate Limiting',
          recommendation: 'Continue monitoring rate limiting effectiveness',
          evidence: { blockedRequests: 10 - successResponses }
        });
      }
    } catch (error) {
      findings.push({
        id: 'rate-limiting-test-failed',
        title: 'Rate Limiting Test Failed',
        description: 'Could not test rate limiting implementation',
        severity: 'info',
        category: 'Rate Limiting',
        recommendation: 'Manually verify rate limiting is in place',
        evidence: { error: error instanceof Error ? error.message : error }
      });
    }

    return findings;
  }
}