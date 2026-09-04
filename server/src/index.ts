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
import { ProjectIndexer } from './core/intelligence/project_indexer.js';
import { PluginManager } from './core/plugins/plugin_manager.js';
import { MultiModelPipeline } from './core/orchestrator/multi_model.js';
import { DiagnosticExporter } from './core/diagnostics/exporter.js';

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
const projectIndexer = new ProjectIndexer(WORKSPACE_ROOT, pathShield);
const pluginManager = new PluginManager(WORKSPACE_ROOT, toolRegistry, modelRegistry);
const multiModelPipeline = new MultiModelPipeline(modelRouter, toolRegistry, verifier);
const diagnosticExporter = new DiagnosticExporter(credentialVault, toolRegistry, modelRegistry);

// Load third-party plugins on boot
pluginManager.loadPlugins().catch(console.error);

// Register All Tools
registerFileAndCodeTools(toolRegistry, pathShield);
registerTerminalAndGitTools(toolRegistry, pathShield, WORKSPACE_ROOT);
registerWebTools(toolRegistry);
registerDataAndSqlTools(toolRegistry, pathShield, () => workspaceDb.getRawDatabase());
registerMediaAutomationDocTools(toolRegistry, pathShield, () => workflowEngine);

// --- REST & STREAMING API ENDPOINTS ---

// 1. Health & Status
app.get('/healthz', (_req, res) => res.status(200).send('OK'));

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
const activeTasks = new Map<string, AbortController>();

app.post('/api/orchestrate/stream', async (req, res) => {
  const { prompt, agentType, activeFilePath, taskId: requestedTaskId } = req.body;
  if (!prompt) return res.status(400).json({ error: 'Prompt is required' });

  const taskId = requestedTaskId || `task_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const abortController = new AbortController();
  activeTasks.set(taskId, abortController);

  // Set SSE Headers
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  const sendEvent = (type: string, data: unknown) => {
    if (!res.writableEnded) {
      res.write(`event: ${type}\ndata: ${JSON.stringify(data)}\n\n`);
    }
  };

  sendEvent('init', { taskId });

  const onClose = () => {
    if (!res.writableEnded && !abortController.signal.aborted) {
      abortController.abort();
    }
  };
  req.on('close', onClose);

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
      },
      abortController.signal
    );

    sendEvent('done', {
      taskId,
      response: result.response,
      classification: result.classification,
      verification: result.verification,
    });
    res.end();
  } catch (err: any) {
    if (abortController.signal.aborted || err?.message?.includes('aborted') || err?.name === 'AbortError') {
      sendEvent('cancelled', { taskId, reason: 'Execution cancelled by user' });
    } else {
      console.error(`[Orchestrate Error] Task ${taskId}:`, err.message || err);
      sendEvent('error', { taskId, error: err.message || 'Execution error' });
    }
    res.end();
  } finally {
    req.off('close', onClose);
    activeTasks.delete(taskId);
  }
});

app.post('/api/orchestrate/cancel', (req, res) => {
  const { taskId } = req.body;
  if (!taskId) {
    return res.status(400).json({ error: 'taskId is required' });
  }

  const controller = activeTasks.get(taskId);
  if (controller) {
    controller.abort();
    activeTasks.delete(taskId);
    return res.json({ success: true, cancelled: taskId });
  }

  return res.json({ success: true, message: 'Task not running or already completed', taskId });
});

// Direct Chat & Dual-Model Arena execution endpoint
app.post('/api/chat', async (req, res) => {
  const { prompt, model, messages } = req.body;
  if (!prompt && (!messages || messages.length === 0)) {
    return res.status(400).json({ error: 'prompt or messages required' });
  }

  const chatMessages = messages || [{ role: 'user', content: prompt }];

  try {
    const allModels = modelRegistry.getAllModels();
    let selectedModel = model
      ? allModels.find((m) => m.id === model || m.name.toLowerCase() === model.toLowerCase())
      : null;
    let provider = selectedModel
      ? modelRegistry.getAllProviders().find((p) => p.type === selectedModel!.provider || p.id === selectedModel!.provider)
      : null;

    if (!selectedModel || !provider) {
      const route = modelRouter.selectRoute(['chat']);
      selectedModel = route.model;
      provider = route.provider;
    }

    let fullContent = '';
    const result = await providerGateway.streamChat(
      selectedModel,
      provider,
      chatMessages,
      [],
      (chunk: any) => {
        if (chunk.content) fullContent += chunk.content;
      }
    );

    res.json({
      model: selectedModel.id,
      provider: provider.name,
      content: result.content || fullContent,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Chat generation failed' });
  }
});

// Deep Research & Live Web Search endpoint
app.post('/api/research/search', async (req, res) => {
  const { query, numResults } = req.body;
  if (!query) return res.status(400).json({ error: 'Query is required' });

  const tool = toolRegistry.getTool('web_search');
  if (!tool) return res.status(500).json({ error: 'Web search tool is unavailable' });

  try {
    const result = await tool.handler({ query, numResults: numResults ? String(numResults) : '5' });
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
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
  const { query, isUserConfirmed } = req.body;
  const tool = toolRegistry.getTool('execute_sql');
  try {
    const result = await tool?.handler({ query, isUserConfirmed });
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
    const isDryRun = Boolean(req.body.isDryRun);
    const runResult = await workflowEngine.runWorkflow(req.params.id, req.body.payload || {}, isDryRun);
    res.json(runResult);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

app.get('/api/workflows/:id/history', (req, res) => {
  res.json({ history: workflowEngine.getHistory(req.params.id) });
});

// 10. Audit Logs & Observability
app.get('/api/audit', (req, res) => {
  res.json({ auditLogs: toolRegistry.getAuditLogs() });
});

// 11. Project Architecture & Graph Explorer
app.get('/api/workspace/architecture', async (req, res) => {
  try {
    const force = req.query.refresh === 'true';
    const graph = await projectIndexer.indexProject(force);
    res.json(graph);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 12. Extensible Plugin Registry
app.get('/api/plugins', (req, res) => {
  res.json({ plugins: pluginManager.getLoadedPlugins() });
});

// 13. Multi-Model Collaborative Pipeline
app.post('/api/orchestrate/collaborative', async (req, res) => {
  const { prompt, context } = req.body;
  if (!prompt) return res.status(400).json({ error: 'Prompt is required' });

  try {
    const result = await multiModelPipeline.executeCollaborativePipeline(prompt, context || '');
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 14. Plugin Management & Permissions
app.get('/api/plugins', (req, res) => {
  res.json({
    loaded: pluginManager.getLoadedPlugins(),
    pending: pluginManager.getPendingPlugins(),
  });
});

app.post('/api/plugins/:id/approve', (req, res) => {
  const success = pluginManager.approvePlugin(req.params.id);
  res.json({ success, pluginId: req.params.id });
});

app.post('/api/plugins/:id/revoke', (req, res) => {
  const success = pluginManager.revokePlugin(req.params.id);
  res.json({ success, pluginId: req.params.id });
});

// 15. Safe Redacted Diagnostic Export
app.get('/api/diagnostics/export', (req, res) => {
  const report = diagnosticExporter.generateSafeDiagnosticReport();
  res.json(report);
});

// 16. Serve Production Frontend if Built
const clientDistCandidates = [
  path.resolve(__dirname, '../dist-client'),
  path.resolve(__dirname, '../../dist-client'),
  path.join(process.cwd(), 'dist-client'),
  path.join(WORKSPACE_ROOT, 'dist-client'),
  '/app/dist-client',
  '/app/workspace/dist-client',
];
const clientDist = clientDistCandidates.find(
  (dir) => fs.existsSync(dir) && fs.existsSync(path.join(dir, 'index.html'))
);

if (clientDist) {
  console.log(`[OmniWorkspace] Serving static production client from: ${clientDist}`);
  app.use(express.static(clientDist));
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api') || req.path === '/healthz') return next();
    res.sendFile(path.join(clientDist, 'index.html'));
  });
} else {
  console.warn('[OmniWorkspace] Production client directory (dist-client) not found. Checked:', clientDistCandidates);
}

// Start listening
app.listen(PORT, () => {
  console.log(`[OmniWorkspace Core Server] Running on http://localhost:${PORT}`);
  console.log(`[OmniWorkspace] Root: ${WORKSPACE_ROOT}`);
});
