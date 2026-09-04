import fs from 'fs';
import path from 'path';
import { PathShield } from '../security/path_shield.js';

export interface SymbolInfo {
  name: string;
  kind: 'function' | 'class' | 'interface' | 'type' | 'variable' | 'export';
  line: number;
}

export interface FileNode {
  id: string; // Relative file path
  name: string;
  extension: string;
  category: 'frontend' | 'backend' | 'electron' | 'config' | 'test' | 'doc';
  size: number;
  symbols: SymbolInfo[];
  imports: string[];
}

export interface DependencyEdge {
  source: string;
  target: string;
}

export interface ArchitectureGraph {
  nodes: FileNode[];
  edges: DependencyEdge[];
  circularDependencies: string[][];
  summary: {
    totalFiles: number;
    totalSymbols: number;
    categories: Record<string, number>;
  };
}

export class ProjectIndexer {
  private workspaceRoot: string;
  private pathShield: PathShield;
  private cachedGraph: ArchitectureGraph | null = null;
  private lastIndexedTime: number = 0;

  constructor(workspaceRoot: string, pathShield: PathShield) {
    this.workspaceRoot = path.resolve(workspaceRoot);
    this.pathShield = pathShield;
  }

  public setWorkspaceRoot(newRoot: string) {
    this.workspaceRoot = path.resolve(newRoot);
    this.cachedGraph = null;
  }

  public async indexProject(forceRefresh: boolean = false): Promise<ArchitectureGraph> {
    const now = Date.now();
    // Cache for 10 seconds unless forced
    if (!forceRefresh && this.cachedGraph && now - this.lastIndexedTime < 10000) {
      return this.cachedGraph;
    }

    const nodes: FileNode[] = [];
    const edges: DependencyEdge[] = [];
    const filesToScan: string[] = [];

    const walk = (dir: string) => {
      if (!fs.existsSync(dir)) return;
      const entries = fs.readdirSync(dir, { withFileTypes: true });

      for (const entry of entries) {
        if (
          entry.name.startsWith('.') ||
          entry.name === 'node_modules' ||
          entry.name === 'dist' ||
          entry.name === 'dist-client' ||
          entry.name === 'dist-server' ||
          entry.name === 'dist-electron' ||
          entry.name === 'release'
        ) {
          continue;
        }

        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          walk(fullPath);
        } else if (entry.isFile()) {
          const ext = path.extname(entry.name).toLowerCase();
          if (['.ts', '.tsx', '.js', '.jsx', '.json', '.md'].includes(ext)) {
            filesToScan.push(fullPath);
          }
        }
      }
    };

    walk(this.workspaceRoot);

    // Parse each file
    for (const filePath of filesToScan) {
      const relPath = path.relative(this.workspaceRoot, filePath).replace(/\\/g, '/');
      const ext = path.extname(filePath).toLowerCase();
      const stat = fs.statSync(filePath);

      let category: FileNode['category'] = 'backend';
      if (relPath.startsWith('client/')) category = 'frontend';
      else if (relPath.startsWith('electron/')) category = 'electron';
      else if (relPath.startsWith('tests/')) category = 'test';
      else if (relPath.endsWith('.json') || relPath.endsWith('.yml')) category = 'config';
      else if (relPath.endsWith('.md')) category = 'doc';

      const content = fs.readFileSync(filePath, 'utf8');
      const { symbols, imports } = this.parseFileAst(content, ext);

      nodes.push({
        id: relPath,
        name: path.basename(filePath),
        extension: ext,
        category,
        size: stat.size,
        symbols,
        imports,
      });

      // Resolve relative imports to create edges
      const fileDir = path.dirname(filePath);
      for (const imp of imports) {
        if (imp.startsWith('.')) {
          // Resolve relative path
          let targetPath = path.resolve(fileDir, imp).replace(/\\/g, '/');
          // Try adding .ts or .tsx or /index.ts if needed
          // Normalize if import ends with .js (ESM convention in TypeScript)
          let basePath = targetPath;
          if (basePath.endsWith('.js')) {
            basePath = basePath.slice(0, -3);
          } else if (basePath.endsWith('.jsx')) {
            basePath = basePath.slice(0, -4);
          }

          const candidates = [
            targetPath,
            basePath,
            `${basePath}.ts`,
            `${basePath}.tsx`,
            `${basePath}.js`,
            `${basePath}.jsx`,
            path.join(basePath, 'index.ts'),
            path.join(basePath, 'index.tsx'),
          ];

          for (const cand of candidates) {
            if (fs.existsSync(cand) && !fs.statSync(cand).isDirectory()) {
              const targetRel = path.relative(this.workspaceRoot, cand).replace(/\\/g, '/');
              edges.push({ source: relPath, target: targetRel });
              break;
            }
          }
        }
      }
    }

    // Detect Circular Dependencies using DFS
    const circular = this.detectCycles(nodes.map((n) => n.id), edges);

    const categoriesCount: Record<string, number> = {};
    let totalSymbols = 0;
    for (const node of nodes) {
      categoriesCount[node.category] = (categoriesCount[node.category] || 0) + 1;
      totalSymbols += node.symbols.length;
    }

    this.cachedGraph = {
      nodes,
      edges,
      circularDependencies: circular,
      summary: {
        totalFiles: nodes.length,
        totalSymbols,
        categories: categoriesCount,
      },
    };
    this.lastIndexedTime = now;

    return this.cachedGraph;
  }

  private parseFileAst(content: string, ext: string): { symbols: SymbolInfo[]; imports: string[] } {
    const symbols: SymbolInfo[] = [];
    const imports: string[] = [];
    const lines = content.split(/\r?\n/);

    for (let idx = 0; idx < lines.length; idx++) {
      const line = lines[idx].trim();
      const lineNum = idx + 1;

      // Imports
      const importMatch = line.match(/^import\s+.*from\s+['"]([^'"]+)['"]/);
      if (importMatch) {
        imports.push(importMatch[1]);
      }

      // Classes
      const classMatch = line.match(/^(?:export\s+)?(?:abstract\s+)?class\s+([A-Za-z0-9_]+)/);
      if (classMatch) {
        symbols.push({ name: classMatch[1], kind: 'class', line: lineNum });
        continue;
      }

      // Interfaces
      const interfaceMatch = line.match(/^(?:export\s+)?interface\s+([A-Za-z0-9_]+)/);
      if (interfaceMatch) {
        symbols.push({ name: interfaceMatch[1], kind: 'interface', line: lineNum });
        continue;
      }

      // Functions
      const funcMatch = line.match(/^(?:export\s+)?(?:async\s+)?function\s+([A-Za-z0-9_]+)/);
      if (funcMatch) {
        symbols.push({ name: funcMatch[1], kind: 'function', line: lineNum });
        continue;
      }

      // Types
      const typeMatch = line.match(/^(?:export\s+)?type\s+([A-Za-z0-9_]+)\s*=/);
      if (typeMatch) {
        symbols.push({ name: typeMatch[1], kind: 'type', line: lineNum });
        continue;
      }

      // Const / Components
      const constMatch = line.match(/^(?:export\s+)?const\s+([A-Za-z0-9_]+)(?:\s*:\s*[A-Za-z0-9_<>]+)?\s*=/);
      if (constMatch) {
        symbols.push({ name: constMatch[1], kind: 'variable', line: lineNum });
      }
    }

    return { symbols, imports };
  }

  private detectCycles(nodeIds: string[], edges: DependencyEdge[]): string[][] {
    const adj = new Map<string, string[]>();
    for (const id of nodeIds) {
      adj.set(id, []);
    }
    for (const edge of edges) {
      const list = adj.get(edge.source) || [];
      list.push(edge.target);
      adj.set(edge.source, list);
    }

    const visited = new Set<string>();
    const recStack = new Set<string>();
    const pathStack: string[] = [];
    const cycles: string[][] = [];

    const dfs = (curr: string) => {
      visited.add(curr);
      recStack.add(curr);
      pathStack.push(curr);

      const neighbors = adj.get(curr) || [];
      for (const neighbor of neighbors) {
        if (!visited.has(neighbor)) {
          dfs(neighbor);
        } else if (recStack.has(neighbor)) {
          // Cycle found
          const cycleStart = pathStack.indexOf(neighbor);
          if (cycleStart !== -1) {
            cycles.push(pathStack.slice(cycleStart).concat(neighbor));
          }
        }
      }

      recStack.delete(curr);
      pathStack.pop();
    };

    for (const id of nodeIds) {
      if (!visited.has(id)) {
        dfs(id);
      }
    }

    return cycles;
  }
}
