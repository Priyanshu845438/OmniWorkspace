import fs from 'fs';
import path from 'path';
import { ToolRegistry } from '../tools/registry.js';
import { ModelRegistry } from '../models/registry.js';
import { ToolDefinition, PermissionLevel } from '../../types/index.js';

export interface PluginPermissions {
  readWorkspace?: boolean;
  writeWorkspace?: boolean;
  network?: boolean;
  terminal?: boolean;
  database?: boolean;
  credentials?: boolean;
}

export interface PluginManifest {
  id: string;
  name: string;
  version: string;
  description: string;
  author?: string;
  permissions?: PluginPermissions;
  isApproved?: boolean;
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
  private pendingApprovalPlugins: Map<string, PluginManifest> = new Map();

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
        permissions: {
          readWorkspace: true,
          writeWorkspace: false,
          network: false,
          terminal: false,
          database: false,
          credentials: false,
        },
        isApproved: true,
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

  /**
   * Validates plugin manifest structure and elevated permission requirements.
   */
  public validatePlugin(manifest: PluginManifest): { valid: boolean; reason?: string; requiresElevation: boolean } {
    if (!manifest.id || !/^[a-zA-Z0-9_-]+$/.test(manifest.id)) {
      return { valid: false, reason: 'Invalid plugin id: must be alphanumeric characters and dashes only.', requiresElevation: false };
    }
    if (!manifest.name || !manifest.version) {
      return { valid: false, reason: 'Plugin must specify a name and version.', requiresElevation: false };
    }

    const perms = manifest.permissions || {};
    const requiresElevation = Boolean(
      perms.terminal || perms.database || perms.writeWorkspace || perms.credentials
    );

    return { valid: true, requiresElevation };
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

            const validation = this.validatePlugin(manifest);
            if (!validation.valid) {
              console.warn(`[PluginManager] Rejected plugin ${entry.name}: ${validation.reason}`);
              continue;
            }

            // If plugin requires elevated permissions and is not explicitly approved, withhold execution
            if (validation.requiresElevation && !manifest.isApproved) {
              this.pendingApprovalPlugins.set(manifest.id, manifest);
              console.warn(`[PluginManager] Plugin '${manifest.id}' requires elevated permissions and awaits user approval.`);
              continue;
            }

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

  public approvePlugin(pluginId: string): boolean {
    const pending = this.pendingApprovalPlugins.get(pluginId);
    if (!pending) return false;

    pending.isApproved = true;
    this.pendingApprovalPlugins.delete(pluginId);
    this.loadedPlugins.set(pluginId, pending);

    if (pending.tools) {
      for (const tool of pending.tools) {
        this.toolRegistry.registerTool(tool, async (params: any) => {
          return { executedPluginTool: tool.name, params };
        });
      }
    }
    return true;
  }

  public revokePlugin(pluginId: string): boolean {
    const loaded = this.loadedPlugins.get(pluginId);
    if (!loaded) return false;

    loaded.isApproved = false;
    this.loadedPlugins.delete(pluginId);
    this.pendingApprovalPlugins.set(pluginId, loaded);
    return true;
  }

  public getLoadedPlugins(): PluginManifest[] {
    return Array.from(this.loadedPlugins.values());
  }

  public getPendingPlugins(): PluginManifest[] {
    return Array.from(this.pendingApprovalPlugins.values());
  }
}
