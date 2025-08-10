#!/usr/bin/env node

// Test script to verify the enhanced getChangedFiles() function
const { getChangedFiles } = require('./dist/index.js');

console.log('Testing enhanced getChangedFiles() function...\n');

try {
  const changedFiles = getChangedFiles();

  console.log('📁 Found changed files:');
  if (changedFiles.length === 0) {
    console.log('   No changed files detected');
  } else {
    changedFiles.forEach((file, index) => {
      console.log(`   ${index + 1}. ${file}`);
    });
  }

  console.log(`\n✅ Total files: ${changedFiles.length}`);

  // Test different git scenarios
  console.log('\n🔍 Testing different git scenarios:');

  // Test 1: Staged files
  console.log('\n1. Checking staged files:');
  try {
    const { execSync } = require('child_process');
    const stagedOutput = execSync('git diff --cached --name-only', {
      encoding: 'utf-8',
    });
    const stagedFiles = stagedOutput
      .split('\n')
      .filter(f => f.trim().length > 0);
    console.log(
      `   Staged files: ${stagedFiles.length > 0 ? stagedFiles.join(', ') : 'none'}`
    );
  } catch (err) {
    console.log('   No staged files or error checking staged files');
  }

  // Test 2: Unstaged files
  console.log('\n2. Checking unstaged files:');
  try {
    const { execSync } = require('child_process');
    const unstagedOutput = execSync('git diff --name-only', {
      encoding: 'utf-8',
    });
    const unstagedFiles = unstagedOutput
      .split('\n')
      .filter(f => f.trim().length > 0);
    console.log(
      `   Unstaged files: ${unstagedFiles.length > 0 ? unstagedFiles.join(', ') : 'none'}`
    );
  } catch (err) {
    console.log('   No unstaged files or error checking unstaged files');
  }

  // Test 3: Untracked files
  console.log('\n3. Checking untracked files:');
  try {
    const { execSync } = require('child_process');
    const untrackedOutput = execSync(
      'git ls-files --others --exclude-standard',
      { encoding: 'utf-8' }
    );
    const untrackedFiles = untrackedOutput
      .split('\n')
      .filter(f => f.trim().length > 0);
    console.log(
      `   Untracked files: ${untrackedFiles.length > 0 ? untrackedFiles.join(', ') : 'none'}`
    );
  } catch (err) {
    console.log('   No untracked files or error checking untracked files');
  }

  // Test 4: Current branch vs main/master
  console.log('\n4. Checking branch differences:');
  try {
    const { execSync } = require('child_process');
    const currentBranch = execSync('git branch --show-current', {
      encoding: 'utf-8',
    }).trim();
    console.log(`   Current branch: ${currentBranch}`);

    // Try to find base branch
    const branches = ['main', 'master', 'develop'];
    for (const branch of branches) {
      try {
        execSync(`git rev-parse --verify origin/${branch}`, {
          stdio: 'ignore',
        });
        const branchOutput = execSync(
          `git diff origin/${branch}...HEAD --name-only`,
          { encoding: 'utf-8' }
        );
        const branchFiles = branchOutput
          .split('\n')
          .filter(f => f.trim().length > 0);
        console.log(
          `   Files different from origin/${branch}: ${branchFiles.length > 0 ? branchFiles.join(', ') : 'none'}`
        );
        break;
      } catch {
        // Try next branch
      }
    }
  } catch (err) {
    console.log('   Error checking branch differences');
  }
} catch (error) {
  console.error('❌ Error testing getChangedFiles():', error.message);
}
