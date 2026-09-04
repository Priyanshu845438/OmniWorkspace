import { describe, it, expect } from 'vitest';
import { ToolRegistry } from '../server/src/core/tools/registry.js';
import { registerDataAndSqlTools } from '../server/src/core/tools/data_sql_tools.js';
import { registerWebTools } from '../server/src/core/tools/web_tools.js';
import { PermissionManager } from '../server/src/core/security/permissions.js';
import { PathShield } from '../server/src/core/security/path_shield.js';
import { PluginManager, PluginManifest } from '../server/src/core/plugins/plugin_manager.js';
import { ModelRegistry } from '../server/src/core/models/registry.js';
import { DatabaseSync } from 'node:sqlite';
import os from 'os';
import path from 'path';

describe('Security Hardening & Boundary Enforcement', () => {
  const root = path.join(os.tmpdir(), 'omni-test-sec-' + Math.random().toString(36).slice(2));
  const pathShield = new PathShield(root);
  const pm = new PermissionManager();
  const toolRegistry = new ToolRegistry(pm);
  const modelRegistry = new ModelRegistry();

  // In-memory test SQLite DB
  const db = new DatabaseSync(':memory:');
  db.exec('CREATE TABLE test_users (id INTEGER PRIMARY KEY, username TEXT);');
  db.exec("INSERT INTO test_users (username) VALUES ('alice'), ('bob');");

  registerDataAndSqlTools(toolRegistry, pathShield, () => db);
  registerWebTools(toolRegistry);

  it('allows safe read and write queries against database', async () => {
    const executeSql = toolRegistry.getTool('execute_sql');
    expect(executeSql).toBeDefined();

    const readResult = (await executeSql!.handler({ query: 'SELECT * FROM test_users;' })) as any;
    expect(readResult.operationType).toBe('READ');
    expect(readResult.rowCount).toBe(2);
    expect(readResult.rows[0].username).toBe('alice');
  });

  it('blocks destructive SQL without explicit confirmation', async () => {
    const executeSql = toolRegistry.getTool('execute_sql');
    expect(executeSql).toBeDefined();

    // 1. DROP TABLE without isUserConfirmed
    await expect(
      executeSql!.handler({ query: 'DROP TABLE test_users;' })
    ).rejects.toThrow(/DESTRUCTIVE OPERATION BLOCKED/);

    // 2. Unconstrained DELETE without WHERE
    await expect(
      executeSql!.handler({ query: 'DELETE FROM test_users;' })
    ).rejects.toThrow(/DESTRUCTIVE OPERATION BLOCKED/);

    // 3. Destructive query succeeds when isUserConfirmed === true
    const confirmedResult = (await executeSql!.handler({
      query: 'DELETE FROM test_users;',
      isUserConfirmed: true,
    })) as any;
    expect(confirmedResult.operationType).toBe('DESTRUCTIVE');
    expect(confirmedResult.success).toBe(true);
  });

  it('blocks SSRF attempts in web fetching tools', async () => {
    const fetchPage = toolRegistry.getTool('fetch_page');
    expect(fetchPage).toBeDefined();

    // Loopback
    await expect(fetchPage!.handler({ url: 'http://127.0.0.1:8080/secret' })).rejects.toThrow(/SSRF Guard/);
    await expect(fetchPage!.handler({ url: 'http://localhost/admin' })).rejects.toThrow(/SSRF Guard/);

    // Link-local / Cloud metadata endpoint
    await expect(fetchPage!.handler({ url: 'http://169.254.169.254/metadata' })).rejects.toThrow(/SSRF Guard/);

    // Private network RFC 1918 addresses
    await expect(fetchPage!.handler({ url: 'http://10.0.0.1/internal' })).rejects.toThrow(/SSRF Guard/);
    await expect(fetchPage!.handler({ url: 'http://192.168.1.1/router' })).rejects.toThrow(/SSRF Guard/);

    // Unsupported protocol
    await expect(fetchPage!.handler({ url: 'file:///etc/passwd' })).rejects.toThrow(/SSRF Guard/);
  });

  it('validates plugin permissions and gates elevated access', () => {
    const pluginManager = new PluginManager(root, toolRegistry, modelRegistry);

    // Standard plugin without elevated privileges
    const safeManifest: PluginManifest = {
      id: 'safe-plugin',
      name: 'Safe Plugin',
      version: '1.0.0',
      description: 'ReadOnly plugin',
      permissions: { readWorkspace: true, terminal: false, database: false },
    };
    const safeCheck = pluginManager.validatePlugin(safeManifest);
    expect(safeCheck.valid).toBe(true);
    expect(safeCheck.requiresElevation).toBe(false);

    // Elevated plugin requesting terminal & database
    const elevatedManifest: PluginManifest = {
      id: 'elevated-plugin',
      name: 'System Admin Plugin',
      version: '2.0.0',
      description: 'Requires shell execution',
      permissions: { readWorkspace: true, terminal: true, database: true },
    };
    const elevatedCheck = pluginManager.validatePlugin(elevatedManifest);
    expect(elevatedCheck.valid).toBe(true);
    expect(elevatedCheck.requiresElevation).toBe(true);

    // Path traversal in plugin ID
    const maliciousManifest: PluginManifest = {
      id: '../../malicious-escape',
      name: 'Exploit',
      version: '1.0.0',
      description: 'Path traversal attempt',
    };
    const maliciousCheck = pluginManager.validatePlugin(maliciousManifest);
    expect(maliciousCheck.valid).toBe(false);
  });
});
