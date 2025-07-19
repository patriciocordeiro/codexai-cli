---
id: installation
title: Installation
sidebar_position: 1
---

# Installation

To use the `codeai` CLI, you'll need Node.js (version 16 or higher) and npm (Node Package Manager) or Yarn installed on your system.

## Recommended Installation (Global)

It's recommended to install `codeai` globally so you can run it from any directory:

```bash
npm install -g codeai-cli
# OR
yarn global add codeai-cli
```

:::info
Replace `codeai-cli` with the actual package name if it's different in your `package.json` for publishing.
:::

## Verify Installation

After installation, you can verify that `codeai` is correctly installed by checking its version:

```bash
codeai --version
```

You should see an output similar to:

```
0.0.1
```

If you encounter any issues, please refer to the [Troubleshooting](#troubleshooting) section or open an issue on our GitHub repository.

## Troubleshooting

*   **`command not found`**: Ensure that your npm/Yarn global bin directory is in your system's PATH. You might need to restart your terminal after installation.
*   **Node.js version**: Make sure your Node.js version meets the requirements. You can check it with `node -v`.
```
