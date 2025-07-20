---
id: analyze
title: Analyze
sidebar_position: 4
---

# `codeai analyze`

Uploads your project files or specific paths and initiates a new AI-powered analysis. This is the core command for getting insights into your codebase.

## Usage

```bash
codeai analyze <paths...> [options]
```

## Arguments

*   **`<paths...>`** (Required)
    *   A space-separated list of file paths or directory paths to include in the analysis. The CLI will recursively process all files within specified directories.
    *   **Examples:** `.` (current directory), `./src/main.js`, `my-project/backend/ src/frontend/`

## Options

| Option                  | Alias | Type       | Default    | Description                                                                                                                                                                                                                                                                          |
| :---------------------- | :---- | :--------- | :--------- | :----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `--project <name>`      | `-p`  | `string`   | (Generated)| Assign a custom name to this analysis project. This name will appear in the CodeAI web interface to help you identify your analysis runs. If not provided, a name will be automatically generated.                                                                                           |
| `--task <type>`         | `-t`  | `string`   | `REVIEW`   | Specify the type of analysis task you want the AI to perform.                                                                                                                                                                                                                        |
|                         |       |            |            | **Available Types:**<br/> - `REVIEW`: Perform a comprehensive code review, identifying bugs, security vulnerabilities, code smells, and suggesting improvements (default).<br/> - `UNIT_TESTS`: Generate potential unit test cases for the provided code. <br/> _(More tasks may be added in the future.)_ |
| `--language <lang>`     | `-l`  | `string`   | `en`       | Specify the preferred language for the analysis results and explanations. This influences the language used by the AI in its reports.                                                                                                                                               |
|                         |       |            |            | **Available Languages:** `en` (English), `es` (Spanish), `fr` (French), `pt` (Portuguese). _(More languages may be supported soon.)_                                                                                                                                                    |
| `--changed`             | `-c`  | `boolean`  | `false`    | If set, only files that have been changed (according to `git status`) in the specified paths will be included in the analysis. This is useful for analyzing recent modifications quickly.                                                                                             |

## Description

The `analyze` command performs the following steps:

1.  **Authentication Check:** Verifies that you are logged in. If not, it will prompt you to authenticate or exit.
2.  **File Collection:** Gathers all files from the specified `<paths...>`, respecting the `--changed` option if provided.
3.  **Project Compression:** Compresses the selected files into a `.zip` archive.
4.  **Upload & Analysis Initiation:** Uploads the compressed project to the CodeAI platform and initiates the analysis process.
5.  **Results Link:** Once the analysis starts, the CLI provides a direct URL to view the live results and detailed reports in your web browser.
6.  **Browser Auto-Open:** Attempts to automatically open the results URL in your default web browser for convenience.

## Viewing Results

:::success
All detailed analysis reports, AI suggestions, and interactive insights are presented in a dedicated web interface. The CLI will provide a direct link and attempt to open it automatically.
:::

## Examples

### 1. Analyze the current directory with default settings

This will analyze all files in the directory where you run the command and open the results in your browser.

```bash
codeai analyze .
```

### 2. Analyze specific files and folders

```bash
codeai analyze src/components/Button.js src/utils/helpers.ts styles/main.css
```

### 3. Analyze a project and give it a custom name

```bash
codeai analyze . --project "MyWebApp-Frontend"
```

### 4. Analyze only changed files in a specific directory for unit tests

This command will only include files marked as changed by `git status` within the `src/backend` directory and request the AI to generate unit tests.

```bash
codeai analyze src/backend --changed --task UNIT_TESTS
```

### 5. Analyze and get results in Spanish

```bash
codeai analyze . --language es
```

