import express from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import { PathShield } from './core/security/path_shield.js';
import { PermissionManager } from './core/security/permissions.js';
import { CredentialVault } from './core/credentials/vault.js';
import { ModelRegistry } from './core/models/registry.js';
import { ProviderGateway } from './core/gateway/gateway.js';
import { ModelRouter } from './core/router/router.js';
import { ToolRegistry } from './core/tools/registry.js';
import { registerFileAndCodeTools } from './core/tools/file_tools.js';
import { registerTerminalAndGitTools } from './core/tools/terminal_git_tools.js';
import { registerWebTools } from './core/tools/web_tools.js';
import { registerDataAndSqlTools } from './core/tools/data_sql_tools.js';
import { registerMediaAutomationDocTools } from './core/tools/media_automation_doc_tools.js';
import { WorkflowEngine } from './core/workflows/workflow_engine.js';
import { ContextEngine } from './core/context/context_engine.js';
import { VerificationEngine } from './core/verification/verifier.js';
import { TaskOrchestrator } from './core/orchestrator/orchestrator.js';
import { WorkspaceDatabase } from './core/db/db.js';

const app = express();
const PORT = process.env.PORT || 3001;
const WORKSPACE_ROOT = process.env.OMNI_WORKSPACE_ROOT || path.resolve(process.cwd());
const DATA_DIR = path.join(WORKSPACE_ROOT, '.omni-data');

app.use(cors());
app.use(express.json({ limit: '10mb' }));

// Core System Initialization
const pathShield = new PathShield(WORKSPACE_ROOT);
const permissionManager = new PermissionManager();
const credentialVault = new CredentialVault(DATA_DIR);
const modelRegistry = new ModelRegistry();
const providerGateway = new ProviderGateway(credentialVault);
const modelRouter = new ModelRouter(modelRegistry, providerGateway);
const toolRegistry = new ToolRegistry(permissionManager);
const workflowEngine = new WorkflowEngine();
const contextEngine = new ContextEngine(pathShield);
const verifier = new VerificationEngine(WORKSPACE_ROOT);
const workspaceDb = new WorkspaceDatabase(DATA_DIR);
const orchestrator = new TaskOrchestrator(toolRegistry, modelRouter, contextEngine, verifier);

// Register All Tools
registerFileAndCodeTools(toolRegistry, pathShield);
registerTerminalAndGitTools(toolRegistry, pathShield, WORKSPACE_ROOT);
registerWebTools(toolRegistry);
registerDataAndSqlTools(toolRegistry, pathShield, () => workspaceDb.getRawDatabase());
registerMediaAutomationDocTools(toolRegistry, pathShield, () => workflowEngine);

// --- REST & STREAMING API ENDPOINTS ---

// 1. Health & Status
app.get('/api/health', (req, res) => {
  res.json({
    status: 'online',
    version: '1.0.0',
    workspaceRoot: WORKSPACE_ROOT,
    toolCount: toolRegistry.getAllDefinitions().length,
    modelCount: modelRegistry.getAllModels().length,
    timestamp: new Date().toISOString(),
  });
});

// 2. Model & Provider Management
app.get('/api/models', (req, res) => {
  res.json({
    models: modelRegistry.getAllModels(),
    providers: modelRegistry.getAllProviders(),
  });
});

app.post('/api/models/:id/status', (req, res) => {
  const { enabled } = req.body;
  modelRegistry.updateModelStatus(req.params.id, Boolean(enabled));
  res.json({ success: true, modelId: req.params.id, enabled: Boolean(enabled) });
});

app.post('/api/models/:id/priority', (req, res) => {
  const { priority } = req.body;
  modelRegistry.setModelPriority(req.params.id, Number(priority));
  res.json({ success: true, modelId: req.params.id, priority: Number(priority) });
});

app.post('/api/providers/:id/test', async (req, res) => {
  const provider = modelRegistry.getProvider(req.params.id);
  if (!provider) {
    return res.status(404).json({ success: false, error: 'Provider not found' });
  }
  const testResult = await providerGateway.testProviderConnection(provider);
  res.json(testResult);
});

// 3. BYOK Secure Credential Vault
app.get('/api/vault/configured', (req, res) => {
  const list = credentialVault.listConfiguredProviders();
  res.json({ configuredSecrets: list });
});

app.post('/api/vault/secret', (req, res) => {
  const { name, secret } = req.body;
  if (!name) return res.status(400).json({ error: 'Secret name required' });
  credentialVault.setSecret(name, secret);
  res.json({ success: true, name });
});

app.delete('/api/vault/secret/:name', (req, res) => {
  credentialVault.deleteSecret(req.params.name);
  res.json({ success: true, deleted: req.params.name });
});

// 4. Universal Task Orchestration (SSE Stream)
app.post('/api/orchestrate/stream', async (req, res) => {
  const { prompt, agentType, activeFilePath } = req.body;
  if (!prompt) return res.status(400).json({ error: 'Prompt is required' });

  // Set SSE Headers
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  const sendEvent = (type: string, data: unknown) => {
    res.write(`event: ${type}\ndata: ${JSON.stringify(data)}\n\n`);
  };

  try {
    const classification = orchestrator.classifyTask(prompt);
    sendEvent('classification', classification);

    const result = await orchestrator.orchestrate(
      prompt,
      { workspacePath: WORKSPACE_ROOT, activeFilePath },
      agentType,
      (traceStep) => {
        sendEvent('trace', traceStep);
      },
      (chunk) => {
        if (chunk.content) {
          sendEvent('token', { delta: chunk.content });
        }
      }
    );

    sendEvent('done', {
      response: result.response,
      classification: result.classification,
      verification: result.verification,
    });
    res.end();
  } catch (err: any) {
    sendEvent('error', { error: err.message });
    res.end();
  }
});

// 5. Workspaces & Files
app.get('/api/workspace/files', async (req, res) => {
  const dirPath = (req.query.path as string) || '.';
  const tool = toolRegistry.getTool('list_directory');
  if (!tool) return res.status(500).json({ error: 'Tool not available' });
  try {
    const result = await tool.handler({ path: dirPath });
    res.json(result);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

app.get('/api/workspace/file', async (req, res) => {
  const filePath = req.query.path as string;
  if (!filePath) return res.status(400).json({ error: 'File path required' });
  const tool = toolRegistry.getTool('read_file');
  try {
    const result = await tool?.handler({ path: filePath });
    res.json(result);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

app.post('/api/workspace/file', async (req, res) => {
  const { path: filePath, content } = req.body;
  const tool = toolRegistry.getTool('write_file');
  try {
    const result = await tool?.handler({ path: filePath, content });
    res.json(result);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// 6. Terminal Execution
app.post('/api/terminal/run', async (req, res) => {
  const { command, timeoutMs } = req.body;
  const tool = toolRegistry.getTool('run_command');
  try {
    const result = await tool?.handler({ command, timeoutMs });
    res.json(result);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// 7. Git Operations
app.get('/api/git/status', async (req, res) => {
  const tool = toolRegistry.getTool('git_status');
  const result = await tool?.handler({});
  res.json(result);
});

app.get('/api/git/diff', async (req, res) => {
  const staged = req.query.staged as string;
  const tool = toolRegistry.getTool('git_diff');
  const result = await tool?.handler({ staged });
  res.json(result);
});

app.post('/api/git/stage', async (req, res) => {
  const { files } = req.body;
  const tool = toolRegistry.getTool('git_stage');
  const result = await tool?.handler({ files: files || '.' });
  res.json(result);
});

app.post('/api/git/commit', async (req, res) => {
  const { message } = req.body;
  const tool = toolRegistry.getTool('git_commit');
  const result = await tool?.handler({ message });
  res.json(result);
});

// 8. SQL Operations
app.get('/api/sql/schema', async (req, res) => {
  const tool = toolRegistry.getTool('inspect_schema');
  const result = await tool?.handler({});
  res.json(result);
});

app.post('/api/sql/query', async (req, res) => {
  const { query } = req.body;
  const tool = toolRegistry.getTool('execute_sql');
  try {
    const result = await tool?.handler({ query });
    res.json(result);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// 9. Workflows & Automations
app.get('/api/workflows', (req, res) => {
  res.json({ workflows: workflowEngine.getAllWorkflows() });
});

app.post('/api/workflows', (req, res) => {
  const wf = req.body;
  workflowEngine.saveWorkflow(wf);
  res.json({ success: true, workflow: wf });
});

app.post('/api/workflows/:id/run', async (req, res) => {
  try {
    const runResult = await workflowEngine.runWorkflow(req.params.id, req.body.payload || {});
    res.json(runResult);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

app.get('/api/workflows/:id/history', (req, res) => {
  res.json({ history: workflowEngine.getHistory(req.params.id) });
});

// 10. Audit Logs
app.get('/api/audit', (req, res) => {
  res.json({ auditLogs: toolRegistry.getAuditLogs() });
});

// Start listening
app.listen(PORT, () => {
  console.log(`[OmniWorkspace Core Server] Running on http://localhost:${PORT}`);
  console.log(`[OmniWorkspace] Root: ${WORKSPACE_ROOT}`);
});
