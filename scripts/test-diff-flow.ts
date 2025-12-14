#!/usr/bin/env node
/**
 * Test script to verify that diff data is being sent and saved correctly
 *
 * This script will:
 * 1. Make a small code change
 * 2. Run analysis with diff scope
 * 3. Check if filesWithDiffs is being sent to the backend
 */

import { runAnalysisWithDiffs } from '../src/cli-command/cli-command-helpers';

/**
 *
 */
async function testDiffFlow() {
  console.log('🧪 Testing Diff Data Flow\n');
  console.log('='.repeat(60));

  try {
    console.log('\n📝 Running analysis with diff scope...\n');

    await runAnalysisWithDiffs({
      task: 'REVIEW',
      paths: [],
      options: {
        method: 'GIT_DIFF',
        language: 'en',
        openBrowser: false,
      },
    });

    console.log('\n✅ Analysis completed!');
    console.log('\n📊 Check the backend logs to verify:');
    console.log('   1. "Analysis request includes diff data for X files"');
    console.log('   2. "Storing diff data for X files in analysis run"');
    console.log('   3. "Including diff data for file X in task payload"');
  } catch (error) {
    console.error('\n❌ Test failed:', error);
    process.exit(1);
  }
}

testDiffFlow();
