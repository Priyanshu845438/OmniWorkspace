import { ToolRegistry } from './registry.js';
import { PermissionLevel } from '../../types/index.js';
import http from 'http';
import https from 'https';
import { URL } from 'url';

export function registerWebTools(registry: ToolRegistry) {
  // Helper to validate and protect against SSRF
  function assertSafeUrl(urlString: string): URL {
    const parsed = new URL(urlString);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      throw new Error(`SSRF Guard: Unsupported protocol ${parsed.protocol}. Only http/https allowed.`);
    }

    const hostname = parsed.hostname.toLowerCase();
    const blockedHosts = ['localhost', '127.0.0.1', '0.0.0.0', '::1', '169.254.169.254'];
    if (blockedHosts.includes(hostname)) {
      throw new Error(`SSRF Guard: Access to loopback or link-local address ${hostname} is blocked.`);
    }

    if (/^10\./.test(hostname) || /^192\.168\./.test(hostname) || /^172\.(1[6-9]|2[0-9]|3[0-1])\./.test(hostname)) {
      throw new Error(`SSRF Guard: Access to internal network address ${hostname} is blocked.`);
    }

    return parsed;
  }

  // 1. fetch_page (Level 3 - Network)
  registry.registerTool(
    {
      name: 'fetch_page',
      description: 'Fetches HTML or JSON content from a public web URL with SSRF protection.',
      category: 'web',
      permissionLevel: PermissionLevel.LEVEL_3_NETWORK,
      parameters: {
        type: 'object',
        properties: {
          url: { type: 'string', description: 'Public HTTP or HTTPS URL to fetch.' },
        },
        required: ['url'],
      },
    },
    async (params: { url: string }) => {
      const safeUrl = assertSafeUrl(params.url);
      const res = await fetch(safeUrl.toString(), {
        headers: {
          'User-Agent': 'OmniWorkspace-ResearchAgent/1.0',
          Accept: 'text/html,application/xhtml+xml,application/json;q=0.9,*/*;q=0.8',
        },
        signal: AbortSignal.timeout(12000),
      });

      if (!res.ok) {
        throw new Error(`Web request failed with HTTP ${res.status}: ${res.statusText}`);
      }

      const rawText = await res.text();
      return {
        url: params.url,
        status: res.status,
        contentType: res.headers.get('content-type'),
        content: rawText.slice(0, 100000), // Max 100KB
      };
    }
  );

  // 2. extract_content (Level 0 - Read Only)
  registry.registerTool(
    {
      name: 'extract_content',
      description: 'Extracts clean readable article text and removes scripts, styles, and tags from HTML.',
      category: 'web',
      permissionLevel: PermissionLevel.LEVEL_0_READ_ONLY,
      parameters: {
        type: 'object',
        properties: {
          html: { type: 'string', description: 'Raw HTML string to parse.' },
        },
        required: ['html'],
      },
    },
    async (params: { html: string }) => {
      let text = params.html;
      // Strip script and style blocks
      text = text.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, ' ');
      text = text.replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, ' ');
      // Strip HTML tags
      text = text.replace(/<[^>]+>/g, ' ');
      // Collapse whitespace
      text = text.replace(/\s+/g, ' ').trim();

      return {
        extractedText: text.slice(0, 50000),
        characterCount: text.length,
      };
    }
  );

  // 3. web_search (Level 3 - Network)
  registry.registerTool(
    {
      name: 'web_search',
      description: 'Searches the web for factual research queries, documentation, and sources.',
      category: 'web',
      permissionLevel: PermissionLevel.LEVEL_3_NETWORK,
      parameters: {
        type: 'object',
        properties: {
          query: { type: 'string', description: 'Search keywords or question.' },
          numResults: { type: 'string', description: 'Number of results (1-10).' },
        },
        required: ['query'],
      },
    },
    async (params: { query: string; numResults?: string }) => {
      // Use DuckDuckGo HTML API or instant search endpoint
      const count = Math.min(Math.max(Number(params.numResults) || 5, 1), 10);
      try {
        const url = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(params.query)}`;
        const res = await fetch(url, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko)',
          },
          signal: AbortSignal.timeout(8000),
        });

        if (!res.ok) {
          throw new Error(`Search provider HTTP ${res.status}`);
        }

        const html = await res.text();
        const results: Array<{ title: string; snippet: string; url: string }> = [];

        // Parse standard DDG result blocks
        const linkRegex = /<a class="result__url" href="([^"]+)">/g;
        const titleRegex = /<a class="result__snippet[^>]*>([^<]+)<\/a>/g;

        // Fallback robust extraction
        const snippets: string[] = [];
        let match;
        const snippetRegex = /class="result__snippet[^"]*">([\s\S]*?)<\/a>/g;
        while ((match = snippetRegex.exec(html)) !== null && snippets.length < count) {
          const cleanSnippet = match[1].replace(/<[^>]+>/g, '').replace(/&quot;/g, '"').trim();
          snippets.push(cleanSnippet);
        }

        const urls: string[] = [];
        const urlMatchRegex = /<a class="result__url"[^>]*href="([^"]+)"/g;
        while ((match = urlMatchRegex.exec(html)) !== null && urls.length < count) {
          urls.push(match[1].trim());
        }

        for (let i = 0; i < snippets.length; i++) {
          results.push({
            title: `Result ${i + 1}: ${params.query}`,
            snippet: snippets[i],
            url: urls[i] || `https://duckduckgo.com/?q=${encodeURIComponent(params.query)}`,
          });
        }

        return {
          query: params.query,
          count: results.length,
          results,
        };
      } catch (err: any) {
        return {
          query: params.query,
          error: `Web search failed: ${err.message}`,
          results: [],
        };
      }
    }
  );
}
