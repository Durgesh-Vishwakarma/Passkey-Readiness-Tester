import { Command } from 'commander';
import chalk from 'chalk';
import ora from 'ora';
import axios from 'axios';
import { WebAuthnTester } from '../services/WebAuthnTester';
import { SecurityAnalyzer } from '../services/SecurityAnalyzer';

export class ValidateCommand {
  static create(): Command {
    const command = new Command('validate');
    
    command
      .description('Validate WebAuthn implementation against standards and best practices')
      .option('-s, --server <url>', 'Server URL to validate', 'http://localhost:3000')
      .option('-c, --config <path>', 'Configuration file path', './webauthn.config.json')
      .option('--strict', 'Enable strict validation mode', false)
      .option('--output <path>', 'Output validation results to file')
      .action(async (options) => {
        await this.execute(options);
      });

    return command;
  }

  private static async execute(options: any): Promise<void> {
    const spinner = ora('Validating WebAuthn implementation...').start();

    try {
      const results = {
        server: options.server,
        timestamp: new Date().toISOString(),
        validations: {
          endpoints: await this.validateEndpoints(options.server),
          configuration: await this.validateConfiguration(options.config),
          security: await this.validateSecurity(options.server, options.strict),
          compliance: await this.validateCompliance(options.server)
        },
        summary: {
          total: 0,
          passed: 0,
          failed: 0,
          warnings: 0
        }
      };

      // Calculate summary
      const allTests = Object.values(results.validations).flat();
      results.summary.total = allTests.length;
      results.summary.passed = allTests.filter((test: any) => test.status === 'passed').length;
      results.summary.failed = allTests.filter((test: any) => test.status === 'failed').length;
      results.summary.warnings = allTests.filter((test: any) => test.status === 'warning').length;

      // Display results
      this.displayResults(results);

      // Save results if output specified
      if (options.output) {
        const fs = await import('fs');
        fs.writeFileSync(options.output, JSON.stringify(results, null, 2));
        console.log(chalk.cyan(`📄 Results saved to: ${options.output}`));
      }

      spinner.succeed('Validation completed!');

      // Exit with error code if there are failures
      if (results.summary.failed > 0) {
        process.exit(1);
      }

    } catch (error) {
      spinner.fail('Validation failed');
      console.error(chalk.red('Error:'), error instanceof Error ? error.message : error);
      process.exit(1);
    }
  }

  private static async validateEndpoints(serverUrl: string): Promise<any[]> {
    const tester = new WebAuthnTester(serverUrl);
    const tests = [];

    // Test endpoints using public methods
    try {
      const endpointResults = await tester.validateEndpoints();
      
      if (endpointResults.status === 'pass') {
        tests.push({
          name: 'WebAuthn Endpoints',
          status: 'passed',
          message: endpointResults.message
        });
      } else {
        tests.push({
          name: 'WebAuthn Endpoints',
          status: 'failed',
          message: endpointResults.message
        });
      }
    } catch (error) {
      tests.push({
        name: 'Endpoint Testing',
        status: 'failed',
        message: error instanceof Error ? error.message : 'Could not test endpoints'
      });
    }

    return tests;
  }

  private static async validateConfiguration(configPath: string): Promise<any[]> {
    const tests = [];
    
    try {
      const fs = await import('fs');
      if (!fs.existsSync(configPath)) {
        tests.push({
          name: 'Configuration File',
          status: 'warning',
          message: 'Configuration file not found, using defaults'
        });
        return tests;
      }

      const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
      
      // Validate required fields
      const requiredFields = ['rpID', 'rpName', 'origin'];
      requiredFields.forEach(field => {
        if (config[field]) {
          tests.push({
            name: `Configuration: ${field}`,
            status: 'passed',
            message: `${field} is properly configured`
          });
        } else {
          tests.push({
            name: `Configuration: ${field}`,
            status: 'failed',
            message: `Missing required field: ${field}`
          });
        }
      });

    } catch (error) {
      tests.push({
        name: 'Configuration Validation',
        status: 'failed',
        message: error instanceof Error ? error.message : 'Configuration error'
      });
    }

    return tests;
  }

  private static async validateSecurity(serverUrl: string, strict: boolean): Promise<any[]> {
    const analyzer = new SecurityAnalyzer();
    return await analyzer.analyzeEndpoints(serverUrl, strict);
  }

  private static async validateCompliance(serverUrl: string): Promise<any[]> {
    const tests = [];

    // Test HTTPS requirement
    if (serverUrl.startsWith('https://')) {
      tests.push({
        name: 'HTTPS Requirement',
        status: 'passed',
        message: 'Server uses HTTPS as required'
      });
    } else {
      tests.push({
        name: 'HTTPS Requirement',
        status: 'failed',
        message: 'WebAuthn requires HTTPS in production'
      });
    }

    // Test CORS headers
    try {
      const response = await axios.options(serverUrl);
      if (response.headers['access-control-allow-origin']) {
        tests.push({
          name: 'CORS Configuration',
          status: 'passed',
          message: 'CORS headers properly configured'
        });
      } else {
        tests.push({
          name: 'CORS Configuration',
          status: 'warning',
          message: 'CORS headers not detected'
        });
      }
    } catch (error) {
      tests.push({
        name: 'CORS Configuration',
        status: 'warning',
        message: 'Could not verify CORS configuration'
      });
    }

    return tests;
  }

  private static displayResults(results: any): void {
    console.log(chalk.bold('\n📋 Validation Results'));
    console.log('═'.repeat(50));
    
    console.log(chalk.cyan(`Server: ${results.server}`));
    console.log(chalk.gray(`Timestamp: ${results.timestamp}`));
    
    console.log('\n📊 Summary:');
    console.log(`  Total: ${results.summary.total}`);
    console.log(chalk.green(`  ✅ Passed: ${results.summary.passed}`));
    console.log(chalk.red(`  ❌ Failed: ${results.summary.failed}`));
    console.log(chalk.yellow(`  ⚠️  Warnings: ${results.summary.warnings}`));

    // Display detailed results
    Object.entries(results.validations).forEach(([category, tests]) => {
      console.log(chalk.bold(`\n${category.toUpperCase()}:`));
      (tests as any[]).forEach(test => {
        const icon = test.status === 'passed' ? '✅' : test.status === 'failed' ? '❌' : '⚠️';
        const color = test.status === 'passed' ? chalk.green : test.status === 'failed' ? chalk.red : chalk.yellow;
        console.log(`  ${icon} ${color(test.name)}: ${test.message}`);
      });
    });
  }
}