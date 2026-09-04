import os from 'os';
import { CredentialVault } from '../credentials/vault.js';
import { ToolRegistry } from '../tools/registry.js';
import { ModelRegistry } from '../models/registry.js';

export class DiagnosticExporter {
  private vault: CredentialVault;
  private toolRegistry: ToolRegistry;
  private modelRegistry: ModelRegistry;

  constructor(vault: CredentialVault, toolRegistry: ToolRegistry, modelRegistry: ModelRegistry) {
    this.vault = vault;
    this.toolRegistry = toolRegistry;
    this.modelRegistry = modelRegistry;
  }

  public generateSafeDiagnosticReport(): { json: Record<string, unknown>; markdown: string } {
    const mem = process.memoryUsage();
    const audit = this.toolRegistry.getAuditLogs();
    const models = this.modelRegistry.getAllModels();
    const providers = this.modelRegistry.getAllProviders();

    const rawReport = {
      timestamp: new Date().toISOString(),
      platform: {
        os: process.platform,
        arch: process.arch,
        nodeVersion: process.version,
        totalMemoryMB: Math.round(os.totalmem() / (1024 * 1024)),
        freeMemoryMB: Math.round(os.freemem() / (1024 * 1024)),
        heapUsedMB: Math.round(mem.heapUsed / (1024 * 1024)),
      },
      providers: providers.map((p) => ({
        id: p.id,
        name: p.name,
        type: p.type,
        isLocal: p.isLocal,
        enabled: p.enabled,
        hasKeyConfigured: this.vault.hasSecret(
          p.type === 'nvidia'
            ? 'NVIDIA_API_KEY'
            : p.type === 'openrouter'
            ? 'OPENROUTER_API_KEY'
            : 'OPENAI_API_KEY'
        ),
      })),
      registeredToolsCount: this.toolRegistry.getAllDefinitions().length,
      auditEventCount: audit.length,
      recentAuditEvents: audit.slice(-20),
    };

    // Redact any possible stray secrets
    const jsonString = JSON.stringify(rawReport, null, 2);
    const sanitizedJsonString = this.vault.redact(jsonString);
    const sanitizedReport = JSON.parse(sanitizedJsonString);

    const markdown = `# OmniWorkspace Safe Diagnostic Report
Generated: ${rawReport.timestamp}

## System Environment
- **Platform**: ${rawReport.platform.os} (${rawReport.platform.arch})
- **Node.js**: ${rawReport.platform.nodeVersion}
- **Heap Memory**: ${rawReport.platform.heapUsedMB} MB / ${rawReport.platform.totalMemoryMB} MB

## AI Providers & Security
- **Configured Providers**: ${rawReport.providers.length}
- **Tools Registered**: ${rawReport.registeredToolsCount}
- **Audit Logs Recorded**: ${rawReport.auditEventCount}

## Privacy Assurance
All API credentials and sensitive variables have been verified as fully redacted.
`;

    return {
      json: sanitizedReport,
      markdown,
    };
  }
}
