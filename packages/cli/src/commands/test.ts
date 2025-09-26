import chalk from 'chalk';
import ora from 'ora';
import axios from 'axios';
import { WebAuthnTester } from '../services/WebAuthnTester';
import { RPConfigTester } from '../services/RPConfigTester';
import { SecurityAnalyzer } from '../services/SecurityAnalyzer';
import { ReportGenerator } from '../utils/ReportGenerator';

export interface TestOptions {
  server: string;
  output: 'json' | 'html' | 'console';
  verbose?: boolean;
}

export class TestCommand {
  async execute(options: TestOptions): Promise<void> {
    const spinner = ora('Starting WebAuthn security tests...').start();

    try {
      console.log(chalk.blue('\n🔍 WebAuthn Security Testing Suite'));
      console.log(chalk.gray(`Testing server: ${options.server}\n`));

      // Initialize testers
      const webauthnTester = new WebAuthnTester(options.server);
      const rpTester = new RPConfigTester(options.server);
      const securityAnalyzer = new SecurityAnalyzer(options.server);

      const results: any = {
        timestamp: new Date().toISOString(),
        server: options.server,
        tests: {},
        summary: {}
      };

      // Test 1: Basic connectivity
      spinner.text = 'Testing server connectivity...';
      results.tests.connectivity = await this.testConnectivity(options.server);

      // Test 2: WebAuthn endpoint validation
      spinner.text = 'Validating WebAuthn endpoints...';
      results.tests.endpoints = await webauthnTester.validateEndpoints();

      // Test 3: RP configuration testing
      spinner.text = 'Testing RP configuration...';
      results.tests.rpConfig = await rpTester.testConfiguration();

      // Test 4: Challenge security
      spinner.text = 'Testing challenge generation and validation...';
      results.tests.challengeSecurity = await rpTester.testChallengeHandling();

      // Test 5: Origin validation
      spinner.text = 'Testing origin validation...';
      results.tests.originValidation = await rpTester.testOriginValidation();

      // Test 6: Security headers
      spinner.text = 'Analyzing security headers...';
      results.tests.securityHeaders = await securityAnalyzer.analyzeHeaders();

      // Test 7: Rate limiting
      spinner.text = 'Testing rate limiting...';
      results.tests.rateLimiting = await securityAnalyzer.testRateLimiting();

      // Test 8: Error handling
      spinner.text = 'Testing error handling...';
      results.tests.errorHandling = await webauthnTester.testErrorHandling();

      // Generate summary
      results.summary = this.generateSummary(results.tests);

      spinner.succeed('All tests completed!');

      // Output results
      await this.outputResults(results, options);

    } catch (error) {
      spinner.fail(`Testing failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      process.exit(1);
    }
  }

  private async testConnectivity(serverUrl: string): Promise<any> {
    try {
      const response = await axios.get(`${serverUrl}/api/health`, { timeout: 5000 });
      return {
        status: 'pass',
        responseTime: response.headers['x-response-time'] || 'unknown',
        statusCode: response.status,
        message: 'Server is accessible'
      };
    } catch (error) {
      return {
        status: 'fail',
        message: `Server connectivity failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  private generateSummary(tests: any): any {
    const totalTests = Object.keys(tests).length;
    const passedTests = Object.values(tests).filter((test: any) => test.status === 'pass').length;
    const failedTests = totalTests - passedTests;

    return {
      total: totalTests,
      passed: passedTests,
      failed: failedTests,
      score: Math.round((passedTests / totalTests) * 100),
      status: failedTests === 0 ? 'PASS' : 'FAIL'
    };
  }

  private async outputResults(results: any, options: TestOptions): Promise<void> {
    const reportGenerator = new ReportGenerator();

    switch (options.output) {
      case 'json':
        console.log(JSON.stringify(results, null, 2));
        break;
      case 'html':
        await reportGenerator.generateHTML(results, './reports', 'standard');
        console.log(chalk.cyan('📄 HTML report generated: ./reports/webauthn-report.html'));
        console.log(chalk.green('\n✅ HTML report saved to: test-report.html'));
        break;
      case 'console':
      default:
        this.displayConsoleResults(results);
        break;
    }
  }

  private displayConsoleResults(results: any): void {
    console.log('\n' + '='.repeat(60));
    console.log(chalk.bold.blue('  🔐 WebAuthn Security Test Results'));
    console.log('='.repeat(60));

    // Summary
    const summary = results.summary;
    console.log(chalk.bold('\n📊 Summary:'));
    console.log(`  Total Tests: ${summary.total}`);
    console.log(`  Passed: ${chalk.green(summary.passed)}`);
    console.log(`  Failed: ${chalk.red(summary.failed)}`);
    console.log(`  Score: ${summary.score >= 80 ? chalk.green(summary.score + '%') : chalk.red(summary.score + '%')}`);
    console.log(`  Status: ${summary.status === 'PASS' ? chalk.green('PASS') : chalk.red('FAIL')}\n`);

    // Detailed results
    console.log(chalk.bold('📋 Detailed Results:\n'));

    Object.entries(results.tests).forEach(([testName, testResult]: [string, any]) => {
      const icon = testResult.status === 'pass' ? '✅' : '❌';
      const color = testResult.status === 'pass' ? chalk.green : chalk.red;
      
      console.log(`${icon} ${color(testName.replace(/([A-Z])/g, ' $1').trim())}`);
      if (testResult.message) {
        console.log(`   ${chalk.gray(testResult.message)}`);
      }
      if (testResult.details && testResult.details.length > 0) {
        testResult.details.forEach((detail: string) => {
          console.log(`   • ${chalk.gray(detail)}`);
        });
      }
      console.log();
    });

    // Recommendations
    if (summary.failed > 0) {
      console.log(chalk.bold.yellow('⚠️  Recommendations:\n'));
      Object.entries(results.tests).forEach(([testName, testResult]: [string, any]) => {
        if (testResult.status === 'fail' && testResult.recommendations) {
          console.log(`${chalk.yellow('•')} ${testName}:`);
          testResult.recommendations.forEach((rec: string) => {
            console.log(`  - ${rec}`);
          });
          console.log();
        }
      });
    }
  }
}