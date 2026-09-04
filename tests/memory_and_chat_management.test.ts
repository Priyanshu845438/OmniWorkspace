import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { WorkspaceDatabase } from '../server/src/core/db/db.js';
import fs from 'fs';
import path from 'path';
import os from 'os';

describe('Chat Management & Long-Term Memory Learning', () => {
  let tempDir: string;
  let db: WorkspaceDatabase;

  beforeEach(async () => {
    tempDir = path.join(os.tmpdir(), 'omni-mem-test-' + Math.random().toString(36).slice(2));
    fs.mkdirSync(tempDir, { recursive: true });
    db = new WorkspaceDatabase(tempDir);
    await db.waitForReady();
  });

  afterEach(() => {
    try {
      db.close();
      fs.rmSync(tempDir, { recursive: true, force: true });
    } catch {
      // ignore
    }
  });

  it('manages conversation threads (create, rename, delete)', () => {
    const convId = db.createConversation('Initial Chat Thread');
    expect(convId).toBeDefined();

    // Add a message
    db.addMessage(convId, 'user', 'Hello AI');
    db.addMessage(convId, 'assistant', 'Hello Developer! How can I help?');

    const messages = db.getMessages(convId);
    expect(messages).toHaveLength(2);
    expect(messages[0].content).toBe('Hello AI');
    expect(messages[1].content).toBe('Hello Developer! How can I help?');

    // Rename thread
    db.updateConversationTitle(convId, 'Renamed Masterplan');
    const convs = db.listConversations();
    const updated = convs.find((c) => c.id === convId);
    expect(updated).toBeDefined();
    expect(updated?.title).toBe('Renamed Masterplan');

    // Delete thread
    db.deleteConversation(convId);
    const convsAfter = db.listConversations();
    expect(convsAfter.find((c) => c.id === convId)).toBeUndefined();
    expect(db.getMessages(convId)).toHaveLength(0);
  });

  it('stores, lists, searches, and deletes learned user memories', () => {
    // Add memories with categories (category, content, source, confidence)
    const memId1 = db.addMemory('coding_style', 'User prefers TypeScript with strict mode enabled', 'learned', 0.95);
    const memId2 = db.addMemory('preference', 'User prefers dark mode themes and concise executive summaries', 'learned', 0.85);
    const memId3 = db.addMemory('rule', 'Do not delete production tables without explicit CLI flag', 'user_explicit', 1.0);

    expect(memId1).toBeDefined();
    expect(memId2).toBeDefined();
    expect(memId3).toBeDefined();

    // List memories
    const allMemories = db.listMemories();
    expect(allMemories.length).toBeGreaterThanOrEqual(3);

    // Search memories
    const codingMatches = db.searchMemories('TypeScript');
    expect(codingMatches.some((m) => m.content.includes('strict mode'))).toBe(true);

    const ruleMatches = db.searchMemories('production');
    expect(ruleMatches.some((m) => m.content.includes('production tables'))).toBe(true);

    // Delete a memory
    db.deleteMemory(memId2);
    const remaining = db.listMemories();
    expect(remaining.find((m) => m.id === memId2)).toBeUndefined();
  });
});
