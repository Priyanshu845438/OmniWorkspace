import fs from 'fs';
import path from 'path';
import { ToolRegistry } from '../tools/registry.js';
import { ModelRegistry } from '../models/registry.js';
import { ToolDefinition, PermissionLevel } from '../../types/index.js';

export interface PluginManifest {
  id: string;
  name: string;
  version: string;
  description: string;
  author?: string;
  tools?: ToolDefinition[];
  providers?: Array<{
    id: string;
    name: string;
    type: 'custom' | 'openai';
    baseUrl: string;
    models: Array<{
      id: string;
      name: string;
      capabilities: any[];
      contextWindow: number;
    }>;
  }>;
}

export class PluginManager {
  private pluginsDir: string;
  private toolRegistry: ToolRegistry;
  private modelRegistry: ModelRegistry;
  private loadedPlugins: Map<string, PluginManifest> = new Map();

  constructor(workspaceRoot: string, toolRegistry: ToolRegistry, modelRegistry: ModelRegistry) {
    this.pluginsDir = path.join(workspaceRoot, 'plugins');
    this.toolRegistry = toolRegistry;
    this.modelRegistry = modelRegistry;

    if (!fs.existsSync(this.pluginsDir)) {
      fs.mkdirSync(this.pluginsDir, { recursive: true });
    }

    this.initStarterPlugin();
  }

  private initStarterPlugin() {
    const starterPluginDir = path.join(this.pluginsDir, 'sample-custom-tools');
    const manifestPath = path.join(starterPluginDir, 'plugin.json');

    if (!fs.existsSync(manifestPath)) {
      fs.mkdirSync(starterPluginDir, { recursive: true });
      const starterManifest: PluginManifest = {
        id: 'sample-custom-tools',
        name: 'Community Developer Utilities',
        version: '1.0.0',
        description: 'Demonstrates the extensible plugin architecture for third-party tools.',
        author: 'OmniWorkspace Community',
        tools: [
          {
            name: 'calculate_hash',
            description: 'Calculates MD5 or SHA256 cryptographic hash of arbitrary string.',
            category: 'code',
            permissionLevel: PermissionLevel.LEVEL_0_READ_ONLY,
            parameters: {
              type: 'object',
              properties: {
                text: { type: 'string', description: 'Input text to hash.' },
                algorithm: { type: 'string', description: 'md5 or sha256 (default: sha256).' },
              },
              required: ['text'],
            },
          },
        ],
      };

      fs.writeFileSync(manifestPath, JSON.stringify(starterManifest, null, 2), 'utf8');
    }
  }

  public async loadPlugins(): Promise<PluginManifest[]> {
    if (!fs.existsSync(this.pluginsDir)) return [];
    const entries = fs.readdirSync(this.pluginsDir, { withFileTypes: true });

    for (const entry of entries) {
      if (entry.isDirectory()) {
        const manifestPath = path.join(this.pluginsDir, entry.name, 'plugin.json');
        if (fs.existsSync(manifestPath)) {
          try {
            const raw = fs.readFileSync(manifestPath, 'utf8');
            const manifest: PluginManifest = JSON.parse(raw);
            this.loadedPlugins.set(manifest.id, manifest);

            // Register custom tools from plugin
            if (manifest.tools) {
              for (const tool of manifest.tools) {
                this.toolRegistry.registerTool(tool, async (params: any) => {
                  if (tool.name === 'calculate_hash') {
                    const crypto = await import('crypto');
                    const algo = params.algorithm || 'sha256';
                    const hash = crypto.createHash(algo).update(params.text).digest('hex');
                    return { algorithm: algo, hash };
                  }
                  return { executedPluginTool: tool.name, params };
                });
              }
            }
          } catch (err) {
            console.error(`Failed to load plugin from ${entry.name}:`, (err as Error).message);
          }
        }
      }
    }

    return Array.from(this.loadedPlugins.values());
  }

  public getLoadedPlugins(): PluginManifest[] {
    return Array.from(this.loadedPlugins.values());
  }
}
