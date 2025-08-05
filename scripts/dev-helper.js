#!/usr/bin/env node

/**
 * Development Helper Script
 * Provides utilities for development workflow
 */

const fs = require('fs');
const path = require('path');
const { execSync, spawn } = require('child_process');

// ANSI colors for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
};

function log(message, color = colors.reset) {
  console.log(`${color}${message}${colors.reset}`);
}

function logStep(step, message) {
  log(`\n${colors.bright}[${step}]${colors.reset} ${colors.cyan}${message}${colors.reset}`);
}

function logSuccess(message) {
  log(`${colors.green} ${message}${colors.reset}`);
}

function logError(message) {
  log(`${colors.red} ${message}${colors.reset}`);
}

function logWarning(message) {
  log(`${colors.yellow}  ${message}${colors.reset}`);
}

// Check if we're in the correct directory
function validateWorkspace() {
  const packageJsonPath = path.join(process.cwd(), 'package.json');
  if (!fs.existsSync(packageJsonPath)) {
    logError('package.json not found. Are you in the project root?');
    process.exit(1);
  }
  
  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
  if (packageJson.name !== 'clotho') {
    logError('This script should be run from the Clotho project root.');
    process.exit(1);
  }
}

// Fast development build
function fastBuild() {
  logStep('1', 'Running fast development build...');
  
  try {
    // Clean previous builds
    if (fs.existsSync('out')) {
      logStep('1.1', 'Cleaning previous build...');
      execSync('npm run clean', { stdio: 'inherit' });
    }
    
    // ESBuild compilation (generates bundle.js as expected by package.json)
    logStep('1.2', 'Building with ESBuild...');
    execSync('npm run esbuild', { stdio: 'inherit' });
    
    // Build webview in parallel
    logStep('1.3', 'Building webview...');
    execSync('npm run build:webview', { stdio: 'inherit' });
    
    logSuccess('Fast build completed!');
    return true;
  } catch (error) {
    logError(`Build failed: ${error.message}`);
    return false;
  }
}

// Watch mode setup
function setupWatch() {
  logStep('WATCH', 'Setting up watch mode...');
  
  const extensionWatcher = spawn('npm', ['run', 'watch:extension'], {
    stdio: 'inherit',
    shell: true
  });
  
  const webviewWatcher = spawn('npm', ['run', 'watch:webview'], {
    stdio: 'inherit',
    shell: true
  });
  
  // Handle process termination
  process.on('SIGINT', () => {
    log('\n Stopping watchers...');
    extensionWatcher.kill();
    webviewWatcher.kill();
    process.exit(0);
  });
  
  extensionWatcher.on('error', (error) => {
    logError(`Extension watcher error: ${error.message}`);
  });
  
  webviewWatcher.on('error', (error) => {
    logError(`Webview watcher error: ${error.message}`);
  });
  
  logSuccess('Watch mode active. Press Ctrl+C to stop.');
}

// Development environment check
function checkDevEnvironment() {
  logStep('ENV', 'Checking development environment...');
  
  // Check Node.js version
  const nodeVersion = process.version;
  log(` Node.js: ${nodeVersion}`);
  
  // Check npm version
  try {
    const npmVersion = execSync('npm --version', { encoding: 'utf8' }).trim();
    log(` npm: ${npmVersion}`);
  } catch (error) {
    logWarning('Could not detect npm version');
  }
  
  // Check TypeScript
  try {
    const tscVersion = execSync('npx tsc --version', { encoding: 'utf8' }).trim();
    log(` ${tscVersion}`);
  } catch (error) {
    logWarning('TypeScript not found');
  }
  
  // Check dependencies
  const packageJsonPath = path.join(process.cwd(), 'package.json');
  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
  
  if (!fs.existsSync('node_modules')) {
    logWarning('node_modules not found. Run: npm install');
  } else {
    logSuccess('Dependencies installed');
  }
  
  // Check webview dependencies
  const webviewPath = path.join(process.cwd(), 'webviews', 'visual-editor', 'clang-format');
  if (!fs.existsSync(path.join(webviewPath, 'node_modules'))) {
    logWarning('Webview dependencies not found. Run: npm install');
  } else {
    logSuccess('Webview dependencies installed');
  }
}

// Main execution
function main() {
  const command = process.argv[2];
  
  validateWorkspace();
  
  switch (command) {
  case 'build':
  case 'fast-build':
    checkDevEnvironment();
    fastBuild();
    break;
      
  case 'watch':
    checkDevEnvironment();
    setupWatch();
    break;
      
  case 'check':
  case 'env':
    checkDevEnvironment();
    break;
      
  default:
    log(`${colors.bright}Clotho Development Helper${colors.reset}\n`);
    log('Usage:');
    log('  node scripts/dev-helper.js build     - Fast development build');
    log('  node scripts/dev-helper.js watch     - Start watch mode');
    log('  node scripts/dev-helper.js check     - Check development environment');
    log('');
    log('For F5 debugging, just press F5 in VS Code!');
    break;
  }
}

if (require.main === module) {
  main();
}

module.exports = {
  fastBuild,
  setupWatch,
  checkDevEnvironment
};