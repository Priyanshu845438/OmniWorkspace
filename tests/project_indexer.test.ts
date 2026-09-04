import { describe, it, expect } from 'vitest';
import path from 'path';
import { ProjectIndexer } from '../server/src/core/intelligence/project_indexer.js';
import { PathShield } from '../server/src/core/security/path_shield.js';
import { PluginManager } from '../server/src/core/plugins/plugin_manager.js';
import { ToolRegistry } from '../server/src/core/tools/registry.js';
import { ModelRegistry } from '../server/src/core/models/registry.js';
import { PermissionManager } from '../server/src/core/security/permissions.js';

describe('Project Intelligence Indexer & Plugin Manager', () => {
  const root = path.resolve(process.cwd());
  const pathShield = new PathShield(root);
  const indexer = new ProjectIndexer(root, pathShield);

  it('indexes project files, counts symbols, and builds dependency graph', async () => {
    const graph = await indexer.indexProject(true);
    expect(graph.summary.totalFiles).toBeGreaterThan(10);
    expect(graph.summary.totalSymbols).toBeGreaterThan(20);
    expect(graph.nodes.length).toBeGreaterThan(10);
    expect(graph.edges.length).toBeGreaterThan(5);
    expect(Array.isArray(graph.circularDependencies)).toBe(true);
  });

  it('loads plugin manifests and registers third-party tools', async () => {
    const pm = new PermissionManager();
    const toolRegistry = new ToolRegistry(pm);
    const modelRegistry = new ModelRegistry();
    const pluginManager = new PluginManager(root, toolRegistry, modelRegistry);

    const plugins = await pluginManager.loadPlugins();
    expect(plugins.length).toBeGreaterThan(0);
    expect(plugins[0].id).toBe('sample-custom-tools');

    const customTool = toolRegistry.getTool('calculate_hash');
    expect(customTool).toBeDefined();

    const toolResult = await toolRegistry.executeTool({
      id: 'tc_1',
      toolName: 'calculate_hash',
      parameters: { text: 'hello world', algorithm: 'sha256' },
    });
    expect(toolResult.success).toBe(true);
    expect((toolResult.data as any).hash).toBe(
      'b94d27b9934d3e08a52e52d7da7dabfac484efe37a5380ee9088f7ace2efcde9'
    );
  });
});
