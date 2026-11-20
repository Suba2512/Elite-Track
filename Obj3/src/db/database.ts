import { DatabaseSync } from 'node:sqlite';
import fs from 'fs';
import path from 'path';
import { ENV } from '../config/env.js';

let dbInstance: DatabaseSync | null = null;

export function getDatabase(): DatabaseSync {
  if (!dbInstance) {
    const dbPath = ENV.DATABASE_PATH;
    const dbDir = path.dirname(dbPath);
    if (!fs.existsSync(dbDir)) {
      fs.mkdirSync(dbDir, { recursive: true });
    }

    dbInstance = new DatabaseSync(dbPath);
    // Optimize SQLite with WAL mode and ensure foreign key integrity
    dbInstance.exec('PRAGMA foreign_keys = ON;');
    dbInstance.exec('PRAGMA journal_mode = WAL;');
    dbInstance.exec('PRAGMA synchronous = NORMAL;');
  }
  return dbInstance;
}

export function closeDatabase(): void {
  if (dbInstance) {
    dbInstance.close();
    dbInstance = null;
  }
}

// Helpers for parameterized queries
export type QueryParam = string | number | bigint | boolean | null | undefined;

function sanitizeParams(params: QueryParam[]): any[] {
  return params.map((p) => {
    if (typeof p === 'boolean') return p ? 1 : 0;
    if (p === undefined) return null;
    return p;
  });
}

export function queryAll<T = any>(sql: string, params: QueryParam[] = []): T[] {
  const db = getDatabase();
  const stmt = db.prepare(sql);
  return stmt.all(...sanitizeParams(params)) as T[];
}

export function queryOne<T = any>(sql: string, params: QueryParam[] = []): T | undefined {
  const db = getDatabase();
  const stmt = db.prepare(sql);
  return stmt.get(...sanitizeParams(params)) as T | undefined;
}

export function execute(sql: string, params: QueryParam[] = []): { changes: number | bigint; lastInsertRowid: number | bigint } {
  const db = getDatabase();
  const stmt = db.prepare(sql);
  return stmt.run(...sanitizeParams(params));
}

export function executeScript(sqlScript: string): void {
  const db = getDatabase();
  db.exec(sqlScript);
}
