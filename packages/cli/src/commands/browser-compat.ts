import puppeteer, { Browser, Page } from 'puppeteer';
import chalk from 'chalk';
import ora from 'ora';

export interface BrowserCompatOptions {
  server: string;
  browsers: string;
  headless: boolean;
}

export class BrowserCompatCommand {
  private browser: Browser | null = null;
  private testResults: any[] = [];

  async execute(options: BrowserCompatOptions): Promise<void> {
    const spinner = ora('Starting browser compatibility tests...').start();

    try {
      console.log(chalk.blue('\n🌐 Browser Compatibility Testing'));
      console.log(chalk.gray(`Testing server: ${options.server}`));
      console.log(chalk.gray(`Browsers: ${options.browsers}\n`));

      const browsers = options.browsers.split(',').map(b => b.trim());
      
      for (const browserName of browsers) {
        spinner.text = `Testing ${browserName}...`;
        const browserResult = await this.testBrowser(browserName, options);
        this.testResults.push(browserResult);
      }

      spinner.succeed('Browser compatibility tests completed!');
      this.displayResults();

    } catch (error) {
      spinner.fail(`Browser testing failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      process.exit(1);
    }
  }

  private async testBrowser(browserName: string, options: BrowserCompatOptions): Promise<any> {
    const result = {
      browser: browserName,
      timestamp: new Date().toISOString(),
      tests: {} as Record<string, any>,
      summary: { passed: 0, failed: 0, total: 0 }
    };

    try {
      // Launch browser
      this.browser = await puppeteer.launch({
        headless: options.headless ? 'new' : false,
        args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
      });

      const page = await this.browser.newPage();
      
      // Set viewport
      await page.setViewport({ width: 1280, height: 720 });

      // Test 1: Basic page load
      result.tests.pageLoad = await this.testPageLoad(page, options.server);

      // Test 2: WebAuthn API availability
      result.tests.webauthnAPI = await this.testWebAuthnAPI(page);

      // Test 3: Registration flow
      result.tests.registration = await this.testRegistrationFlow(page, options.server);

      // Test 4: Authentication flow
      result.tests.authentication = await this.testAuthenticationFlow(page, options.server);

      // Test 5: Error handling
      result.tests.errorHandling = await this.testErrorHandling(page, options.server);

      // Calculate summary
      const tests = Object.values(result.tests);
      result.summary.total = tests.length;
      result.summary.passed = tests.filter((test: any) => test.status === 'pass').length;
      result.summary.failed = result.summary.total - result.summary.passed;

    } catch (error) {
      result.tests.browserLaunch = {
        status: 'fail',
        message: `Failed to launch ${browserName}: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
      result.summary.total = 1;
      result.summary.failed = 1;
    } finally {
      if (this.browser) {
        await this.browser.close();
        this.browser = null;
      }
    }

    return result;
  }

  private async testPageLoad(page: Page, serverUrl: string): Promise<any> {
    try {
      const startTime = Date.now();
      const response = await page.goto(`${serverUrl.replace(':4000', ':3000')}`);
      const loadTime = Date.now() - startTime;

      if (!response || !response.ok()) {
        return {
          status: 'fail',
          message: `Page failed to load: ${response?.status()} ${response?.statusText()}`,
          loadTime
        };
      }

      // Wait for the page to be ready
      await page.waitForSelector('body', { timeout: 10000 });

      return {
        status: 'pass',
        message: 'Page loaded successfully',
        loadTime,
        responseStatus: response.status()
      };

    } catch (error) {
      return {
        status: 'fail',
        message: `Page load failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  private async testWebAuthnAPI(page: Page): Promise<any> {
    try {
      const webauthnSupport = await page.evaluate(() => {
        return {
          navigatorCredentials: !!window.navigator.credentials,
          credentialsCreate: !!window.navigator.credentials?.create,
          credentialsGet: !!window.navigator.credentials?.get,
          publicKeyCredential: !!window.PublicKeyCredential,
          authenticatorAttachment: !!(window.PublicKeyCredential as any)?.isUserVerifyingPlatformAuthenticatorAvailable,
          conditionalMediation: !!(window.PublicKeyCredential as any)?.isConditionalMediationAvailable
        };
      });

      const missingFeatures = Object.entries(webauthnSupport)
        .filter(([_, supported]) => !supported)
        .map(([feature, _]) => feature);

      if (missingFeatures.length === 0) {
        return {
          status: 'pass',
          message: 'Full WebAuthn support detected',
          features: webauthnSupport
        };
      } else {
        return {
          status: 'warning',
          message: `Partial WebAuthn support: missing ${missingFeatures.join(', ')}`,
          features: webauthnSupport,
          missingFeatures
        };
      }

    } catch (error) {
      return {
        status: 'fail',
        message: `WebAuthn API test failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  private async testRegistrationFlow(page: Page, serverUrl: string): Promise<any> {
    try {
      // Navigate to the demo page
      await page.goto(`${serverUrl.replace(':4000', ':3000')}`);
      
      // Wait for the demo component to load
      await page.waitForSelector('[data-testid="webauthn-demo"]', { timeout: 10000 });

      // Fill in registration form
      await page.type('input[placeholder="demo_user_2025"]', 'browser-test-user');
      await page.type('input[placeholder="demo@passkey-auth.com"]', 'test@example.com');
      await page.type('input[placeholder="Demo User"]', 'Browser Test User');

      // Click register button
      await page.click('button:has-text("Create Passkey Account")');

      // Wait for either success or error
      await page.waitForSelector('.bg-green-50, .bg-red-50', { timeout: 30000 });

      const result = await page.evaluate(() => {
        const successElement = document.querySelector('.bg-green-50');
        const errorElement = document.querySelector('.bg-red-50');
        
        if (successElement) {
          return { status: 'pass', message: 'Registration successful' };
        } else if (errorElement) {
          const errorText = errorElement.textContent || 'Unknown error';
          return { status: 'fail', message: `Registration failed: ${errorText}` };
        } else {
          return { status: 'fail', message: 'Unknown registration state' };
        }
      });

      return result;

    } catch (error) {
      return {
        status: 'fail',
        message: `Registration flow test failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  private async testAuthenticationFlow(page: Page, serverUrl: string): Promise<any> {
    try {
      // This test assumes registration was successful
      // Look for the authentication button
      const authButton = await page.$('button:has-text("Test Authentication")');
      
      if (!authButton) {
        return {
          status: 'skip',
          message: 'Authentication test skipped - registration may have failed'
        };
      }

      await authButton.click();

      // Wait for authentication result
      await page.waitForSelector('.bg-green-50, .bg-red-50', { timeout: 30000 });

      const result = await page.evaluate(() => {
        const elements = document.querySelectorAll('.bg-green-50, .bg-red-50');
        const latestElement = elements[elements.length - 1]; // Get the most recent result
        
        if (latestElement?.classList.contains('bg-green-50')) {
          return { status: 'pass', message: 'Authentication successful' };
        } else if (latestElement?.classList.contains('bg-red-50')) {
          const errorText = latestElement.textContent || 'Unknown error';
          return { status: 'fail', message: `Authentication failed: ${errorText}` };
        } else {
          return { status: 'fail', message: 'Unknown authentication state' };
        }
      });

      return result;

    } catch (error) {
      return {
        status: 'fail',
        message: `Authentication flow test failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  private async testErrorHandling(page: Page, serverUrl: string): Promise<any> {
    try {
      // Test with invalid data
      await page.goto(`${serverUrl.replace(':4000', ':3000')}`);
      await page.waitForSelector('[data-testid="webauthn-demo"]', { timeout: 10000 });

      // Try to register with empty username
      await page.click('button:has-text("Create Passkey Account")');

      // Should show validation error
      const hasError = await page.waitForSelector('.bg-red-50', { timeout: 5000 }).catch(() => null);

      if (hasError) {
        return {
          status: 'pass',
          message: 'Error handling working correctly'
        };
      } else {
        return {
          status: 'warning',
          message: 'No error shown for invalid input'
        };
      }

    } catch (error) {
      return {
        status: 'fail',
        message: `Error handling test failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  private displayResults(): void {
    console.log('\n' + '='.repeat(70));
    console.log(chalk.bold.blue('  🌐 Browser Compatibility Test Results'));
    console.log('='.repeat(70));

    this.testResults.forEach(browserResult => {
      console.log(`\n${chalk.bold(browserResult.browser.toUpperCase())}:`);
      console.log(`  Total Tests: ${browserResult.summary.total}`);
      console.log(`  Passed: ${chalk.green(browserResult.summary.passed)}`);
      console.log(`  Failed: ${chalk.red(browserResult.summary.failed)}`);
      
      const score = browserResult.summary.total > 0 
        ? Math.round((browserResult.summary.passed / browserResult.summary.total) * 100)
        : 0;
      
      console.log(`  Score: ${score >= 80 ? chalk.green(score + '%') : chalk.red(score + '%')}`);

      // Show individual test results
      Object.entries(browserResult.tests).forEach(([testName, testResult]: [string, any]) => {
        const icon = testResult.status === 'pass' ? '✅' : testResult.status === 'warning' ? '⚠️' : '❌';
        const color = testResult.status === 'pass' ? chalk.green : testResult.status === 'warning' ? chalk.yellow : chalk.red;
        
        console.log(`    ${icon} ${color(testName)}: ${testResult.message}`);
      });
    });

    // Overall summary
    const totalTests = this.testResults.reduce((sum, r) => sum + r.summary.total, 0);
    const totalPassed = this.testResults.reduce((sum, r) => sum + r.summary.passed, 0);
    const overallScore = totalTests > 0 ? Math.round((totalPassed / totalTests) * 100) : 0;

    console.log('\n' + '='.repeat(70));
    console.log(chalk.bold('📊 Overall Compatibility:'));
    console.log(`  Score: ${overallScore >= 80 ? chalk.green(overallScore + '%') : chalk.red(overallScore + '%')}`);
    console.log(`  Compatible Browsers: ${this.testResults.filter(r => r.summary.passed > r.summary.failed).length}/${this.testResults.length}`);
    console.log('='.repeat(70));
  }
}