import { Command } from 'commander';
import chalk from 'chalk';
import ora from 'ora';
import fs from 'fs';
import path from 'path';
import { ReportGenerator } from '../utils/ReportGenerator';

export class ReportCommand {
  static create(): Command {
    const command = new Command('report');
    
    command
      .description('Generate comprehensive security and compatibility reports')
      .option('-i, --input <path>', 'Input test results JSON file', './test-results.json')
      .option('-o, --output <path>', 'Output report directory', './reports')
      .option('-f, --format <format>', 'Report format (html|pdf|json)', 'html')
      .option('--template <template>', 'Report template (standard|detailed|executive)', 'standard')
      .action(async (options) => {
        await this.execute(options);
      });

    return command;
  }

  private static async execute(options: any): Promise<void> {
    const spinner = ora('Generating reports...').start();

    try {
      // Validate input file exists
      if (!fs.existsSync(options.input)) {
        spinner.fail(`Input file not found: ${options.input}`);
        console.log(chalk.yellow('Run tests first with: webauthn-tester test'));
        return;
      }

      // Create output directory
      const outputDir = path.resolve(options.output);
      if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
      }

      // Load test results
      const testResults = JSON.parse(fs.readFileSync(options.input, 'utf8'));
      
      // Generate reports
      const reportGenerator = new ReportGenerator();
      
      switch (options.format.toLowerCase()) {
        case 'html':
          await reportGenerator.generateHTML(testResults, outputDir, options.template);
          break;
        case 'pdf':
          await reportGenerator.generatePDF(testResults, outputDir, options.template);
          break;
        case 'json':
          await reportGenerator.generateJSON(testResults, outputDir);
          break;
        default:
          throw new Error(`Unsupported format: ${options.format}`);
      }

      spinner.succeed('Reports generated successfully!');
      console.log(chalk.green(`📊 Reports saved to: ${outputDir}`));
      
      // List generated files
      const files = fs.readdirSync(outputDir);
      files.forEach(file => {
        console.log(chalk.cyan(`  - ${file}`));
      });

    } catch (error) {
      spinner.fail('Report generation failed');
      console.error(chalk.red('Error:'), error instanceof Error ? error.message : error);
      process.exit(1);
    }
  }
}