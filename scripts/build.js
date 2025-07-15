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

// Copy the appropriate .env file for the build
const sourceEnvFile = isDev ? '.env.development' : '.env.production';
const targetEnvFile = '.env';

console.log(`Copying ${sourceEnvFile} to ${targetEnvFile}...`);
try {
  const envContent = fs.readFileSync(sourceEnvFile, 'utf8');
  fs.writeFileSync(targetEnvFile, envContent);
} catch (error) {
  console.error(`Error copying env file: ${error.message}`);
  process.exit(1);
}

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
