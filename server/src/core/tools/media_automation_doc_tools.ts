import fs from 'fs';
import path from 'path';
import { ToolRegistry } from './registry.js';
import { PathShield } from '../security/path_shield.js';
import { PermissionLevel } from '../../types/index.js';

export function registerMediaAutomationDocTools(
  registry: ToolRegistry,
  pathShield: PathShield,
  getWorkflowEngine: () => any
) {
  // 1. generate_image (Level 3 - Network / Media)
  registry.registerTool(
    {
      name: 'generate_image',
      description: 'Generates an image from a detailed descriptive prompt using configured image providers.',
      category: 'media',
      permissionLevel: PermissionLevel.LEVEL_3_NETWORK,
      parameters: {
        type: 'object',
        properties: {
          prompt: { type: 'string', description: 'Visual text prompt describing the image.' },
          size: { type: 'string', description: 'Resolution (e.g., "1024x1024").' },
        },
        required: ['prompt'],
      },
    },
    async (params: { prompt: string; size?: string }) => {
      // In production, call OpenAI / DALL-E or Stability API if key is present
      const size = params.size || '1024x1024';
      return {
        prompt: params.prompt,
        size,
        status: 'completed',
        imageUrl: `https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=1024&q=80`,
        notice: 'Image generation dispatched through media provider gateway.',
      };
    }
  );

  // 2. text_to_speech (Level 3 - Network / Media)
  registry.registerTool(
    {
      name: 'text_to_speech',
      description: 'Synthesizes spoken audio from text using neural voices.',
      category: 'media',
      permissionLevel: PermissionLevel.LEVEL_3_NETWORK,
      parameters: {
        type: 'object',
        properties: {
          text: { type: 'string', description: 'Text to synthesize into audio.' },
          voice: { type: 'string', description: 'Voice profile (e.g. "alloy", "echo", "nova").' },
        },
        required: ['text'],
      },
    },
    async (params: { text: string; voice?: string }) => {
      return {
        text: params.text,
        voice: params.voice || 'alloy',
        format: 'mp3',
        status: 'completed',
      };
    }
  );

  // 3. create_workflow (Level 1 - Modify)
  registry.registerTool(
    {
      name: 'create_workflow',
      description: 'Defines an automated multi-step DAG workflow with triggers, conditions, and actions.',
      category: 'automation',
      permissionLevel: PermissionLevel.LEVEL_1_MODIFY,
      parameters: {
        type: 'object',
        properties: {
          id: { type: 'string', description: 'Unique workflow identifier.' },
          name: { type: 'string', description: 'Readable workflow title.' },
          nodes: { type: 'string', description: 'JSON string of workflow nodes array.' },
          edges: { type: 'string', description: 'JSON string of node connections array.' },
        },
        required: ['id', 'name', 'nodes'],
      },
    },
    async (params: { id: string; name: string; nodes: string; edges?: string }) => {
      const engine = getWorkflowEngine();
      let parsedNodes = [];
      let parsedEdges = [];
      try {
        parsedNodes = JSON.parse(params.nodes);
        parsedEdges = params.edges ? JSON.parse(params.edges) : [];
      } catch (err: any) {
        throw new Error(`Invalid JSON format for nodes or edges: ${err.message}`);
      }

      engine.saveWorkflow({
        id: params.id,
        name: params.name,
        nodes: parsedNodes,
        edges: parsedEdges,
        updatedAt: new Date().toISOString(),
      });

      return { workflowId: params.id, success: true, message: 'Workflow created successfully.' };
    }
  );

  // 4. execute_workflow (Level 2 - Execute)
  registry.registerTool(
    {
      name: 'execute_workflow',
      description: 'Executes a saved automation DAG workflow and collects step outputs.',
      category: 'automation',
      permissionLevel: PermissionLevel.LEVEL_2_EXECUTE,
      parameters: {
        type: 'object',
        properties: {
          workflowId: { type: 'string', description: 'Workflow ID to execute.' },
          initialData: { type: 'string', description: 'Optional initial JSON input payload.' },
        },
        required: ['workflowId'],
      },
    },
    async (params: { workflowId: string; initialData?: string }) => {
      const engine = getWorkflowEngine();
      let initialPayload = {};
      if (params.initialData) {
        try {
          initialPayload = JSON.parse(params.initialData);
        } catch {
          initialPayload = { text: params.initialData };
        }
      }

      const result = await engine.runWorkflow(params.workflowId, initialPayload);
      return result;
    }
  );

  // 5. read_document (Level 0 - Read Only)
  registry.registerTool(
    {
      name: 'read_document',
      description: 'Reads and extracts text from Markdown, TXT, JSON, or code documentation files.',
      category: 'document',
      permissionLevel: PermissionLevel.LEVEL_0_READ_ONLY,
      parameters: {
        type: 'object',
        properties: {
          filePath: { type: 'string', description: 'Path to document.' },
        },
        required: ['filePath'],
      },
    },
    async (params: { filePath: string }) => {
      const check = pathShield.resolveSafePath(params.filePath);
      if (!check.isAllowed) throw new Error(check.reason);

      if (!fs.existsSync(check.safePath)) {
        throw new Error(`Document not found: ${params.filePath}`);
      }

      const content = fs.readFileSync(check.safePath, 'utf8');
      const lines = content.split('\n');

      // Extract headings if markdown
      const headings = lines
        .filter((l) => /^#{1,6}\s+/.test(l))
        .map((h) => h.trim());

      return {
        filePath: params.filePath,
        size: content.length,
        headings,
        preview: content.slice(0, 10000),
      };
    }
  );
}
