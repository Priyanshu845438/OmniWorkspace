import fs from 'fs';
import path from 'path';
import { ExecutionContext } from '../../types/index.js';
import { PathShield } from '../security/path_shield.js';

export interface FormattedContextItem {
  id: string;
  type: 'active_file' | 'open_tab' | 'pinned_symbol' | 'git_status' | 'terminal_output';
  title: string;
  content: string;
  isPinned?: boolean;
  tokenEstimate: number;
}

export class ContextEngine {
  private pathShield: PathShield;
  private pinnedItems: Map<string, FormattedContextItem> = new Map();

  constructor(pathShield: PathShield) {
    this.pathShield = pathShield;
  }

  public pinItem(item: FormattedContextItem) {
    this.pinnedItems.set(item.id, { ...item, isPinned: true });
  }

  public unpinItem(id: string) {
    this.pinnedItems.delete(id);
  }

  public getPinnedItems(): FormattedContextItem[] {
    return Array.from(this.pinnedItems.values());
  }

  public clearPinned() {
    this.pinnedItems.clear();
  }

  /**
   * Builds an aggregated, token-budgeted prompt context block for AI reasoning.
   */
  public assembleContext(
    currentCtx: ExecutionContext,
    maxTokenBudget: number = 8000
  ): { contextString: string; items: FormattedContextItem[]; totalTokens: number } {
    const items: FormattedContextItem[] = [];

    // 1. Include pinned items first
    for (const pinned of this.pinnedItems.values()) {
      items.push(pinned);
    }

    // 2. Active file content if provided
    if (currentCtx.activeFilePath) {
      const check = this.pathShield.resolveSafePath(currentCtx.activeFilePath);
      if (check.isAllowed && fs.existsSync(check.safePath) && !this.pathShield.isSensitiveFile(check.safePath)) {
        try {
          const content = fs.readFileSync(check.safePath, 'utf8');
          const tokens = Math.ceil(content.length / 4);
          items.push({
            id: `active_${currentCtx.activeFilePath}`,
            type: 'active_file',
            title: `Active File: ${path.basename(currentCtx.activeFilePath)}`,
            content: content.slice(0, 16000), // Cap at 16k chars
            tokenEstimate: tokens,
          });
        } catch {
          // ignore read error
        }
      }
    }

    // 3. Git branch/status if present
    if (currentCtx.gitBranch) {
      items.push({
        id: 'git_branch',
        type: 'git_status',
        title: 'Git Branch',
        content: `Current Git branch: ${currentCtx.gitBranch}`,
        tokenEstimate: 10,
      });
    }

    // 4. Recent terminal output if present
    if (currentCtx.recentTerminalOutput) {
      const tokens = Math.ceil(currentCtx.recentTerminalOutput.length / 4);
      items.push({
        id: 'terminal_recent',
        type: 'terminal_output',
        title: 'Recent Terminal Output',
        content: currentCtx.recentTerminalOutput.slice(-3000),
        tokenEstimate: tokens,
      });
    }

    // Budget enforcement
    let runningTokens = 0;
    const budgetedItems: FormattedContextItem[] = [];

    for (const item of items) {
      if (runningTokens + item.tokenEstimate <= maxTokenBudget) {
        budgetedItems.push(item);
        runningTokens += item.tokenEstimate;
      }
    }

    // Assemble text representation
    let contextString = '';
    if (budgetedItems.length > 0) {
      contextString += '\n=== WORKSPACE CONTEXT ===\n';
      for (const item of budgetedItems) {
        contextString += `\n[${item.title}]\n${item.content}\n`;
      }
      contextString += '=== END WORKSPACE CONTEXT ===\n';
    }

    return {
      contextString,
      items: budgetedItems,
      totalTokens: runningTokens,
    };
  }
}
