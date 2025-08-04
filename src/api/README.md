# Enhanced API Error Handling

This system provides user-friendly error messages with actionable troubleshooting steps for CLI users.

## Features

- **User-friendly messages**: Instead of "Request failed with status code 403", users see "Access denied. You do not have permission to perform this action."
- **Actionable solutions**: Each error includes numbered troubleshooting steps
- **Status-code aware**: Different error types based on HTTP status codes
- **Backward compatible**: Works with existing error classes

## Usage in CLI Commands

```typescript
import { handleApiError } from '../api/api-error-handler';
import { displayError } from '../api/error-display';

try {
  const result = await createProjectWithFiles({
    apiKey: 'your-key',
    projectName: 'test-project',
    zipBuffer: buffer,
    fileManifest: manifest,
  });
  console.log('✅ Project created successfully!');
} catch (error) {
  displayError(error as Error);
  process.exit(1);
}
```

## Example Error Output

```
❌ Error: Authentication failed. Please check your API key.

💡 Troubleshooting steps:
   1. Run "codexai config" to set or update your API key
   2. Verify your API key is correct in your configuration  
   3. Check if your API key has expired
   4. Ensure you have an active subscription

   Status Code: 401

📖 For more help: https://docs.codexai.dev/authentication/api-keys
```

## Error Types by Status Code

| Status | Error Type | Example Solutions | Documentation |
|--------|------------|-------------------|---------------|
| 401 | AuthenticationError | Check API key, verify subscription | [API Keys Guide](https://docs.codexai.dev/authentication/api-keys) |
| 403 | ApiError | Check permissions, verify project ownership | [Access Denied](https://docs.codexai.dev/troubleshooting/access-denied) |
| 400, 422 | ValidationError | Verify parameters, check data types | [Validation Guide](https://docs.codexai.dev/api/validation) |
| 413 | FileSystemError | Reduce file size, add to .gitignore | [File Size Limits](https://docs.codexai.dev/limits/file-size) |
| 404 | ApiError | Verify project ID, check endpoint | [API Endpoints](https://docs.codexai.dev/api/endpoints) |
| 429 | ApiError | Wait and retry, upgrade plan | [Rate Limiting](https://docs.codexai.dev/limits/rate-limiting) |
| 500+ | ApiError | Wait and retry, check status page | [Server Errors](https://docs.codexai.dev/troubleshooting/server-errors) |

## API Error Handler

The `handleApiError()` function:
1. Detects error type (Axios, standard Error, unknown)
2. Extracts status code and response data
3. Maps to user-friendly message and solutions
4. Throws appropriate error type for backward compatibility

## Error Display Helper

The `displayError()` function:
- Shows formatted error message with emoji
- Lists numbered troubleshooting steps
- Displays status code when available
- Shows documentation links for more detailed help
- Can be configured to hide solutions if needed

### Additional Helper Functions

- `getSolutions(error)` - Extract troubleshooting steps from an error
- `getDocsUrl(error)` - Extract documentation URL from an error
