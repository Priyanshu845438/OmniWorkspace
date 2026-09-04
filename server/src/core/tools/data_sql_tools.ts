import fs from 'fs';
import path from 'path';
import { ToolRegistry } from './registry.js';
import { PathShield } from '../security/path_shield.js';
import { PermissionLevel } from '../../types/index.js';

export function registerDataAndSqlTools(
  registry: ToolRegistry,
  pathShield: PathShield,
  getDbInstance: () => any
) {
  // 1. inspect_csv (Level 0 - Read Only)
  registry.registerTool(
    {
      name: 'inspect_csv',
      description: 'Parses a CSV file, infers data types, calculates column statistics (nulls, min, max, mean), and previews sample rows.',
      category: 'data',
      permissionLevel: PermissionLevel.LEVEL_0_READ_ONLY,
      parameters: {
        type: 'object',
        properties: {
          filePath: { type: 'string', description: 'Relative path to the CSV file.' },
          sampleLimit: { type: 'string', description: 'Number of sample rows to return (default: 5).' },
        },
        required: ['filePath'],
      },
    },
    async (params: { filePath: string; sampleLimit?: string }) => {
      const check = pathShield.resolveSafePath(params.filePath);
      if (!check.isAllowed) throw new Error(check.reason);

      const content = fs.readFileSync(check.safePath, 'utf8');
      const lines = content.split(/\r?\n/).filter((l) => l.trim().length > 0);
      if (lines.length === 0) {
        return { totalRows: 0, columns: [], samples: [] };
      }

      // Simple CSV line parser
      const parseCsvLine = (line: string): string[] => {
        const result: string[] = [];
        let current = '';
        let inQuotes = false;
        for (let i = 0; i < line.length; i++) {
          const char = line[i];
          if (char === '"') {
            inQuotes = !inQuotes;
          } else if (char === ',' && !inQuotes) {
            result.push(current.trim());
            current = '';
          } else {
            current += char;
          }
        }
        result.push(current.trim());
        return result;
      };

      const headers = parseCsvLine(lines[0]);
      const dataRows = lines.slice(1).map(parseCsvLine);
      const totalRows = dataRows.length;

      // Calculate statistics per column
      const columnStats: Record<string, { type: string; nullCount: number; numericSummary?: { min: number; max: number; mean: number } }> = {};

      headers.forEach((header, colIdx) => {
        let numericCount = 0;
        let nullCount = 0;
        let sum = 0;
        let min = Infinity;
        let max = -Infinity;

        dataRows.forEach((row) => {
          const val = row[colIdx];
          if (val === undefined || val === '' || val.toLowerCase() === 'null') {
            nullCount++;
          } else {
            const num = Number(val);
            if (!isNaN(num)) {
              numericCount++;
              sum += num;
              if (num < min) min = num;
              if (num > max) max = num;
            }
          }
        });

        const isNumeric = numericCount > totalRows * 0.7 && totalRows > 0;
        columnStats[header] = {
          type: isNumeric ? 'numeric' : 'string',
          nullCount,
          numericSummary: isNumeric
            ? {
                min: min === Infinity ? 0 : min,
                max: max === -Infinity ? 0 : max,
                mean: numericCount > 0 ? Number((sum / numericCount).toFixed(2)) : 0,
              }
            : undefined,
        };
      });

      const limit = Number(params.sampleLimit) || 5;
      const samples = dataRows.slice(0, limit).map((row) => {
        const obj: Record<string, string> = {};
        headers.forEach((h, i) => {
          obj[h] = row[i] || '';
        });
        return obj;
      });

      return {
        filePath: params.filePath,
        totalRows,
        columnCount: headers.length,
        headers,
        columnStats,
        samples,
      };
    }
  );

  // 2. inspect_json (Level 0 - Read Only)
  registry.registerTool(
    {
      name: 'inspect_json',
      description: 'Parses a JSON file, analyzes structure, key distribution, and sample payloads.',
      category: 'data',
      permissionLevel: PermissionLevel.LEVEL_0_READ_ONLY,
      parameters: {
        type: 'object',
        properties: {
          filePath: { type: 'string', description: 'Relative path to the JSON file.' },
        },
        required: ['filePath'],
      },
    },
    async (params: { filePath: string }) => {
      const check = pathShield.resolveSafePath(params.filePath);
      if (!check.isAllowed) throw new Error(check.reason);

      const raw = fs.readFileSync(check.safePath, 'utf8');
      const parsed = JSON.parse(raw);

      const isArray = Array.isArray(parsed);
      const keys = isArray
        ? parsed.length > 0 && typeof parsed[0] === 'object'
          ? Object.keys(parsed[0])
          : []
        : Object.keys(parsed);

      return {
        filePath: params.filePath,
        isRootArray: isArray,
        count: isArray ? parsed.length : 1,
        schemaKeys: keys,
        preview: isArray ? parsed.slice(0, 3) : parsed,
      };
    }
  );

  // 3. execute_sql (Level 1 - Modify / Read)
  registry.registerTool(
    {
      name: 'execute_sql',
      description: 'Executes a safe SQL query against the local SQLite database. Distinguishes READ, WRITE, and DESTRUCTIVE queries and blocks destructive statements without explicit confirmation.',
      category: 'sql',
      permissionLevel: PermissionLevel.LEVEL_1_MODIFY,
      parameters: {
        type: 'object',
        properties: {
          query: { type: 'string', description: 'SQL query string to run.' },
          isUserConfirmed: { type: 'boolean', description: 'Explicit user approval required for destructive operations (e.g. DROP, TRUNCATE, unconstrained DELETE).' },
        },
        required: ['query'],
      },
    },
    async (params: { query: string; isUserConfirmed?: boolean }) => {
      const trimmed = params.query.trim();

      // Guard against DROP DATABASE or dangerous statements
      if (/drop\s+database/i.test(trimmed)) {
        throw new Error('Dangerous SQL statement blocked: DROP DATABASE not permitted.');
      }

      // Detect destructive operations requiring explicit approval
      const isDestructive =
        /\bdrop\s+(table|view|index|trigger|database)\b/i.test(trimmed) ||
        /\btruncate\s+table\b/i.test(trimmed) ||
        /\balter\s+table\b.*\bdrop\b/i.test(trimmed) ||
        (/\bdelete\s+from\b/i.test(trimmed) && !/\bwhere\b/i.test(trimmed));

      if (isDestructive && !params.isUserConfirmed) {
        throw new Error(
          'DESTRUCTIVE OPERATION BLOCKED: This query permanently deletes or alters schema/tables without restrictions. Explicit confirmation (isUserConfirmed: true) is required to execute.'
        );
      }

      const db = getDbInstance();
      if (!db) {
        throw new Error('Database instance is not initialized.');
      }

      const isSelect = /^select\b/i.test(trimmed) || /^explain\b/i.test(trimmed) || /^pragma\b/i.test(trimmed);
      const operationType = isSelect ? 'READ' : isDestructive ? 'DESTRUCTIVE' : 'WRITE';
      const t0 = performance.now();

      try {
        if (isSelect) {
          const stmt = db.prepare(trimmed);
          const rows = stmt.all();
          const durationMs = Math.round((performance.now() - t0) * 100) / 100;
          return {
            query: params.query,
            operationType,
            rowCount: rows.length,
            columns: rows.length > 0 ? Object.keys(rows[0] as object) : [],
            rows: rows.slice(0, 500),
            durationMs,
          };
        } else {
          const stmt = db.prepare(trimmed);
          const info = stmt.run();
          const durationMs = Math.round((performance.now() - t0) * 100) / 100;
          return {
            query: params.query,
            operationType,
            changes: info.changes,
            lastInsertRowid: info.lastInsertRowid,
            durationMs,
            success: true,
          };
        }
      } catch (err: any) {
        throw new Error(`SQL Execution Failed: ${err.message}`);
      }
    }
  );

  // 4. inspect_schema (Level 0 - Read Only)
  registry.registerTool(
    {
      name: 'inspect_schema',
      description: 'Retrieves all tables, column types, primary keys, and relations in the workspace SQLite database.',
      category: 'sql',
      permissionLevel: PermissionLevel.LEVEL_0_READ_ONLY,
      parameters: {
        type: 'object',
        properties: {},
      },
    },
    async () => {
      const db = getDbInstance();
      if (!db) throw new Error('Database instance not initialized.');

      const tables = db.prepare(`SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%';`).all();
      const schema: Record<string, unknown[]> = {};
      const rowCounts: Record<string, number> = {};

      for (const t of tables as any[]) {
        const columns = db.prepare(`PRAGMA table_info("${t.name}");`).all();
        schema[t.name] = columns;
        try {
          const countRow = db.prepare(`SELECT COUNT(*) as count FROM "${t.name}";`).get() as { count: number };
          rowCounts[t.name] = countRow?.count ?? 0;
        } catch {
          rowCounts[t.name] = 0;
        }
      }

      return { tables: tables.map((t: any) => t.name), schema, rowCounts };
    }
  );

  // 5. explain_query (Level 0 - Read Only)
  registry.registerTool(
    {
      name: 'explain_query',
      description: 'Runs EXPLAIN QUERY PLAN on an SQL query to inspect indexes and scan strategies.',
      category: 'sql',
      permissionLevel: PermissionLevel.LEVEL_0_READ_ONLY,
      parameters: {
        type: 'object',
        properties: {
          query: { type: 'string', description: 'SQL query to explain.' },
        },
        required: ['query'],
      },
    },
    async (params: { query: string }) => {
      const db = getDbInstance();
      if (!db) throw new Error('Database not initialized.');

      const t0 = performance.now();
      try {
        const rows = db.prepare(`EXPLAIN QUERY PLAN ${params.query}`).all();
        const durationMs = Math.round((performance.now() - t0) * 100) / 100;
        return { query: params.query, plan: rows, durationMs };
      } catch (err: any) {
        throw new Error(`EXPLAIN query failed: ${err.message}`);
      }
    }
  );
}
