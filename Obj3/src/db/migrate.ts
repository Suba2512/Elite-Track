import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { executeScript, getDatabase, queryAll } from './database.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export function runMigrations(): void {
  const schemaPath = path.resolve(__dirname, 'schema.sql');
  const schemaSql = fs.readFileSync(schemaPath, 'utf-8');

  console.log('[Migration] Running database migrations on SQLite...');
  getDatabase(); // initialize

  // 1. If opportunities table already exists, alter columns first before executing indexes
  try {
    const existingCols = queryAll<{ name: string }>('PRAGMA table_info(opportunities)').map((c) => c.name);
    if (existingCols.length > 0) {
      const alterCommands: Array<{ col: string; sql: string }> = [
        { col: 'edition', sql: 'ALTER TABLE opportunities ADD COLUMN edition TEXT;' },
        { col: 'event_status', sql: "ALTER TABLE opportunities ADD COLUMN event_status TEXT NOT NULL DEFAULT 'Upcoming';" },
        { col: 'official_event_url', sql: 'ALTER TABLE opportunities ADD COLUMN official_event_url TEXT;' },
        { col: 'source_listing_url', sql: 'ALTER TABLE opportunities ADD COLUMN source_listing_url TEXT;' },
        { col: 'registration_open_date', sql: 'ALTER TABLE opportunities ADD COLUMN registration_open_date TEXT;' },
        { col: 'is_registration_url_valid', sql: 'ALTER TABLE opportunities ADD COLUMN is_registration_url_valid INTEGER NOT NULL DEFAULT 1;' },
        { col: 'link_verified_at', sql: 'ALTER TABLE opportunities ADD COLUMN link_verified_at TEXT;' },
      ];

      for (const cmd of alterCommands) {
        if (!existingCols.includes(cmd.col)) {
          console.log(`[Migration] Adding missing column: ${cmd.col}`);
          executeScript(cmd.sql);
        }
      }
    }
  } catch (err: any) {
    console.warn('[Migration] Note on pre-migration column check:', err.message);
  }

  // 2. Execute full schema script (creates tables, foreign keys, triggers, and indexes)
  executeScript(schemaSql);
  console.log('[Migration] All tables and indexes successfully migrated.');
}

// If invoked directly
if (process.argv[1] === __filename) {
  runMigrations();
}
