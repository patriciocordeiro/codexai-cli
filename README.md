# CodeAI CLI

A CLI tool to upload and analyze code projects using CodeAI.

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

3. **`codeai analyze <paths...>`** - Upload and analyze code
   - Compresses specified files/folders into a ZIP
   - Uploads to CodeAI API for analysis
   - Supports project naming and task types
   - Opens results in browser when complete

### Analyze Command Options

```bash
codeai analyze [options] <paths...>

Arguments:
  paths                 Files or folders to analyze (required)

Options:
  -p, --project <name>  Assign a name to this analysis project
  -t, --task <type>     Analysis task type (default: "REVIEW")
  -h, --help           Show help for analyze command
```

**Supported Task Types:** REVIEW, UNIT_TESTS (and any other types supported by your CodeAI API)

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
# 1. Login first
codeai login

# 2. Analyze current directory  
codeai analyze .

# 3. Analyze specific files
codeai analyze src/ package.json

# 4. Analyze with project name
codeai analyze . --project "My Project"

# 5. Analyze with specific task
codeai analyze . --task UNIT_TESTS

# 6. Logout when done
codeai logout
```

### Check Available Commands
```bash
codeai --help
codeai analyze --help
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
