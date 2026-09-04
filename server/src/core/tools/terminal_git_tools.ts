import { exec, spawn } from 'child_process';
import { promisify } from 'util';
import { ToolRegistry } from './registry.js';
import { CommandShield } from '../security/cmd_shield.js';
import { PathShield } from '../security/path_shield.js';
import { PermissionLevel } from '../../types/index.js';

const execAsync = promisify(exec);

export function registerTerminalAndGitTools(
  registry: ToolRegistry,
  pathShield: PathShield,
  workspaceRoot: string
) {
  // 1. run_command (Level 2 - Execute)
  registry.registerTool(
    {
      name: 'run_command',
      description: 'Executes a terminal shell command in the project workspace with security guards and output limits.',
      category: 'terminal',
      permissionLevel: PermissionLevel.LEVEL_2_EXECUTE,
      parameters: {
        type: 'object',
        properties: {
          command: { type: 'string', description: 'Shell command line to execute.' },
          timeoutMs: { type: 'string', description: 'Execution timeout in milliseconds (default: 30000).' },
        },
        required: ['command'],
      },
    },
    async (params: { command: string; timeoutMs?: string }, signal?: AbortSignal) => {
      const risk = CommandShield.analyzeCommand(params.command);
      if (risk.isBlocked) {
        throw new Error(`SECURITY BLOCKED: ${risk.reason}`);
      }

      const timeout = Number(params.timeoutMs) || 30000;
      const cwd = workspaceRoot;

      return new Promise((resolve, reject) => {
        const child = exec(
          params.command,
          {
            cwd,
            timeout,
            maxBuffer: 1024 * 1024, // 1MB output buffer
            env: { ...process.env, CI: 'true' },
          },
          (error, stdout, stderr) => {
            if (error && error.killed) {
              reject(new Error(`Command timed out after ${timeout}ms`));
              return;
            }

            const truncatedStdout = stdout.length > 50000 ? stdout.slice(0, 50000) + '\n... [Output Truncated]' : stdout;
            const truncatedStderr = stderr.length > 50000 ? stderr.slice(0, 50000) + '\n... [Stderr Truncated]' : stderr;

            resolve({
              command: params.command,
              exitCode: error ? error.code || 1 : 0,
              stdout: truncatedStdout,
              stderr: truncatedStderr,
              success: !error,
            });
          }
        );

        if (signal) {
          signal.addEventListener('abort', () => {
            child.kill('SIGTERM');
            reject(new Error('Command execution aborted by user.'));
          });
        }
      });
    }
  );

  // 2. run_tests (Level 2 - Execute)
  registry.registerTool(
    {
      name: 'run_tests',
      description: 'Executes the automated test suite and reports test results.',
      category: 'terminal',
      permissionLevel: PermissionLevel.LEVEL_2_EXECUTE,
      parameters: {
        type: 'object',
        properties: {
          testFilter: { type: 'string', description: 'Optional test filter pattern.' },
        },
      },
    },
    async (params: { testFilter?: string }) => {
      const cmd = params.testFilter ? `npm test -- ${params.testFilter}` : 'npm test';
      try {
        const { stdout, stderr } = await execAsync(cmd, { cwd: workspaceRoot, timeout: 60000 });
        return { success: true, stdout, stderr };
      } catch (err: any) {
        return {
          success: false,
          exitCode: err.code || 1,
          stdout: err.stdout || '',
          stderr: err.stderr || err.message,
        };
      }
    }
  );

  // 3. git_status (Level 0 - Read Only)
  registry.registerTool(
    {
      name: 'git_status',
      description: 'Inspects repository Git status: branch name, modified, staged, and untracked files.',
      category: 'git',
      permissionLevel: PermissionLevel.LEVEL_0_READ_ONLY,
      parameters: {
        type: 'object',
        properties: {},
      },
    },
    async () => {
      try {
        const { stdout: branch } = await execAsync('git rev-parse --abbrev-ref HEAD', { cwd: workspaceRoot });
        const { stdout: status } = await execAsync('git status --short', { cwd: workspaceRoot });
        return {
          branch: branch.trim(),
          isClean: status.trim().length === 0,
          statusSummary: status.trim() || 'Working tree clean',
        };
      } catch (err: any) {
        return { isGitRepo: false, error: 'Not a git repository or git not available.' };
      }
    }
  );

  // 4. git_diff (Level 0 - Read Only)
  registry.registerTool(
    {
      name: 'git_diff',
      description: 'Shows unstaged or staged git diff for code review.',
      category: 'git',
      permissionLevel: PermissionLevel.LEVEL_0_READ_ONLY,
      parameters: {
        type: 'object',
        properties: {
          staged: { type: 'string', description: 'Set to "true" to view staged diff.' },
        },
      },
    },
    async (params: { staged?: string }) => {
      const cmd = params.staged === 'true' ? 'git diff --cached' : 'git diff';
      try {
        const { stdout } = await execAsync(cmd, { cwd: workspaceRoot, maxBuffer: 1024 * 1024 });
        return {
          diff: stdout.length > 50000 ? stdout.slice(0, 50000) + '\n... [Diff truncated]' : stdout || 'No diff',
        };
      } catch (err: any) {
        return { error: err.message };
      }
    }
  );

  // 5. git_stage (Level 1 - Modify)
  registry.registerTool(
    {
      name: 'git_stage',
      description: 'Stages specified files or all changes for commit.',
      category: 'git',
      permissionLevel: PermissionLevel.LEVEL_1_MODIFY,
      parameters: {
        type: 'object',
        properties: {
          files: { type: 'string', description: 'Files to stage (space separated or "." for all).' },
        },
        required: ['files'],
      },
    },
    async (params: { files: string }) => {
      const { stdout, stderr } = await execAsync(`git add ${params.files}`, { cwd: workspaceRoot });
      return { staged: true, stdout, stderr };
    }
  );

  // 6. git_commit (Level 1 - Modify)
  registry.registerTool(
    {
      name: 'git_commit',
      description: 'Creates a Git commit with the staged changes.',
      category: 'git',
      permissionLevel: PermissionLevel.LEVEL_1_MODIFY,
      parameters: {
        type: 'object',
        properties: {
          message: { type: 'string', description: 'Commit message.' },
        },
        required: ['message'],
      },
    },
    async (params: { message: string }) => {
      const sanitized = params.message.replace(/"/g, '\\"');
      const { stdout } = await execAsync(`git commit -m "${sanitized}"`, { cwd: workspaceRoot });
      return { committed: true, output: stdout.trim() };
    }
  );
}
