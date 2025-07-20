---
id: logout
title: Logout
sidebar_position: 3
---

# `codeai logout`

Sign out from your `codeai` CLI session and remove the locally stored API key.

## Usage

```bash
codeai logout
```

## Description

This command simply removes the API key that was stored during the `codeai login` process. After logging out, you will no longer be able to use commands that require authentication, such as `codeai analyze`, until you `login` again.

## What to Expect

Upon successful logout, the CLI will display:

```
✅ You have been logged out.
```

## Example

```bash
codeai logout
```
