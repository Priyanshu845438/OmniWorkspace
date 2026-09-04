import initSqlJs, { Database as SqlJsDatabase } from 'sql.js';
import path from 'path';
import fs from 'fs';

export interface SystemSettings {
  // General & Appearance
  theme: 'dark' | 'light';
  accentColor: string;
  fontSize: 'compact' | 'standard' | 'comfortable';
  editorFontFamily: string;
  enableFontLigatures: boolean;
  enableSoundEffects: boolean;
  defaultPerspective: string;
  compactMode: boolean;

  // AI & Inference
  defaultModel: string;
  temperature: number;
  maxOutputTokens: number;
  streamingSpeedThrottled: boolean;
  systemPromptOverride: string;
  memoryHistoryDepth: number;
  autoFallbackToLocal: boolean;
  reasoningEffort: 'low' | 'medium' | 'high';

  // Security & Permissions
  autoApproveLevel: number;
  confirmTerminal: boolean;
  confirmDestructive: boolean;
  promptInjectionDefense: 'strict' | 'balanced' | 'off';
  sandboxIsolationPath: string;

  // Workspace & Storage
  maxFileIndexCount: number;
  excludedDirectories: string;
  offlineMode: boolean;
  corsProxyUrl: string;
}

export const DEFAULT_SYSTEM_SETTINGS: SystemSettings = {
  theme: 'dark',
  accentColor: 'cyan',
  fontSize: 'standard',
  editorFontFamily: "'JetBrains Mono', 'Fira Code', monospace",
  enableFontLigatures: true,
  enableSoundEffects: false,
  defaultPerspective: 'home',
  compactMode: false,

  defaultModel: 'Optimal Auto Router',
  temperature: 0.3,
  maxOutputTokens: 4096,
  streamingSpeedThrottled: false,
  systemPromptOverride: '',
  memoryHistoryDepth: 12,
  autoFallbackToLocal: true,
  reasoningEffort: 'medium',

  autoApproveLevel: 1,
  confirmTerminal: true,
  confirmDestructive: true,
  promptInjectionDefense: 'strict',
  sandboxIsolationPath: '',

  maxFileIndexCount: 10000,
  excludedDirectories: 'node_modules, .git, dist, dist-client, dist-server, coverage',
  offlineMode: false,
  corsProxyUrl: '',
};

/**
 * A thin adapter that wraps sql.js to provide a synchronous
 * better-sqlite3-like API. This lets the rest of the codebase
 * keep using `db.prepare(sql).all()`, `.run()`, `.get()`.
 *
 * sql.js is a pure JS/WASM SQLite — zero native bindings,
 * so it works inside Electron's asar without any ABI issues.
 */
class SqliteAdapter {
  private db: SqlJsDatabase;
  private dbPath: string | null;
  private saveTimer: ReturnType<typeof setTimeout> | null = null;

  constructor(db: SqlJsDatabase, dbPath: string | null) {
    this.db = db;
    this.dbPath = dbPath;
  }

  exec(sql: string): void {
    this.db.run(sql);
    this.scheduleSave();
  }

  prepare(sql: string): PreparedStatementAdapter {
    return new PreparedStatementAdapter(this.db, sql, () => this.scheduleSave());
  }

  close(): void {
    this.persist();
    this.db.close();
  }

  /** Persist the in-memory database to disk (debounced) */
  private scheduleSave(): void {
    if (!this.dbPath) return;
    if (this.saveTimer) clearTimeout(this.saveTimer);
    this.saveTimer = setTimeout(() => this.persist(), 500);
  }

  persist(): void {
    if (!this.dbPath) return;
    try {
      const data = this.db.export();
      const buffer = Buffer.from(data);
      fs.writeFileSync(this.dbPath, buffer);
    } catch {
      // Silently fail on persist errors
    }
  }
}

class PreparedStatementAdapter {
  private db: SqlJsDatabase;
  private sql: string;
  private onMutate: () => void;

  constructor(db: SqlJsDatabase, sql: string, onMutate: () => void) {
    this.db = db;
    this.sql = sql;
    this.onMutate = onMutate;
  }

  all(...params: any[]): any[] {
    const stmt = this.db.prepare(this.sql);
    try {
      if (params.length > 0) {
        stmt.bind(params);
      }
      const rows: any[] = [];
      while (stmt.step()) {
        rows.push(stmt.getAsObject());
      }
      return rows;
    } finally {
      stmt.free();
    }
  }

  get(...params: any[]): any {
    const stmt = this.db.prepare(this.sql);
    try {
      if (params.length > 0) {
        stmt.bind(params);
      }
      if (stmt.step()) {
        return stmt.getAsObject();
      }
      return undefined;
    } finally {
      stmt.free();
    }
  }

  run(...params: any[]): { changes: number; lastInsertRowid: number } {
    if (params.length > 0) {
      this.db.run(this.sql, params);
    } else {
      this.db.run(this.sql);
    }
    this.onMutate();

    // sql.js doesn't directly return changes/lastInsertRowid from .run(),
    // but we can query them from SQLite internals
    let changes = 0;
    let lastInsertRowid = 0;
    try {
      const chStmt = this.db.prepare('SELECT changes() as c');
      if (chStmt.step()) {
        changes = (chStmt.getAsObject() as any).c || 0;
      }
      chStmt.free();
    } catch {}
    try {
      const liStmt = this.db.prepare('SELECT last_insert_rowid() as r');
      if (liStmt.step()) {
        lastInsertRowid = (liStmt.getAsObject() as any).r || 0;
      }
      liStmt.free();
    } catch {}

    return { changes, lastInsertRowid };
  }
}

// ── Singleton init ──────────────────────────────────────────────
let sqlJsInitialized: Promise<typeof import('sql.js')['default']> | null = null;

function getSqlJs(): Promise<typeof import('sql.js')['default']> {
  if (!sqlJsInitialized) {
    sqlJsInitialized = initSqlJs().then((SQL) => {
      return SQL as any;
    });
  }
  return sqlJsInitialized as any;
}

/**
 * Creates the SqliteAdapter, loading from disk if possible.
 * Must be called with `await` — the only async part.
 */
async function createAdapter(storageDir?: string): Promise<SqliteAdapter> {
  const SQL = await getSqlJs();
  let db: SqlJsDatabase;
  let dbPath: string | null = null;

  if (storageDir) {
    if (!fs.existsSync(storageDir)) {
      fs.mkdirSync(storageDir, { recursive: true });
    }
    dbPath = path.join(storageDir, 'workspace.db');
    if (fs.existsSync(dbPath)) {
      const buffer = fs.readFileSync(dbPath);
      db = new (SQL as any).Database(buffer);
    } else {
      db = new (SQL as any).Database();
    }
  } else {
    db = new (SQL as any).Database();
  }

  return new SqliteAdapter(db, dbPath);
}

// ── Public WorkspaceDatabase ────────────────────────────────────

export class WorkspaceDatabase {
  private db!: SqliteAdapter;
  private ready: Promise<void>;

  constructor(storageDir?: string) {
    this.ready = createAdapter(storageDir).then((adapter) => {
      this.db = adapter;
      this.initSchema();
    });
  }

  /** Wait until the database is ready (call once at startup). */
  async waitForReady(): Promise<void> {
    await this.ready;
  }

  /** Ensures DB is initialized before use (throws sync if not ready yet). */
  private ensureReady(): void {
    if (!this.db) {
      throw new Error('WorkspaceDatabase is not yet initialized. Call await db.waitForReady() first.');
    }
  }

  private initSchema() {
    // 1. Conversations & Messages
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS conversations (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );
    `);
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS messages (
        id TEXT PRIMARY KEY,
        conversation_id TEXT NOT NULL,
        role TEXT NOT NULL,
        content TEXT NOT NULL,
        trace_json TEXT,
        created_at TEXT NOT NULL,
        FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE
      );
    `);
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS audit_events (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        tool_name TEXT NOT NULL,
        permission_level INTEGER NOT NULL,
        approved INTEGER NOT NULL,
        success INTEGER NOT NULL,
        error TEXT,
        timestamp TEXT NOT NULL
      );
    `);
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS user_memories (
        id TEXT PRIMARY KEY,
        category TEXT NOT NULL,
        content TEXT NOT NULL,
        source TEXT NOT NULL DEFAULT 'auto_extracted',
        confidence REAL NOT NULL DEFAULT 1.0,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );
    `);
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS system_settings (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );
    `);

    // Sample data tables for SQL and Data Analysis tasks
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS departments (
        id INTEGER PRIMARY KEY,
        name TEXT NOT NULL,
        budget REAL NOT NULL,
        location TEXT NOT NULL DEFAULT 'San Francisco, CA'
      );
    `);
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS employees (
        id INTEGER PRIMARY KEY,
        name TEXT NOT NULL,
        department_id INTEGER,
        role TEXT NOT NULL,
        salary REAL NOT NULL,
        hire_date TEXT NOT NULL,
        FOREIGN KEY (department_id) REFERENCES departments(id)
      );
    `);
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS customers (
        id INTEGER PRIMARY KEY,
        company_name TEXT NOT NULL,
        tier TEXT NOT NULL,
        country TEXT NOT NULL,
        created_at TEXT NOT NULL
      );
    `);
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS products (
        id INTEGER PRIMARY KEY,
        name TEXT NOT NULL,
        category TEXT NOT NULL,
        unit_price REAL NOT NULL,
        stock_quantity INTEGER NOT NULL
      );
    `);
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS sales (
        id INTEGER PRIMARY KEY,
        employee_id INTEGER,
        product TEXT NOT NULL,
        amount REAL NOT NULL,
        sale_date TEXT NOT NULL,
        FOREIGN KEY (employee_id) REFERENCES employees(id)
      );
    `);

    // Populate starter data if empty
    const checkDept = this.db.prepare('SELECT COUNT(*) as count FROM departments').get() as { count: number };
    if (checkDept && checkDept.count === 0) {
      this.db.exec(`INSERT INTO departments (id, name, budget, location) VALUES (1, 'Engineering', 2500000, 'San Francisco, CA');`);
      this.db.exec(`INSERT INTO departments (id, name, budget, location) VALUES (2, 'Research & AI', 1800000, 'Seattle, WA');`);
      this.db.exec(`INSERT INTO departments (id, name, budget, location) VALUES (3, 'Product Design', 900000, 'New York, NY');`);
      this.db.exec(`INSERT INTO departments (id, name, budget, location) VALUES (4, 'Marketing & Growth', 750000, 'Austin, TX');`);

      this.db.exec(`INSERT INTO employees (id, name, department_id, role, salary, hire_date) VALUES (1, 'Sarah Chen', 2, 'Principal AI Scientist', 220000, '2022-03-15');`);
      this.db.exec(`INSERT INTO employees (id, name, department_id, role, salary, hire_date) VALUES (2, 'Alex Mercer', 1, 'Staff Software Engineer', 195000, '2021-08-01');`);
      this.db.exec(`INSERT INTO employees (id, name, department_id, role, salary, hire_date) VALUES (3, 'Elena Rostova', 1, 'DevOps & Security Lead', 185000, '2023-01-10');`);
      this.db.exec(`INSERT INTO employees (id, name, department_id, role, salary, hire_date) VALUES (4, 'Marcus Brody', 3, 'Lead UX Designer', 160000, '2022-11-20');`);
      this.db.exec(`INSERT INTO employees (id, name, department_id, role, salary, hire_date) VALUES (5, 'Priya Sharma', 4, 'Growth Lead', 150000, '2023-05-18');`);
    }

    const checkCust = this.db.prepare('SELECT COUNT(*) as count FROM customers').get() as { count: number };
    if (checkCust && checkCust.count === 0) {
      this.db.exec(`INSERT INTO customers (id, company_name, tier, country, created_at) VALUES (1, 'Acme AI Systems', 'Enterprise', 'USA', '2023-04-10');`);
      this.db.exec(`INSERT INTO customers (id, company_name, tier, country, created_at) VALUES (2, 'BioTech Research Labs', 'Enterprise', 'Germany', '2023-06-15');`);
      this.db.exec(`INSERT INTO customers (id, company_name, tier, country, created_at) VALUES (3, 'Quantum Dynamics', 'Growth', 'UK', '2023-09-01');`);
      this.db.exec(`INSERT INTO customers (id, company_name, tier, country, created_at) VALUES (4, 'Nordic Cloud Oy', 'Startup', 'Finland', '2024-01-20');`);
      this.db.exec(`INSERT INTO customers (id, company_name, tier, country, created_at) VALUES (5, 'Apex Financial Tech', 'Enterprise', 'Japan', '2024-02-12');`);
    }

    const checkProd = this.db.prepare('SELECT COUNT(*) as count FROM products').get() as { count: number };
    if (checkProd && checkProd.count === 0) {
      this.db.exec(`INSERT INTO products (id, name, category, unit_price, stock_quantity) VALUES (1, 'Enterprise AI Inference Pack', 'Inference', 45000, 100);`);
      this.db.exec(`INSERT INTO products (id, name, category, unit_price, stock_quantity) VALUES (2, 'Code Intelligence Suite', 'Developer Tools', 28000, 250);`);
      this.db.exec(`INSERT INTO products (id, name, category, unit_price, stock_quantity) VALUES (3, 'OmniWorkspace Pro Annual', 'SaaS License', 12000, 500);`);
      this.db.exec(`INSERT INTO products (id, name, category, unit_price, stock_quantity) VALUES (4, 'Custom LLM Fine-Tuning Contract', 'Professional Services', 95000, 20);`);
      this.db.exec(`INSERT INTO products (id, name, category, unit_price, stock_quantity) VALUES (5, 'Universal Developer Seat License', 'SaaS License', 34000, 300);`);
    }

    const checkSales = this.db.prepare('SELECT COUNT(*) as count FROM sales').get() as { count: number };
    if (checkSales && checkSales.count === 0) {
      this.db.exec(`INSERT INTO sales (id, employee_id, product, amount, sale_date) VALUES (1, 1, 'Enterprise AI Inference Pack', 45000, '2024-01-15');`);
      this.db.exec(`INSERT INTO sales (id, employee_id, product, amount, sale_date) VALUES (2, 2, 'Code Intelligence Suite', 28000, '2024-01-20');`);
      this.db.exec(`INSERT INTO sales (id, employee_id, product, amount, sale_date) VALUES (3, 5, 'OmniWorkspace Pro Annual', 12000, '2024-02-05');`);
      this.db.exec(`INSERT INTO sales (id, employee_id, product, amount, sale_date) VALUES (4, 1, 'Custom LLM Fine-Tuning Contract', 95000, '2024-02-18');`);
      this.db.exec(`INSERT INTO sales (id, employee_id, product, amount, sale_date) VALUES (5, 5, 'Universal Developer Seat License', 34000, '2024-03-01');`);
    }

    const checkAudit = this.db.prepare('SELECT COUNT(*) as count FROM audit_events').get() as { count: number };
    if (checkAudit && checkAudit.count === 0) {
      this.logAuditEvent('read_file', 0, true, true);
      this.logAuditEvent('list_dir', 0, true, true);
      this.logAuditEvent('execute_command', 2, true, true);
      this.logAuditEvent('write_file', 1, true, true);
      this.logAuditEvent('web_search', 3, true, true);
      this.logAuditEvent('sql_query', 1, true, true);
      this.logAuditEvent('deep_research_synthesize', 3, true, true);
    }
  }

  public getRawDatabase(): SqliteAdapter {
    this.ensureReady();
    return this.db;
  }

  public createConversation(title: string): string {
    this.ensureReady();
    const id = `conv_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    const now = new Date().toISOString();
    this.db.prepare('INSERT INTO conversations (id, title, created_at, updated_at) VALUES (?, ?, ?, ?)').run(
      id, title, now, now
    );
    return id;
  }

  public listConversations() {
    this.ensureReady();
    return this.db.prepare('SELECT * FROM conversations ORDER BY updated_at DESC').all();
  }

  public getMessages(conversationId: string) {
    this.ensureReady();
    return this.db.prepare('SELECT * FROM messages WHERE conversation_id = ? ORDER BY created_at ASC').all(
      conversationId
    );
  }

  public addMessage(conversationId: string, role: string, content: string, traceJson?: string) {
    this.ensureReady();
    const id = `msg_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    const now = new Date().toISOString();
    this.db.prepare(
      'INSERT INTO messages (id, conversation_id, role, content, trace_json, created_at) VALUES (?, ?, ?, ?, ?, ?)'
    ).run(id, conversationId, role, content, traceJson || null, now);
    this.db.prepare('UPDATE conversations SET updated_at = ? WHERE id = ?').run(now, conversationId);
    return id;
  }

  public updateConversationTitle(conversationId: string, title: string): boolean {
    this.ensureReady();
    const now = new Date().toISOString();
    this.db.prepare('UPDATE conversations SET title = ?, updated_at = ? WHERE id = ?').run(title, now, conversationId);
    return true;
  }

  public deleteConversation(conversationId: string): boolean {
    this.ensureReady();
    this.db.prepare('DELETE FROM messages WHERE conversation_id = ?').run(conversationId);
    this.db.prepare('DELETE FROM conversations WHERE id = ?').run(conversationId);
    return true;
  }

  // Memory & Learning Engine Methods
  public addMemory(
    category: string,
    content: string,
    source: string = 'user_explicit',
    confidence: number = 1.0
  ): string {
    this.ensureReady();
    const id = `mem_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    const now = new Date().toISOString();
    this.db.prepare(
      'INSERT INTO user_memories (id, category, content, source, confidence, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)'
    ).run(id, category, content, source, confidence, now, now);
    return id;
  }

  public listMemories(): any[] {
    this.ensureReady();
    return this.db.prepare('SELECT * FROM user_memories ORDER BY updated_at DESC').all();
  }

  public deleteMemory(id: string): boolean {
    this.ensureReady();
    this.db.prepare('DELETE FROM user_memories WHERE id = ?').run(id);
    return true;
  }

  public searchMemories(query?: string): any[] {
    this.ensureReady();
    if (!query || !query.trim()) {
      return this.listMemories();
    }
    const param = `%${query.trim()}%`;
    return this.db.prepare('SELECT * FROM user_memories WHERE content LIKE ? OR category LIKE ? ORDER BY confidence DESC').all(param, param);
  }

  // System Settings Engine
  public getSettings(): SystemSettings {
    this.ensureReady();
    const rows = this.db.prepare('SELECT key, value FROM system_settings').all() as { key: string; value: string }[];
    const result: any = { ...DEFAULT_SYSTEM_SETTINGS };
    for (const r of rows) {
      try {
        result[r.key] = JSON.parse(r.value);
      } catch {
        result[r.key] = r.value;
      }
    }
    return result as SystemSettings;
  }

  public updateSettings(partial: Partial<SystemSettings>): SystemSettings {
    this.ensureReady();
    const now = new Date().toISOString();
    for (const [k, v] of Object.entries(partial)) {
      if (v !== undefined) {
        // sql.js doesn't support UPSERT in all SQLite versions, so use INSERT OR REPLACE
        this.db.prepare(
          `INSERT OR REPLACE INTO system_settings (key, value, updated_at) VALUES (?, ?, ?)`
        ).run(k, JSON.stringify(v), now);
      }
    }
    return this.getSettings();
  }

  public resetSettings(): SystemSettings {
    this.ensureReady();
    this.db.exec('DELETE FROM system_settings');
    return { ...DEFAULT_SYSTEM_SETTINGS };
  }

  // Security Audit Logging Engine
  public logAuditEvent(
    toolName: string,
    permissionLevel: number,
    approved: boolean,
    success: boolean,
    error?: string
  ): void {
    // Don't call ensureReady here since it's called during initSchema
    if (!this.db) return;
    const now = new Date().toISOString();
    this.db.prepare(
      'INSERT INTO audit_events (tool_name, permission_level, approved, success, error, timestamp) VALUES (?, ?, ?, ?, ?, ?)'
    ).run(toolName, permissionLevel, approved ? 1 : 0, success ? 1 : 0, error || null, now);
  }

  public getRecentAuditEvents(limit: number = 50): any[] {
    this.ensureReady();
    return this.db.prepare('SELECT * FROM audit_events ORDER BY id DESC LIMIT ?').all(limit);
  }

  public vacuumDatabase(): { success: boolean; message: string } {
    this.ensureReady();
    this.db.exec('VACUUM');
    return { success: true, message: 'Database optimized and compacted successfully via SQLite VACUUM.' };
  }
}
