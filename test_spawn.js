const { spawn } = require('child_process');

const child = spawn('node', ['temp_env_test.js'], {
  stdio: 'pipe',
  env: {
    ...process.env,
    NODE_ENV: 'development',
    CODEAI_WEB_URL: 'http://localhost:3000',
    CODEAI_API_URL: 'http://localhost:5001/codex-ai-30da8/us-central1',
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

child.on('close', code => {
  console.log('STDOUT:', stdout);
  console.log('STDERR:', stderr);
  console.log('Exit code:', code);
});
