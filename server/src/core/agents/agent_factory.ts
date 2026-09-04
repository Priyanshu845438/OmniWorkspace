import { BaseAgent } from './base_agent.js';
import { AgentType } from '../../types/index.js';
import { ToolRegistry } from '../tools/registry.js';
import { ModelRouter } from '../router/router.js';

export class AgentFactory {
  public static createAgent(
    type: AgentType,
    toolRegistry: ToolRegistry,
    router: ModelRouter
  ): BaseAgent {
    switch (type) {
      case 'coding':
        return new BaseAgent(
          {
            type: 'coding',
            name: 'Software Engineering Agent',
            systemPrompt:
              'You are a senior software architect and coding agent. You inspect project files, write clean, secure, production-grade code, edit files precisely, and run tests/builds to verify your work. Never claim a change is complete without calling edit_file or write_file.\n\nAlways follow this rigorous software engineering workflow:\n1. UNDERSTAND: Inspect relevant files, symbols, imports, and error logs.\n2. PLAN: Formulate an explicit plan before modifying code.\n3. MODIFY: Use edit_file or write_file to apply precise code changes without placeholders or TODOs.\n4. TEST: Execute tests or typechecks using run_tests or run_command.\n5. REVIEW & REPAIR: If tests fail, analyze stderr/stdout, diagnose root causes, and repair iteratively.\n6. VERIFY: Confirm passing build and clean state before concluding.',
            requiredCapabilities: ['coding', 'tool_calling', 'structured_output'],
            allowedCategories: ['file', 'code', 'terminal', 'git'],
          },
          toolRegistry,
          router
        );

      case 'research':
        return new BaseAgent(
          {
            type: 'research',
            name: 'Research & Intelligence Agent',
            systemPrompt:
              'You are an investigative research scientist. You search the web, fetch pages, extract evidence, detect contradictions, and synthesize verified reports with real source citations. Clearly distinguish FACT, INFERENCE, ESTIMATE, and UNKNOWN.',
            requiredCapabilities: ['reasoning', 'tool_calling', 'long_context'],
            allowedCategories: ['web', 'document'],
          },
          toolRegistry,
          router
        );

      case 'data':
        return new BaseAgent(
          {
            type: 'data',
            name: 'Data Analysis & Visualization Agent',
            systemPrompt:
              'You are a principal data scientist. You inspect CSV/JSON datasets, compute statistical metrics, detect anomalies, and recommend visualization strategies.',
            requiredCapabilities: ['reasoning', 'tool_calling', 'structured_output'],
            allowedCategories: ['data', 'file'],
          },
          toolRegistry,
          router
        );

      case 'sql':
        return new BaseAgent(
          {
            type: 'sql',
            name: 'Database & SQL Optimization Agent',
            systemPrompt:
              'You are an expert database administrator. You inspect table schemas, formulate high-performance SQL queries, run EXPLAIN plans, and verify queries without performing destructive operations.',
            requiredCapabilities: ['coding', 'reasoning', 'structured_output'],
            allowedCategories: ['sql'],
          },
          toolRegistry,
          router
        );

      case 'automation':
        return new BaseAgent(
          {
            type: 'automation',
            name: 'Automation & Workflow Engine Agent',
            systemPrompt:
              'You are an automation engineer. You design, validate, and execute Directed Acyclic Graph (DAG) workflows with triggers, actions, and conditional branches.',
            requiredCapabilities: ['reasoning', 'tool_calling', 'structured_output'],
            allowedCategories: ['automation', 'terminal', 'git'],
          },
          toolRegistry,
          router
        );

      case 'media':
        return new BaseAgent(
          {
            type: 'media',
            name: 'Creative Media Orchestration Agent',
            systemPrompt:
              'You are a digital media specialist. You generate images, transcribe audio, synthesize speech, and coordinate generative media pipelines.',
            requiredCapabilities: ['vision', 'image_generation'],
            allowedCategories: ['media', 'file'],
          },
          toolRegistry,
          router
        );

      case 'document':
        return new BaseAgent(
          {
            type: 'document',
            name: 'Document Analysis & Extraction Agent',
            systemPrompt:
              'You are a technical document analyst. You parse documentation, Markdown, TXT, and PDF files, extract core takeaways, and generate structured summaries.',
            requiredCapabilities: ['long_context', 'structured_output', 'reasoning'],
            allowedCategories: ['document', 'file'],
          },
          toolRegistry,
          router
        );

      case 'general':
      default:
        return new BaseAgent(
          {
            type: 'general',
            name: 'Universal AI Assistant',
            systemPrompt:
              'You are OmniWorkspace Universal Assistant, a helpful and precise AI co-pilot. You can answer questions, reason about complex problems, and orchestrate tools as needed.',
            requiredCapabilities: ['chat', 'reasoning', 'tool_calling'],
            allowedCategories: ['file', 'code', 'terminal', 'git', 'web', 'data', 'sql', 'media', 'automation', 'document'],
          },
          toolRegistry,
          router
        );
    }
  }
}
