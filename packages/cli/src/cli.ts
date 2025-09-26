#!/usr/bin/env node

import { Command } from 'commander';
import chalk from 'chalk';
import { TestCommand } from './commands/test';
import { ReportCommand } from './commands/report';
import { ValidateCommand } from './commands/validate';
import { BrowserCompatCommand } from './commands/browser-compat';
import { SecurityScanCommand } from './commands/security-scan';

const program = new Command();

program
  .name('passkey-cli')
  .description('WebAuthn Security Testing CLI Tool')
  .version('1.0.0');

// ASCII Art Banner
console.log(chalk.blue(`
╔═══════════════════════════════════════════════════════════════╗
║  🔐 Passkey WebAuthn Security Testing CLI                     ║
║  Enterprise-grade WebAuthn testing and validation             ║
╚═══════════════════════════════════════════════════════════════╝
`));

// Test command - RP misconfiguration testing
program
  .command('test')
  .description('Test WebAuthn configuration and RP security')
  .option('-s, --server <url>', 'Server URL to test', 'http://localhost:4000')
  .option('-o, --output <format>', 'Output format (json|html|console)', 'console')
  .option('-v, --verbose', 'Verbose output')
  .action(async (options) => {
    const testCmd = new TestCommand();
    await testCmd.execute(options);
  });

// Report command - Generate security reports
program.addCommand(ReportCommand.create());

// Validate command - Validate WebAuthn implementation  
program.addCommand(ValidateCommand.create());

// Browser compatibility testing
program
  .command('browser-compat')
  .description('Test browser compatibility across platforms')
  .option('-s, --server <url>', 'Server URL', 'http://localhost:4000')
  .option('-b, --browsers <browsers>', 'Browsers to test (chrome,firefox,safari)', 'chrome,firefox')
  .option('-h, --headless', 'Run in headless mode', true)
  .action(async (options) => {
    const browserCmd = new BrowserCompatCommand();
    await browserCmd.execute(options);
  });

// Security scan command
program.addCommand(SecurityScanCommand.create());

// Parse command line arguments
program.parse();