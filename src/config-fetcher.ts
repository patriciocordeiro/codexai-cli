// Configuration fetcher that gets URLs from a secure endpoint
export async function getConfiguration(): Promise<{
  webAppUrl: string;
  apiBaseUrl: string;
}> {
  try {
    // Fetch from a public config endpoint (no sensitive data)
    const response = await fetch('https://config.codexai.com/cli-config');
    return await response.json();
  } catch {
    // Fallback to hardcoded values
    return {
      webAppUrl: 'https://app.codeai.com',
      apiBaseUrl: 'https://api.codeai.com',
    };
  }
}
