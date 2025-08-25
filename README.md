# CodeAI CLI

A CLI tool for AI-powered code analysis and automated code review using AI.

**Version:** 1.0.0

## Installation

### From npm (Recommended)

```bash
# Install globally
npm install -g @codexai/cli

# Use immediately
codeai login
codeai analyze .
```

### From Source (Development)

```bash
# Clone and install
git clone https://github.com/codeai-org/cli.git
cd cli
npm install
npm run build
npm link

# Use the linked command
codeai --help
```

## What This CLI Actually Does

### Available Commands

1. **`codeai login`** - Authenticate via web browser
   - Opens your browser to CodeAI web app for authentication
   - Saves API key locally for future use
   - Requires valid CodeAI web app URL

2. **`codeai logout`** - Remove stored authentication
   - Deletes the locally stored API key
   - Signs you out of the CLI

3. **`codeai create [path]`** - Initialize a new CodeAI project
   - Creates project configuration in current directory
   - Uploads initial codebase to CodeAI platform
   - Sets up target directory for analysis

4. **`codeai deploy`** - Deploy file changes to your linked project
   - Syncs local changes with remote CodeAI project
   - Prepares codebase for analysis

5. **`codeai run [task] [paths...]`** - Run analysis on your project
   - Executes AI-powered code analysis
   - Supports multiple analysis methods and tasks
   - Interactive prompts for missing parameters
   - Automatic authentication and project setup

### Run Command Options

```bash
codeai run [task] [paths...] [options]

Arguments:
  task                  Analysis task type (if not provided, you'll be prompted)
  paths                 Files or folders to analyze (optional)

Options:
  --method <method>     Analysis method: "git-diff", "entire-project", or "selected-files"
                        (if not provided, defaults to git-diff for git repos or prompts)
  -l, --language <lang> Language for analysis results (default: "en")
  -h, --help           Show help for run command
```

**Analysis Methods:**
- **git-diff**: Analyze only files changed in git repository
- **entire-project**: Analyze all files in the project
- **selected-files**: Analyze specific files or folders

**Supported Task Types:** REVIEW, SECURITY, PERFORMANCE, DOCUMENTATION, TESTING

## Installation & Setup

### Quick Start (End Users)

```bash
# Install from npm
npm install -g @codexai/cli

# Start using immediately - no configuration needed!
codeai login
codeai analyze .
```

### For Developers

Source code is available for licensed partners. Contact support@codeai.com for access.

## Usage Examples

### Basic Workflow
```bash
# 1. Login first (will be prompted if not already logged in)
codeai login

# 2. Create a new project (will be prompted if not already created)
codeai create

# 3. Run analysis - simple command with interactive prompts
codeai run

# 4. Run analysis with specific parameters
codeai run REVIEW --method git-diff

# 5. Run analysis on specific files
codeai run SECURITY src/ lib/

# 6. Run analysis on entire project
codeai run PERFORMANCE --method entire-project

# 7. Deploy changes and run analysis
codeai deploy
codeai run

# 8. Logout when done
codeai logout
```

### Interactive Experience
The CLI now provides an interactive experience:
- **Automatic Authentication**: If you're not logged in, you'll be prompted to log in
- **Automatic Project Setup**: If no project exists, you'll be prompted to create one
- **Method Selection**: If no method is specified, you'll see options to choose from
- **Task Selection**: If no task is specified, you'll see available analysis types
- **Smart Defaults**: Git repositories default to git-diff analysis

### Advanced Usage
```bash
# Specify everything explicitly
codeai run REVIEW src/ --method selected-files --language es

# Use git-diff method (default for git repos)
codeai run SECURITY --method git-diff

# Analyze entire codebase
codeai run DOCUMENTATION --method entire-project

# Quick analysis with prompts for missing info
codeai run
```

### Check Available Commands
```bash
codeai --help
codeai run --help
codeai create --help
codeai deploy --help
```

## How It Works

1. **Authentication**: Uses web-based OAuth flow
   - Generates unique session ID
   - Opens browser to web app with session
   - Polls API for completion
   - Stores API key locally in `~/.codeai/config.json`

2. **File Processing**: Creates ZIP archive
   - Compresses specified paths
   - Handles both files and directories
   - Shows compression progress and size

3. **Analysis**: Uploads to API
   - Sends ZIP with metadata headers
   - Triggers analysis task
   - Polls for completion
   - Opens results in browser

## Configuration Files

- **Config**: `~/.codeai/config.json` (API key storage)
- **Environment**: `.env` (API URLs and settings)

## Known Issues & Limitations

1. **Environment Dependencies**: CLI fails if required env vars not set
2. **Network Dependent**: Requires internet connection for all operations  
3. **ES Module Warning**: Shows CommonJS/ES Module compatibility warning
4. **No Offline Mode**: Cannot work without API connectivity
5. **Browser Required**: Login requires browser for web authentication

## Support & Contact

For technical support, feature requests, or enterprise inquiries:
- Email: support@codeai.com
- Website: https://codeai.com

## Troubleshooting

### CLI Won't Start
- Ensure you've run `npm install` and `npm run build`
- Check if Node.js version is 18+ (see package.json engines)

### Login Fails
- Check your internet connection
- Verify the CodeAI web app is accessible
- Try opening the login URL manually in your browser

### Analysis Fails  
- Ensure you're authenticated first (`node dist/index.js login`)
- Check your internet connection
- Verify the files/folders you're trying to analyze exist

This README reflects the **actual current functionality** of the CLI as implemented.
