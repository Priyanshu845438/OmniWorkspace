import { DatabaseSync } from 'node:sqlite';
import path from 'path';
import fs from 'fs';

export class WorkspaceDatabase {
  private db: DatabaseSync;

  constructor(storageDir?: string) {
    if (storageDir) {
      if (!fs.existsSync(storageDir)) {
        fs.mkdirSync(storageDir, { recursive: true });
      }
      const dbPath = path.join(storageDir, 'workspace.db');
      this.db = new DatabaseSync(dbPath);
    } else {
      this.db = new DatabaseSync(':memory:');
    }

    this.initSchema();
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

      CREATE TABLE IF NOT EXISTS messages (
        id TEXT PRIMARY KEY,
        conversation_id TEXT NOT NULL,
        role TEXT NOT NULL,
        content TEXT NOT NULL,
        trace_json TEXT,
        created_at TEXT NOT NULL,
        FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE
      );

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

    // Sample data tables for SQL and Data Analysis tasks
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS departments (
        id INTEGER PRIMARY KEY,
        name TEXT NOT NULL,
        budget REAL NOT NULL,
        location TEXT NOT NULL DEFAULT 'San Francisco, CA'
      );

      CREATE TABLE IF NOT EXISTS employees (
        id INTEGER PRIMARY KEY,
        name TEXT NOT NULL,
        department_id INTEGER,
        role TEXT NOT NULL,
        salary REAL NOT NULL,
        hire_date TEXT NOT NULL,
        FOREIGN KEY (department_id) REFERENCES departments(id)
      );

      CREATE TABLE IF NOT EXISTS customers (
        id INTEGER PRIMARY KEY,
        company_name TEXT NOT NULL,
        tier TEXT NOT NULL,
        country TEXT NOT NULL,
        created_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS products (
        id INTEGER PRIMARY KEY,
        name TEXT NOT NULL,
        category TEXT NOT NULL,
        unit_price REAL NOT NULL,
        stock_quantity INTEGER NOT NULL
      );

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
    if (checkDept.count === 0) {
      this.db.exec(`
        INSERT INTO departments (id, name, budget, location) VALUES
          (1, 'Engineering', 2500000, 'San Francisco, CA'),
          (2, 'Research & AI', 1800000, 'Seattle, WA'),
          (3, 'Product Design', 900000, 'New York, NY'),
          (4, 'Marketing & Growth', 750000, 'Austin, TX');

        INSERT INTO employees (id, name, department_id, role, salary, hire_date) VALUES
          (1, 'Sarah Chen', 2, 'Principal AI Scientist', 220000, '2022-03-15'),
          (2, 'Alex Mercer', 1, 'Staff Software Engineer', 195000, '2021-08-01'),
          (3, 'Elena Rostova', 1, 'DevOps & Security Lead', 185000, '2023-01-10'),
          (4, 'Marcus Brody', 3, 'Lead UX Designer', 160000, '2022-11-20'),
          (5, 'Priya Sharma', 4, 'Growth Lead', 150000, '2023-05-18');
      `);
    }

    const checkCust = this.db.prepare('SELECT COUNT(*) as count FROM customers').get() as { count: number };
    if (checkCust.count === 0) {
      this.db.exec(`
        INSERT INTO customers (id, company_name, tier, country, created_at) VALUES
          (1, 'Acme AI Systems', 'Enterprise', 'USA', '2023-04-10'),
          (2, 'BioTech Research Labs', 'Enterprise', 'Germany', '2023-06-15'),
          (3, 'Quantum Dynamics', 'Growth', 'UK', '2023-09-01'),
          (4, 'Nordic Cloud Oy', 'Startup', 'Finland', '2024-01-20'),
          (5, 'Apex Financial Tech', 'Enterprise', 'Japan', '2024-02-12');
      `);
    }

    const checkProd = this.db.prepare('SELECT COUNT(*) as count FROM products').get() as { count: number };
    if (checkProd.count === 0) {
      this.db.exec(`
        INSERT INTO products (id, name, category, unit_price, stock_quantity) VALUES
          (1, 'Enterprise AI Inference Pack', 'Inference', 45000, 100),
          (2, 'Code Intelligence Suite', 'Developer Tools', 28000, 250),
          (3, 'OmniWorkspace Pro Annual', 'SaaS License', 12000, 500),
          (4, 'Custom LLM Fine-Tuning Contract', 'Professional Services', 95000, 20),
          (5, 'Universal Developer Seat License', 'SaaS License', 34000, 300);
      `);
    }

    const checkSales = this.db.prepare('SELECT COUNT(*) as count FROM sales').get() as { count: number };
    if (checkSales.count === 0) {
      this.db.exec(`
        INSERT INTO sales (id, employee_id, product, amount, sale_date) VALUES
          (1, 1, 'Enterprise AI Inference Pack', 45000, '2024-01-15'),
          (2, 2, 'Code Intelligence Suite', 28000, '2024-01-20'),
          (3, 5, 'OmniWorkspace Pro Annual', 12000, '2024-02-05'),
          (4, 1, 'Custom LLM Fine-Tuning Contract', 95000, '2024-02-18'),
          (5, 5, 'Universal Developer Seat License', 34000, '2024-03-01');
      `);
    }
  }

  public getRawDatabase(): DatabaseSync {
    return this.db;
  }

  public createConversation(title: string): string {
    const id = `conv_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    const now = new Date().toISOString();
    this.db.prepare('INSERT INTO conversations (id, title, created_at, updated_at) VALUES (?, ?, ?, ?)').run(
      id,
      title,
      now,
      now
    );
    return id;
  }

  public listConversations() {
    return this.db.prepare('SELECT * FROM conversations ORDER BY updated_at DESC').all();
  }

  public getMessages(conversationId: string) {
    return this.db.prepare('SELECT * FROM messages WHERE conversation_id = ? ORDER BY created_at ASC').all(
      conversationId
    );
  }

  public addMessage(conversationId: string, role: string, content: string, traceJson?: string) {
    const id = `msg_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    const now = new Date().toISOString();
    this.db.prepare(
      'INSERT INTO messages (id, conversation_id, role, content, trace_json, created_at) VALUES (?, ?, ?, ?, ?, ?)'
    ).run(id, conversationId, role, content, traceJson || null, now);
    this.db.prepare('UPDATE conversations SET updated_at = ? WHERE id = ?').run(now, conversationId);
    return id;
  }
}
