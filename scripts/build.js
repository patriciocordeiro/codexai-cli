#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const isDev = process.argv.includes('--dev');
const isWatch = process.argv.includes('--watch');

// Clean dist folder if not in watch mode
if (!isWatch) {
  console.log('Cleaning dist folder...');
  try {
    execSync('rm -rf dist', { stdio: 'inherit' });
  } catch (error) {
    // Ignore if dist doesn't exist
  }
}

// Create the appropriate .env file for the build
const envContent = isDev
  ? `NODE_ENV=development
LOG_LEVEL=debug
CODEAI_WEB_URL=http://localhost:3000
CODEAI_API_URL=http://localhost:5001`
  : `NODE_ENV=production
LOG_LEVEL=info`;

fs.writeFileSync('.env', envContent);

// Run TypeScript compilation
const tscCommand = isWatch
  ? `tsc --watch ${isDev ? '--project tsconfig.dev.json' : ''}`
  : `tsc ${isDev ? '--project tsconfig.dev.json' : ''}`;

console.log(`Building for ${isDev ? 'development' : 'production'}...`);
if (isWatch) {
  console.log('Starting watch mode...');
}

try {
  execSync(tscCommand, { stdio: 'inherit' });
} catch (error) {
  process.exit(1);
}
