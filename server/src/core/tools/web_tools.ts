import { ToolRegistry } from './registry.js';
import { PermissionLevel } from '../../types/index.js';
import http from 'http';
import https from 'https';
import { URL } from 'url';

export interface WebSearchResult {
  title: string;
  snippet: string;
  url: string;
  source: 'web' | 'academic' | 'wikipedia' | 'tech';
  author?: string;
  timestamp?: string;
}

// Helper to search DuckDuckGo HTML safely
async function searchDDG(query: string, count: number = 5): Promise<WebSearchResult[]> {
  try {
    const url = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`;
    const res = await fetch(url, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
      },
      signal: AbortSignal.timeout(7000),
    });

    if (!res.ok) return [];
    const html = await res.text();
    const results: WebSearchResult[] = [];

    const blocks = html.split(/<div[^>]+class="[^"]*result results_links[^"]*"/i).slice(1);
    for (const block of blocks) {
      if (results.length >= count) break;
      if (block.includes('result--ad')) continue;

      const titleMatch = block.match(/<a[^>]+class="[^"]*result__a[^"]*"[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/i);
      if (!titleMatch) continue;

      const rawUrl = titleMatch[1];
      const title = titleMatch[2].replace(/<[^>]+>/g, '').trim();

      let actualUrl = rawUrl;
      if (rawUrl.includes('uddg=')) {
        const matchUddg = rawUrl.match(/uddg=([^&]+)/);
        if (matchUddg) {
          try {
            actualUrl = decodeURIComponent(matchUddg[1]);
          } catch {
            // keep raw
          }
        }
      } else if (rawUrl.startsWith('//')) {
        actualUrl = `https:${rawUrl}`;
      }

      const snippetMatch = block.match(/class="[^"]*result__snippet[^"]*"[^>]*>([\s\S]*?)<\/(?:a|div)>/i);
      const snippet = snippetMatch ? snippetMatch[1].replace(/<[^>]+>/g, '').replace(/&quot;/g, '"').trim() : '';

      if (title && actualUrl && !actualUrl.includes('duckduckgo.com/y.js')) {
        results.push({
          title,
          snippet: snippet || `Web resource matching "${query}"`,
          url: actualUrl,
          source: 'web',
        });
      }
    }
    return results;
  } catch {
    return [];
  }
}

// Helper to search Wikipedia API
async function searchWikipedia(query: string, count: number = 3): Promise<WebSearchResult[]> {
  try {
    const url = `https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(
      query
    )}&format=json&utf8=1`;
    const res = await fetch(url, {
      headers: { 'User-Agent': 'OmniWorkspace-ResearchAgent/1.0' },
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) return [];
    const data = await res.json();
    const list: any[] = data?.query?.search || [];
    return list.slice(0, count).map((item) => ({
      title: `${item.title} — Encyclopedia`,
      snippet: (item.snippet || '').replace(/<[^>]+>/g, '').replace(/&quot;/g, '"').trim(),
      url: `https://en.wikipedia.org/wiki/${encodeURIComponent(item.title.replace(/ /g, '_'))}`,
      source: 'wikipedia',
      timestamp: item.timestamp,
    }));
  } catch {
    return [];
  }
}

// Helper to search ArXiv Academic Papers
async function searchArxiv(query: string, count: number = 3): Promise<WebSearchResult[]> {
  try {
    const url = `http://export.arxiv.org/api/query?search_query=all:${encodeURIComponent(
      query
    )}&start=0&max_results=${count}`;
    const res = await fetch(url, { signal: AbortSignal.timeout(6000) });
    if (!res.ok) return [];
    const xml = await res.text();
    const entries = xml.split('<entry>').slice(1);
    return entries.slice(0, count).map((e) => {
      const title = e.match(/<title>([\s\S]*?)<\/title>/)?.[1]?.replace(/\s+/g, ' ').trim() || 'ArXiv Paper';
      const summary = e.match(/<summary>([\s\S]*?)<\/summary>/)?.[1]?.replace(/\s+/g, ' ').trim() || '';
      const id = e.match(/<id>([\s\S]*?)<\/id>/)?.[1]?.trim() || '';
      const authorMatch = e.match(/<author>[\s\S]*?<name>([\s\S]*?)<\/name>/);
      const author = authorMatch ? authorMatch[1].trim() : undefined;
      const publishedMatch = e.match(/<published>([\s\S]*?)<\/published>/);
      const timestamp = publishedMatch ? publishedMatch[1].trim() : undefined;

      return {
        title: `${title} [ArXiv]`,
        snippet: summary.slice(0, 320) + (summary.length > 320 ? '...' : ''),
        url: id || `https://arxiv.org/abs/${encodeURIComponent(query)}`,
        source: 'academic',
        author,
        timestamp,
      };
    });
  } catch {
    return [];
  }
}

// Helper to search Hacker News Algolia
async function searchHackerNews(query: string, count: number = 3): Promise<WebSearchResult[]> {
  try {
    const url = `https://hn.algolia.com/api/v1/search?query=${encodeURIComponent(query)}&hitsPerPage=${count}`;
    const res = await fetch(url, { signal: AbortSignal.timeout(5000) });
    if (!res.ok) return [];
    const data = await res.json();
    const hits: any[] = data?.hits || [];
    return hits
      .filter((h) => h.title)
      .map((h) => ({
        title: `${h.title} — Hacker News`,
        snippet: h.comment_text
          ? h.comment_text.replace(/<[^>]+>/g, '').slice(0, 240) + '...'
          : `Community discussion with ${h.points || 0} points and ${h.num_comments || 0} comments.`,
        url: h.url || `https://news.ycombinator.com/item?id=${h.objectID}`,
        source: 'tech',
        author: h.author,
        timestamp: h.created_at,
      }));
  } catch {
    return [];
  }
}

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
      text = text.replace(/<nav\b[^<]*(?:(?!<\/nav>)<[^<]*)*<\/nav>/gi, ' ');
      text = text.replace(/<footer\b[^<]*(?:(?!<\/footer>)<[^<]*)*<\/footer>/gi, ' ');
      text = text.replace(/<header\b[^<]*(?:(?!<\/header>)<[^<]*)*<\/header>/gi, ' ');
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
      description: 'Searches the web for factual research queries across Web, Academic, Wikipedia, and Tech sources.',
      category: 'web',
      permissionLevel: PermissionLevel.LEVEL_3_NETWORK,
      parameters: {
        type: 'object',
        properties: {
          query: { type: 'string', description: 'Search keywords or question.' },
          numResults: { type: 'string', description: 'Number of results (1-15).' },
          mode: {
            type: 'string',
            description: 'Search mode: all, web, academic, wikipedia, tech',
            enum: ['all', 'web', 'academic', 'wikipedia', 'tech'],
          },
        },
        required: ['query'],
      },
    },
    async (params: { query: string; numResults?: string; mode?: string }) => {
      const count = Math.min(Math.max(Number(params.numResults) || 6, 1), 15);
      const mode = (params.mode || 'all').toLowerCase();

      try {
        let results: WebSearchResult[] = [];

        if (mode === 'web') {
          results = await searchDDG(params.query, count);
          if (results.length === 0) {
            // Fallback to wikipedia if DDG encounters block
            results = await searchWikipedia(params.query, count);
          }
        } else if (mode === 'academic') {
          results = await searchArxiv(params.query, count);
        } else if (mode === 'wikipedia') {
          results = await searchWikipedia(params.query, count);
        } else if (mode === 'tech') {
          results = await searchHackerNews(params.query, count);
        } else {
          // 'all' federated search in parallel
          const [ddgRes, wikiRes, arxivRes, hnRes] = await Promise.allSettled([
            searchDDG(params.query, Math.ceil(count * 0.6)),
            searchWikipedia(params.query, 2),
            searchArxiv(params.query, 2),
            searchHackerNews(params.query, 2),
          ]);

          const combined: WebSearchResult[] = [];
          if (ddgRes.status === 'fulfilled') combined.push(...ddgRes.value);
          if (wikiRes.status === 'fulfilled') combined.push(...wikiRes.value);
          if (arxivRes.status === 'fulfilled') combined.push(...arxivRes.value);
          if (hnRes.status === 'fulfilled') combined.push(...hnRes.value);

          // Deduplicate by URL
          const seen = new Set<string>();
          results = combined
            .filter((r) => {
              if (seen.has(r.url)) return false;
              seen.add(r.url);
              return true;
            })
            .slice(0, count);
        }

        return {
          query: params.query,
          mode,
          count: results.length,
          results,
        };
      } catch (err: any) {
        return {
          query: params.query,
          mode,
          error: `Web search failed: ${err.message}`,
          results: [],
        };
      }
    }
  );

  // 4. academic_search
  registry.registerTool(
    {
      name: 'academic_search',
      description: 'Searches ArXiv for scientific papers, peer-reviewed preprints, and academic literature.',
      category: 'web',
      permissionLevel: PermissionLevel.LEVEL_3_NETWORK,
      parameters: {
        type: 'object',
        properties: {
          query: { type: 'string', description: 'Academic paper topic, author, or keywords.' },
          maxResults: { type: 'string', description: 'Number of papers (1-10).' },
        },
        required: ['query'],
      },
    },
    async (params: { query: string; maxResults?: string }) => {
      const papers = await searchArxiv(params.query, Math.min(Number(params.maxResults) || 5, 10));
      return { query: params.query, count: papers.length, results: papers };
    }
  );

  // 5. extract_article_reader
  registry.registerTool(
    {
      name: 'extract_article_reader',
      description: 'Extracts distraction-free article reader view with title, reading time, and clean paragraphs.',
      category: 'web',
      permissionLevel: PermissionLevel.LEVEL_3_NETWORK,
      parameters: {
        type: 'object',
        properties: {
          url: { type: 'string', description: 'Public URL to read.' },
        },
        required: ['url'],
      },
    },
    async (params: { url: string }) => {
      const safeUrl = assertSafeUrl(params.url);
      const res = await fetch(safeUrl.toString(), {
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        },
        signal: AbortSignal.timeout(9000),
      });

      if (!res.ok) {
        throw new Error(`Failed to fetch article: HTTP ${res.status}`);
      }

      const html = await res.text();
      const titleMatch = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
      const title = titleMatch ? titleMatch[1].replace(/\s+/g, ' ').trim() : 'Web Document';

      let clean = html
        .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, ' ')
        .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, ' ')
        .replace(/<nav\b[^<]*(?:(?!<\/nav>)<[^<]*)*<\/nav>/gi, ' ')
        .replace(/<footer\b[^<]*(?:(?!<\/footer>)<[^<]*)*<\/footer>/gi, ' ')
        .replace(/<header\b[^<]*(?:(?!<\/header>)<[^<]*)*<\/header>/gi, ' ');

      const paragraphs = [...clean.matchAll(/<p[^>]*>([\s\S]*?)<\/p>/gi)]
        .map((m) =>
          m[1]
            .replace(/<[^>]+>/g, '')
            .replace(/&quot;/g, '"')
            .replace(/&amp;/g, '&')
            .replace(/&lt;/g, '<')
            .replace(/&gt;/g, '>')
            .trim()
        )
        .filter((p) => p.length > 35);

      const fullText = paragraphs.join('\n\n');
      const wordCount = fullText.split(/\s+/).filter(Boolean).length;
      const readingTimeMin = Math.max(1, Math.ceil(wordCount / 200));

      return {
        url: params.url,
        title,
        domain: safeUrl.hostname,
        wordCount,
        readingTimeMin,
        paragraphCount: paragraphs.length,
        leadSnippet: paragraphs[0] || 'No paragraphs extracted.',
        fullText: fullText.slice(0, 40000),
      };
    }
  );
}
