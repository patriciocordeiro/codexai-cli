// scripts/build.js
const esbuild = require('esbuild');
const path = require('path');
const fs = require('fs-extra');
const dotenv = require('dotenv'); // <--- NEW: Import dotenv here!

const isProduction = process.env.NODE_ENV === 'production';
const watchMode = process.argv.includes('--watch');

const outputPath = path.resolve(__dirname, '../dist/index.js');
const outputDir = path.resolve(__dirname, '../dist');

// --- Load environment variables for the BUILD PROCESS ITSELF ---
// This ensures `esbuild` has access to them via `process.env`
const envFileName = isProduction ? '.env.production' : '.env.development';
const envFilePath = path.resolve(__dirname, '..', envFileName); // Correctly points to project root
dotenv.config({ path: envFilePath });

// Ensure NODE_ENV is explicitly set for esbuild's define
process.env.NODE_ENV = isProduction ? 'production' : 'development';

// Define environment variables to be injected into the bundle
// esbuild will replace 'process.env.VAR_NAME' with the actual string value
const defineEnv = {
  'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV),
  'process.env.CODEAI_WEB_URL': JSON.stringify(
    process.env.CODEAI_WEB_URL || ''
  ), // Provide fallback empty string
  'process.env.CODEAI_API_URL': JSON.stringify(
    process.env.CODEAI_API_URL || ''
  ), // Provide fallback empty string
  // Add any other variables you want to inject at build time here
  'process.env.LOG_LEVEL': JSON.stringify(process.env.LOG_LEVEL || 'info'),
  'process.env.CLI_TIMEOUT': JSON.stringify(
    process.env.CLI_TIMEOUT || '120000'
  ),
  'process.env.HTTP_TIMEOUT': JSON.stringify(
    process.env.HTTP_TIMEOUT || '30000'
  ),
  'process.env.MAX_RETRIES': JSON.stringify(process.env.MAX_RETRIES || '3'),
  'process.env.CLI_CONFIG_DIR': JSON.stringify(
    process.env.CLI_CONFIG_DIR || ''
  ), // Provide fallback empty string
};

async function build() {
  fs.emptyDirSync(outputDir);

  const buildOptions = {
    entryPoints: [path.resolve(__dirname, '../src/index.ts')],
    bundle: true,
    platform: 'node',
    target: 'node18',
    outfile: outputPath,
    // external: [], // Keep 'open' external if dynamic import doesn't solve it, otherwise remove.
    sourcemap: !isProduction,
    minify: isProduction,
    treeShaking: isProduction,
    keepNames: true,
    banner: { js: '#!/usr/bin/env node\n' },
    define: defineEnv, // <--- CRITICAL: Pass the defined environment variables here
    plugins: [
      {
        name: 'build-logger',
        setup(build) {
          build.onEnd(result => {
            if (result.errors.length > 0) {
              console.error('Build failed:', result.errors);
            } else {
              console.log('Build succeeded.');
              if (result.warnings.length > 0) {
                console.warn('Build warnings:', result.warnings);
              }
              try {
                fs.chmodSync(outputPath, '755');
              } catch (e) {
                console.error(
                  `Failed to set executable permissions: ${e.message}`
                );
              }
            }
          });
        },
      },
    ],
  };

  if (watchMode) {
    const ctx = await esbuild.context(buildOptions);
    await ctx.watch();
    console.log('Watching for file changes...');
  } else {
    await esbuild.build(buildOptions);
  }
}

build().catch(e => {
  console.error('Build process failed:', e);
  process.exit(1);
});
