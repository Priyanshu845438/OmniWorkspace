import { describe, it, expect } from 'vitest';
import os from 'os';
import path from 'path';
import { DiagnosticExporter } from '../server/src/core/diagnostics/exporter.js';
import { CredentialVault } from '../server/src/core/credentials/vault.js';
import { ToolRegistry } from '../server/src/core/tools/registry.js';
import { ModelRegistry } from '../server/src/core/models/registry.js';
import { PermissionManager } from '../server/src/core/security/permissions.js';

describe('DiagnosticExporter & Safe Observability', () => {
  const root = path.join(os.tmpdir(), 'omni-diag-test-' + Math.random().toString(36).slice(2));
  const vault = new CredentialVault(root);
  const pm = new PermissionManager();
  const toolRegistry = new ToolRegistry(pm);
  const modelRegistry = new ModelRegistry();
  const exporter = new DiagnosticExporter(vault, toolRegistry, modelRegistry);

  it('generates a clean diagnostic report with system and provider metrics', () => {
    vault.setSecret('OPENAI_API_KEY', 'sk-proj-test1234567890abcdefghijklmnop');
    const report = exporter.generateSafeDiagnosticReport();

    expect(report.json).toBeDefined();
    expect(report.markdown).toBeDefined();
    expect((report.json as any).platform.nodeVersion).toBeDefined();

    // Verify secret scrubbing
    const serialized = JSON.stringify(report.json);
    expect(serialized).not.toContain('sk-proj-test1234567890abcdefghijklmnop');
  });
});
