#!/usr/bin/env node

const { spawn } = require('child_process');
const path = require('path');
const os = require('os');

const cliPath = path.resolve(__dirname, 'dist/index.js');

console.log('CLI Path:', cliPath);
console.log('Current env:');
console.log('  NODE_ENV:', process.env.NODE_ENV);
console.log('  CODEAI_WEB_URL:', process.env.CODEAI_WEB_URL);
console.log('  CODEAI_API_URL:', process.env.CODEAI_API_URL);
console.log('  CLI_CONFIG_DIR:', process.env.CLI_CONFIG_DIR);

const child = spawn('node', [cliPath, '--help'], {
  cwd: __dirname,
  stdio: 'pipe',
  env: {
    ...process.env,
    NODE_ENV: 'test',
    CODEAI_WEB_URL: 'http://localhost:3000',
    CODEAI_API_URL: 'http://localhost:5001/codex-ai-30da8/us-central1',
    CLI_CONFIG_DIR: path.join(os.tmpdir(), 'codeai-cli-test'),
  },
});

let stdout = '';
let stderr = '';

child.stdout.on('data', data => {
  stdout += data.toString();
});

child.stderr.on('data', data => {
  stderr += data.toString();
});

child.on('error', err => {
  console.error('Error:', err);
});

child.on('close', code => {
  console.log(`\n=== STDOUT ===`);
  console.log(stdout);
  console.log(`\n=== STDERR ===`);
  console.log(stderr);
  console.log(`\nChild process exited with code ${code}`);
});
