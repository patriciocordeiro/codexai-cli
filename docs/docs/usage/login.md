---
id: login
title: Login
sidebar_position: 2
---

# `codeai login`

Authenticate your `codeai` CLI session via your web browser. This command is required to obtain an API key that allows you to interact with the CodeAI analysis services.

## Usage

```bash
codeai login
```

## Description

When you run `codeai login`, the CLI will:

1.  Open your default web browser to the CodeAI authentication page.
2.  Guide you through the login process (e.g., Google, GitHub, email/password).
3.  Once successfully authenticated in the browser, your browser will redirect back to a local server spun up by the CLI, which securely retrieves and stores your API key locally.

## What to Expect

*   A new browser tab or window will open automatically.
*   You'll be prompted to log in or sign up on the CodeAI platform.
*   Upon successful authentication, the CLI will display a success message: `✅ Login successful! You are now authenticated.`
*   In case of an error, you'll see a message like `Authentication failed.`

## Example

```bash
codeai login
```
