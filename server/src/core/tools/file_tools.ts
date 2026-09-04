import fs from 'fs';
import path from 'path';
import { PathShield } from '../security/path_shield.js';
import { ToolRegistry } from './registry.js';
import { PermissionLevel } from '../../types/index.js';

export function registerFileAndCodeTools(registry: ToolRegistry, pathShield: PathShield) {
  // 1. read_file (Level 0 - Read Only)
  registry.registerTool(
    {
      name: 'read_file',
      description: 'Reads the complete text content of a file within the workspace.',
      category: 'file',
      permissionLevel: PermissionLevel.LEVEL_0_READ_ONLY,
      parameters: {
        type: 'object',
        properties: {
          path: { type: 'string', description: 'Relative or absolute file path to read.' },
        },
        required: ['path'],
      },
    },
    async (params: { path: string }) => {
      const check = pathShield.resolveSafePath(params.path);
      if (!check.isAllowed) throw new Error(check.reason);

      if (!fs.existsSync(check.safePath)) {
        throw new Error(`File not found: ${params.path}`);
      }

      const stat = fs.statSync(check.safePath);
      if (stat.isDirectory()) {
        throw new Error(`Path is a directory, not a file: ${params.path}`);
      }

      const maxBytes = 2 * 1024 * 1024; // 2MB
      if (stat.size > maxBytes) {
        throw new Error(`File is too large (${(stat.size / 1024).toFixed(1)} KB). Max readable size is 2MB.`);
      }

      const content = fs.readFileSync(check.safePath, 'utf8');
      return { path: params.path, size: stat.size, content };
    }
  );

  // 2. write_file (Level 1 - Modify)
  registry.registerTool(
    {
      name: 'write_file',
      description: 'Writes text content to a file. Creates parent directories if needed.',
      category: 'file',
      permissionLevel: PermissionLevel.LEVEL_1_MODIFY,
      parameters: {
        type: 'object',
        properties: {
          path: { type: 'string', description: 'Relative or absolute file path to write to.' },
          content: { type: 'string', description: 'The text content to write.' },
        },
        required: ['path', 'content'],
      },
    },
    async (params: { path: string; content: string }) => {
      const check = pathShield.resolveSafePath(params.path);
      if (!check.isAllowed) throw new Error(check.reason);

      const dir = path.dirname(check.safePath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }

      // Atomic write via temp file
      const tempPath = `${check.safePath}.tmp.${Date.now()}`;
      fs.writeFileSync(tempPath, params.content, 'utf8');
      fs.renameSync(tempPath, check.safePath);

      return {
        path: params.path,
        bytesWritten: Buffer.byteLength(params.content, 'utf8'),
        success: true,
      };
    }
  );

  // 3. edit_file (Level 1 - Modify)
  registry.registerTool(
    {
      name: 'edit_file',
      description: 'Replaces a specific substring or target block inside an existing file.',
      category: 'file',
      permissionLevel: PermissionLevel.LEVEL_1_MODIFY,
      parameters: {
        type: 'object',
        properties: {
          path: { type: 'string', description: 'File path to edit.' },
          targetContent: { type: 'string', description: 'Exact string to be replaced.' },
          replacementContent: { type: 'string', description: 'New string replacement.' },
        },
        required: ['path', 'targetContent', 'replacementContent'],
      },
    },
    async (params: { path: string; targetContent: string; replacementContent: string }) => {
      const check = pathShield.resolveSafePath(params.path);
      if (!check.isAllowed) throw new Error(check.reason);

      if (!fs.existsSync(check.safePath)) {
        throw new Error(`File does not exist: ${params.path}`);
      }

      const original = fs.readFileSync(check.safePath, 'utf8');
      if (!original.includes(params.targetContent)) {
        throw new Error(`Target content was not found in ${params.path}`);
      }

      const updated = original.replace(params.targetContent, params.replacementContent);
      fs.writeFileSync(check.safePath, updated, 'utf8');

      return { path: params.path, success: true, message: 'Replacement applied successfully.' };
    }
  );

  // 4. delete_file (Level 4 - Destructive)
  registry.registerTool(
    {
      name: 'delete_file',
      description: 'Deletes a file from the workspace. Requires Level 4 confirmation.',
      category: 'file',
      permissionLevel: PermissionLevel.LEVEL_4_DESTRUCTIVE,
      parameters: {
        type: 'object',
        properties: {
          path: { type: 'string', description: 'File path to delete.' },
        },
        required: ['path'],
      },
    },
    async (params: { path: string }) => {
      const check = pathShield.resolveSafePath(params.path);
      if (!check.isAllowed) throw new Error(check.reason);

      if (!fs.existsSync(check.safePath)) {
        throw new Error(`File does not exist: ${params.path}`);
      }

      fs.unlinkSync(check.safePath);
      return { path: params.path, deleted: true };
    }
  );

  // 5. list_directory (Level 0 - Read Only)
  registry.registerTool(
    {
      name: 'list_directory',
      description: 'Lists files and folders inside a directory.',
      category: 'file',
      permissionLevel: PermissionLevel.LEVEL_0_READ_ONLY,
      parameters: {
        type: 'object',
        properties: {
          path: { type: 'string', description: 'Relative path of directory to list.' },
          recursive: { type: 'string', description: 'Whether to list recursively (true/false).' },
        },
        required: ['path'],
      },
    },
    async (params: { path: string; recursive?: string }) => {
      const check = pathShield.resolveSafePath(params.path || '.');
      if (!check.isAllowed) throw new Error(check.reason);

      if (!fs.existsSync(check.safePath)) {
        throw new Error(`Directory not found: ${params.path}`);
      }

      const entries = fs.readdirSync(check.safePath, { withFileTypes: true });
      const items = entries.map((e) => ({
        name: e.name,
        isDirectory: e.isDirectory(),
        isFile: e.isFile(),
      }));

      return { path: params.path, count: items.length, items };
    }
  );

  // 6. search_files (Level 0 - Read Only)
  registry.registerTool(
    {
      name: 'search_files',
      description: 'Searches for files matching a pattern or containing query text.',
      category: 'file',
      permissionLevel: PermissionLevel.LEVEL_0_READ_ONLY,
      parameters: {
        type: 'object',
        properties: {
          query: { type: 'string', description: 'Pattern or text to search for.' },
          extension: { type: 'string', description: 'Filter by extension (e.g. .ts, .json).' },
        },
        required: ['query'],
      },
    },
    async (params: { query: string; extension?: string }) => {
      const check = pathShield.resolveSafePath('.');
      const rootDir = check.safePath;
      const matches: string[] = [];

      function scan(dir: string) {
        if (matches.length >= 50) return;
        const list = fs.readdirSync(dir, { withFileTypes: true });
        for (const item of list) {
          if (item.name.startsWith('.') || item.name === 'node_modules' || item.name === 'dist') continue;
          const full = path.join(dir, item.name);
          if (item.isDirectory()) {
            scan(full);
          } else if (item.isFile()) {
            if (params.extension && !item.name.endsWith(params.extension)) continue;
            if (item.name.toLowerCase().includes(params.query.toLowerCase())) {
              matches.push(path.relative(rootDir, full));
            }
          }
        }
      }

      scan(rootDir);
      return { query: params.query, matches };
    }
  );

  // 7. inspect_project (Level 0 - Read Only)
  registry.registerTool(
    {
      name: 'inspect_project',
      description: 'Discovers project architecture, package.json dependencies, and git configuration.',
      category: 'code',
      permissionLevel: PermissionLevel.LEVEL_0_READ_ONLY,
      parameters: {
        type: 'object',
        properties: {},
      },
    },
    async () => {
      const check = pathShield.resolveSafePath('.');
      const pkgPath = path.join(check.safePath, 'package.json');
      let pkgInfo: unknown = null;

      if (fs.existsSync(pkgPath)) {
        try {
          pkgInfo = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
        } catch {
          // ignore error
        }
      }

      const hasGit = fs.existsSync(path.join(check.safePath, '.git'));
      return {
        root: check.safePath,
        hasPackageJson: Boolean(pkgInfo),
        package: pkgInfo,
        isGitRepo: hasGit,
      };
    }
  );

  // 8. search_symbols (Level 0 - Read Only)
  registry.registerTool(
    {
      name: 'search_symbols',
      description: 'Finds classes, functions, and exported symbols across project files.',
      category: 'code',
      permissionLevel: PermissionLevel.LEVEL_0_READ_ONLY,
      parameters: {
        type: 'object',
        properties: {
          symbolName: { type: 'string', description: 'Symbol name to locate.' },
        },
        required: ['symbolName'],
      },
    },
    async (params: { symbolName: string }) => {
      const check = pathShield.resolveSafePath('.');
      const rootDir = check.safePath;
      const found: Array<{ file: string; line: number; preview: string }> = [];

      function scanSymbols(dir: string) {
        if (found.length >= 30) return;
        const list = fs.readdirSync(dir, { withFileTypes: true });
        for (const item of list) {
          if (item.name.startsWith('.') || item.name === 'node_modules' || item.name === 'dist') continue;
          const full = path.join(dir, item.name);
          if (item.isDirectory()) {
            scanSymbols(full);
          } else if (item.isFile() && /\.(ts|tsx|js|jsx|py|go|rs|java|cpp|c)$/.test(item.name)) {
            const content = fs.readFileSync(full, 'utf8');
            const lines = content.split('\n');
            lines.forEach((line, idx) => {
              if (line.includes(params.symbolName)) {
                found.push({
                  file: path.relative(rootDir, full),
                  line: idx + 1,
                  preview: line.trim(),
                });
              }
            });
          }
        }
      }

      scanSymbols(rootDir);
      return { symbolName: params.symbolName, results: found };
    }
  );
}
