# Using Analysis with Diffs

## Overview

The `runAnalysisWithDiffs` function provides an enhanced analysis experience by including git diff information alongside the files being analyzed. This allows the backend to understand not just which files changed, but exactly what changes were made.

## Quick Start

### Basic Usage

```typescript
import { runAnalysisWithDiffs } from './cli-command/cli-command-helpers';

// Run analysis with diff information for changed files
await runAnalysisWithDiffs({
  task: 'REVIEW',
  paths: [],
  options: {
    method: 'GIT_DIFF', // Optional: defaults to git diff
    language: 'en',
    openBrowser: true
  }
});
```

### Analyzing Specific Files with Diffs

```typescript
import { runAnalysisWithDiffs } from './cli-command/cli-command-helpers';

// Analyze specific paths with diff information
await runAnalysisWithDiffs({
  task: 'REVIEW',
  paths: ['src/components', 'src/utils'],
  options: {
    method: 'SELECTED_FILES',
    language: 'en'
  }
});
```

### Entire Project Analysis

```typescript
import { runAnalysisWithDiffs } from './cli-command/cli-command-helpers';

// Analyze entire project (diffs only available for changed files)
await runAnalysisWithDiffs({
  task: 'SECURITY_AUDIT',
  paths: [],
  options: {
    method: 'ENTIRE_PROJECT',
    language: 'pt'
  }
});
```

## Function Signature

```typescript
async function runAnalysisWithDiffs({
  task,
  paths,
  options,
}: RunAnalysisParams): Promise<void>
```

### Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `task` | `string` | The analysis task to run (e.g., 'REVIEW', 'SECURITY_AUDIT') |
| `paths` | `string[]` | Array of file or directory paths to analyze |
| `options` | `object` | Analysis configuration options |

### Options Object

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `method` | `'GIT_DIFF' \| 'SELECTED_FILES' \| 'ENTIRE_PROJECT'` | `'GIT_DIFF'` | Analysis scope method |
| `language` | `string` | `'en'` | Language for analysis results |
| `all` | `boolean` | `false` | Analyze all files in project |
| `openBrowser` | `boolean` | `false` | Auto-open results in browser |

## How It Works

The `runAnalysisWithDiffs` function orchestrates the following flow:

1. **Authentication** - Validates user credentials and project setup
2. **Task Selection** - Ensures a valid analysis task is specified
3. **Strategy Selection** - Determines which files to analyze based on method
4. **Diff Collection** - Gathers git diff information for changed files
5. **File Deployment** - Syncs any out-of-sync files with remote
6. **Analysis Execution** - Sends files + diffs to backend for analysis
7. **Results Display** - Shows analysis results URL

## Comparison with Regular Analysis

### Regular `runAnalysis()`

```typescript
await runAnalysis({
  task: 'REVIEW',
  paths: [],
  options: { language: 'en' }
});
```

**Sends to backend:**
- ✅ List of file paths
- ❌ No diff information

### Enhanced `runAnalysisWithDiffs()`

```typescript
await runAnalysisWithDiffs({
  task: 'REVIEW',
  paths: [],
  options: { language: 'en' }
});
```

**Sends to backend:**
- ✅ List of file paths
- ✅ **Diff information for each changed file**
- ✅ Line-by-line changes (+additions, -deletions)

## Output Example

When running `runAnalysisWithDiffs`, you'll see:

```
🔍 Running analysis with diffs - scope: GIT_DIFF
Target files:
src/components/Button.tsx
src/utils/helpers.ts
'----'
Task: REVIEW
Language: en

📊 Diff data collected for 2 files

Analysis with diffs successfully initiated!

✅ View analysis progress and results at:
https://app.codexai.com/projects/proj-123/analysis/run-456
```

## Advanced Usage

### Direct Orchestrator Usage

For more control, you can use the `AnalysisOrchestrator` directly:

```typescript
import { AnalysisOrchestrator } from './cli-command/analysis/analysis-orchestrator';

const orchestrator = new AnalysisOrchestrator();

await orchestrator.runAnalysisWithDiffs('REVIEW', [], {
  method: 'GIT_DIFF',
  language: 'en',
  all: false,
  openBrowser: true
});
```

### Using Lower-Level Functions

For custom implementations:

```typescript
import { prepareAnalysisDataWithDiffs, triggerAnalysisWithDiffs } from './helpers/analysis/analysis-helpers';
import { AnalysisScope } from './models/cli.model';

// 1. Prepare data with diffs
const analysisData = await prepareAnalysisDataWithDiffs({
  paths: ['src/'],
  scope: AnalysisScope.SELECTED_FILES
});

// 2. Trigger analysis
await triggerAnalysisWithDiffs({
  apiKey: 'your-key',
  projectId: 'proj-123',
  task: 'REVIEW',
  language: 'en',
  analysisData
});
```

## Use Cases

### 1. Code Review with Context

```typescript
// Perfect for understanding what changed in a PR
await runAnalysisWithDiffs({
  task: 'REVIEW',
  paths: [],
  options: { method: 'GIT_DIFF' }
});
```

### 2. Security Audit on Changes

```typescript
// Audit only the changes for security issues
await runAnalysisWithDiffs({
  task: 'SECURITY_AUDIT',
  paths: [],
  options: { method: 'GIT_DIFF' }
});
```

### 3. Focused Component Analysis

```typescript
// Analyze specific components with their changes
await runAnalysisWithDiffs({
  task: 'REVIEW',
  paths: ['src/features/auth'],
  options: { method: 'SELECTED_FILES' }
});
```

## Benefits

1. **Context-Aware Analysis** - Backend sees what actually changed
2. **Better Insights** - Analysis can focus on modifications
3. **Efficient Review** - Highlights impact of changes
4. **Git Integration** - Leverages existing git workflow
5. **No Extra Setup** - Works automatically with git repositories

## Notes

- Diff information is only available for files with git changes
- Untracked files will be included but with empty diff data
- Both staged and unstaged changes are included
- Works with all analysis scopes (GIT_DIFF, SELECTED_FILES, ENTIRE_PROJECT)
- Maintains backward compatibility with regular `runAnalysis()`

## Troubleshooting

### No Diff Data Collected

If you see "Diff data collected for 0 files":
- Ensure you have uncommitted changes in git
- Check that you're in a git repository
- Verify files are within the analysis scope

### Git Not Found Error

```bash
# Initialize git if needed
git init
git add .
git commit -m "Initial commit"
```

### Non-Interactive Mode

In CI/CD environments, specify the task explicitly:

```typescript
await runAnalysisWithDiffs({
  task: 'REVIEW', // Must be provided in CI
  paths: [],
  options: {}
});
```

## See Also

- [Diff Analysis Feature Documentation](./diff-analysis-feature.md) - Detailed technical documentation
- Regular `runAnalysis()` - Standard analysis without diffs
- `prepareAnalysisDataWithDiffs()` - Low-level diff preparation
- `triggerAnalysisWithDiffs()` - Low-level analysis trigger
