#!/usr/bin/env node

const fs = require('fs');
const { execSync } = require('child_process');
require('dotenv').config();
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

console.log(
  'process.env.CODEAI_WEB_URL:',
  process.env.NODE_ENV,
  process.env.CODEAI_WEB_URL
);

// check if the source env file exists
const sourceEnvFile = isDev ? '.env.development' : '.env.production' || '.env';
const targetEnvFile = '.env';

if (fs.existsSync(sourceEnvFile)) {
  console.error(`Source env file ${sourceEnvFile} does not exist.`);

  try {
    console.log(`Copying ${sourceEnvFile} to ${targetEnvFile}...`);
    const envContent = fs.readFileSync(sourceEnvFile, 'utf8');
    fs.writeFileSync(targetEnvFile, envContent);
  } catch (error) {
    console.error(`Error copying env file: ${error.message}`);
    process.exit(1);
  }
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
