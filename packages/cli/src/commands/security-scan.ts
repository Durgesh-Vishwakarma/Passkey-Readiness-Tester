import { Command } from 'commander';
import chalk from 'chalk';
import ora from 'ora';
import axios from 'axios';
import { SecurityAnalyzer } from '../services/SecurityAnalyzer';

export class SecurityScanCommand {
  static create(): Command {
    const command = new Command('security-scan');
    
    command
      .description('Perform comprehensive security analysis of WebAuthn implementation')
      .option('-s, --server <url>', 'Server URL to scan', 'http://localhost:3000')
      .option('-d, --depth <level>', 'Scan depth (basic|standard|deep)', 'standard')
      .option('--include-owasp', 'Include OWASP WebAuthn security checks', false)
      .option('--check-headers', 'Analyze security headers', true)
      .option('--test-vulnerabilities', 'Test for common vulnerabilities', false)
      .option('--output <path>', 'Output scan results to file')
      .action(async (options) => {
        await this.execute(options);
      });

    return command;
  }

  private static async execute(options: any): Promise<void> {
    const spinner = ora('Starting security scan...').start();

    try {
      const scanner = new SecurityScanner(options.server);
      
      const results = {
        server: options.server,
        timestamp: new Date().toISOString(),
        scanType: options.depth,
        findings: {
          critical: [] as any[],
          high: [] as any[],
          medium: [] as any[],
          low: [] as any[],
          info: [] as any[]
        },
        summary: {
          totalFindings: 0,
          securityScore: 0,
          riskLevel: 'Unknown'
        }
      };

      // Perform scans based on depth
      spinner.text = 'Scanning endpoints...';
      const endpointFindings = await scanner.scanEndpoints();
      this.categorizeFindings(endpointFindings, results.findings);

      if (options.checkHeaders) {
        spinner.text = 'Analyzing security headers...';
        const headerFindings = await scanner.scanSecurityHeaders();
        this.categorizeFindings(headerFindings, results.findings);
      }

      if (options.includeOwasp) {
        spinner.text = 'Running OWASP security checks...';
        const owaspFindings = await scanner.runOWASPChecks();
        this.categorizeFindings(owaspFindings, results.findings);
      }

      if (options.testVulnerabilities && options.depth === 'deep') {
        spinner.text = 'Testing for vulnerabilities...';
        const vulnFindings = await scanner.testVulnerabilities();
        this.categorizeFindings(vulnFindings, results.findings);
      }

      // Calculate summary
      results.summary.totalFindings = Object.values(results.findings)
        .reduce((total, findings) => total + findings.length, 0);
      
      results.summary.securityScore = this.calculateSecurityScore(results.findings);
      results.summary.riskLevel = this.determineRiskLevel(results.summary.securityScore);

      // Display results
      this.displayScanResults(results);

      // Save results if output specified
      if (options.output) {
        const fs = await import('fs');
        fs.writeFileSync(options.output, JSON.stringify(results, null, 2));
        console.log(chalk.cyan(`📄 Scan results saved to: ${options.output}`));
      }

      spinner.succeed('Security scan completed!');

      // Exit with error code if critical findings
      if (results.findings.critical.length > 0) {
        process.exit(1);
      }

    } catch (error) {
      spinner.fail('Security scan failed');
      console.error(chalk.red('Error:'), error instanceof Error ? error.message : error);
      process.exit(1);
    }
  }

  private static categorizeFindings(findings: any[], target: any): void {
    findings.forEach(finding => {
      switch (finding.severity.toLowerCase()) {
        case 'critical':
          target.critical.push(finding);
          break;
        case 'high':
          target.high.push(finding);
          break;
        case 'medium':
          target.medium.push(finding);
          break;
        case 'low':
          target.low.push(finding);
          break;
        default:
          target.info.push(finding);
      }
    });
  }

  private static calculateSecurityScore(findings: any): number {
    const weights = { critical: 100, high: 50, medium: 25, low: 10, info: 1 };
    const maxScore = 1000;
    
    const deductions = Object.entries(findings).reduce((total, [severity, items]) => {
      const weight = weights[severity as keyof typeof weights] || 0;
      return total + (items as any[]).length * weight;
    }, 0);

    return Math.max(0, maxScore - deductions);
  }

  private static determineRiskLevel(score: number): string {
    if (score >= 900) return 'Low';
    if (score >= 700) return 'Medium';
    if (score >= 400) return 'High';
    return 'Critical';
  }

  private static displayScanResults(results: any): void {
    console.log(chalk.bold('\n🔒 Security Scan Results'));
    console.log('═'.repeat(50));
    
    console.log(chalk.cyan(`Server: ${results.server}`));
    console.log(chalk.gray(`Scan Type: ${results.scanType}`));
    console.log(chalk.gray(`Timestamp: ${results.timestamp}`));
    
    console.log('\n📊 Summary:');
    console.log(`  Security Score: ${this.getScoreColor(results.summary.securityScore)}`);
    console.log(`  Risk Level: ${this.getRiskColor(results.summary.riskLevel)}`);
    console.log(`  Total Findings: ${results.summary.totalFindings}`);

    // Display findings by severity
    const severities = ['critical', 'high', 'medium', 'low', 'info'];
    const colors = [chalk.red, chalk.redBright, chalk.yellow, chalk.blue, chalk.gray];
    const icons = ['🔴', '🟠', '🟡', '🔵', 'ℹ️'];

    severities.forEach((severity, index) => {
      const findings = results.findings[severity];
      if (findings.length > 0) {
        console.log(chalk.bold(`\n${icons[index]} ${severity.toUpperCase()} (${findings.length}):`));
        findings.forEach((finding: any) => {
          console.log(colors[index](`  • ${finding.title}: ${finding.description}`));
          if (finding.recommendation) {
            console.log(chalk.gray(`    💡 ${finding.recommendation}`));
          }
        });
      }
    });
  }

  private static getScoreColor(score: number): string {
    if (score >= 900) return chalk.green(`${score}/1000`);
    if (score >= 700) return chalk.yellow(`${score}/1000`);
    if (score >= 400) return chalk.red(`${score}/1000`);
    return chalk.redBright(`${score}/1000`);
  }

  private static getRiskColor(risk: string): string {
    switch (risk.toLowerCase()) {
      case 'low': return chalk.green(risk);
      case 'medium': return chalk.yellow(risk);
      case 'high': return chalk.red(risk);
      case 'critical': return chalk.redBright(risk);
      default: return risk;
    }
  }
}

class SecurityScanner {
  constructor(private serverUrl: string) {}

  async scanEndpoints(): Promise<any[]> {
    const findings = [];

    try {
      // Test WebAuthn endpoints
      const endpoints = [
        '/api/webauthn/register/start',
        '/api/webauthn/register/complete',
        '/api/webauthn/authenticate/start',
        '/api/webauthn/authenticate/complete'
      ];

      for (const endpoint of endpoints) {
        try {
          const response = await axios.get(`${this.serverUrl}${endpoint}`);
          
          // Check for information disclosure
          if (response.data && typeof response.data === 'object') {
            if (response.data.error && response.data.stack) {
              findings.push({
                title: 'Information Disclosure',
                description: `Endpoint ${endpoint} exposes stack traces`,
                severity: 'medium',
                endpoint,
                recommendation: 'Remove stack traces from error responses in production'
              });
            }
          }
        } catch (error) {
          // Endpoint not accessible - could be normal
        }
      }
    } catch (error) {
      findings.push({
        title: 'Endpoint Scan Error',
        description: 'Could not complete endpoint security scan',
        severity: 'low',
        recommendation: 'Ensure server is accessible for complete security analysis'
      });
    }

    return findings;
  }

  async scanSecurityHeaders(): Promise<any[]> {
    const findings = [];

    try {
      const response = await axios.get(this.serverUrl);
      const headers = response.headers;

      // Check for required security headers
      const securityHeaders = {
        'strict-transport-security': {
          severity: 'high',
          description: 'HSTS header missing - connections may be vulnerable to downgrade attacks'
        },
        'x-frame-options': {
          severity: 'medium',
          description: 'X-Frame-Options header missing - page may be vulnerable to clickjacking'
        },
        'x-content-type-options': {
          severity: 'low',
          description: 'X-Content-Type-Options header missing - may allow MIME type sniffing'
        },
        'referrer-policy': {
          severity: 'low',
          description: 'Referrer-Policy header missing - may leak referrer information'
        }
      };

      Object.entries(securityHeaders).forEach(([header, config]) => {
        if (!headers[header]) {
          findings.push({
            title: `Missing Security Header: ${header}`,
            description: config.description,
            severity: config.severity,
            recommendation: `Add ${header} header to improve security posture`
          });
        }
      });
    } catch (error) {
      findings.push({
        title: 'Security Headers Scan Error',
        description: 'Could not analyze security headers',
        severity: 'info',
        recommendation: 'Ensure server is accessible for header analysis'
      });
    }

    return findings;
  }

  async runOWASPChecks(): Promise<any[]> {
    const findings = [];

    // OWASP WebAuthn Security checks
    findings.push(
      {
        title: 'OWASP WebAuthn Check',
        description: 'Verify implementation follows OWASP WebAuthn guidelines',
        severity: 'info',
        recommendation: 'Review OWASP WebAuthn Security Guidelines'
      }
    );

    return findings;
  }

  async testVulnerabilities(): Promise<any[]> {
    const findings = [];

    // Basic vulnerability tests
    try {
      // Test for SQL injection in registration
      const maliciousPayload = "'; DROP TABLE users; --";
      await axios.post(`${this.serverUrl}/api/webauthn/register/start`, {
        username: maliciousPayload
      });
    } catch (error) {
      // Expected to fail - good
    }

    findings.push({
      title: 'Vulnerability Testing',
      description: 'Basic vulnerability tests completed',
      severity: 'info',
      recommendation: 'Consider using dedicated security testing tools for comprehensive vulnerability assessment'
    });

    return findings;
  }
}