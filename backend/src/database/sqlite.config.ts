import sqlite3 from 'sqlite3';
import { open, Database } from 'sqlite';
import fs from 'fs/promises';
import path from 'path';

type TColumnType = 'TEXT' | 'INTEGER' | 'REAL';

/*
    Map a JSON field to a sqlite column type.
    Everything that is not a number is stored as TEXT.
*/
function inferColumnType(value: unknown): TColumnType {
    if (typeof value === 'number') {
        return Number.isInteger(value) ? 'INTEGER' : 'REAL';
    }
    return 'TEXT';
}

/*
    Columns are derived from the rows themselves instead of being hand-copied,
    which is what allowed the previous customer_name / event_date drift.
*/
export function inferColumns(rows: Record<string, unknown>[], primaryKey: string): Record<string, TColumnType> {
    const columns: Record<string, TColumnType> = {};
    for (const row of rows) {
        for (const [key, value] of Object.entries(row)) {
            if (value === null || value === undefined) continue;
            if (!columns[key]) columns[key] = inferColumnType(value);
        }
    }
    if (!columns[primaryKey]) {
        throw new Error(`Primary key column "${primaryKey}" not found in source data`);
    }
    return columns;
}

function quoteIdentifier(identifier: string): string {
    return `"${identifier.replace(/"/g, '""')}"`;
}

/*
    Rebuild a sqlite database from a json fixture.
    The table is dropped and recreated on every boot so the schema always
    matches the current fixture (INSERT OR REPLACE would silently keep a stale schema).
*/
export async function buildDatabaseFromJson(
    jsonPath: string,
    dbPath: string,
    tableName: string,
    primaryKey: string
): Promise<void> {
    const raw = await fs.readFile(jsonPath, 'utf-8');
    const rows: Record<string, unknown>[] = JSON.parse(raw);
    if (rows.length === 0) {
        throw new Error(`No rows found in ${jsonPath}`);
    }

    const columns = inferColumns(rows, primaryKey);
    const columnNames = Object.keys(columns);

    await fs.mkdir(path.dirname(dbPath), { recursive: true });
    const db = await open({ filename: dbPath, driver: sqlite3.Database });

    try {
        await db.exec(`DROP TABLE IF EXISTS ${quoteIdentifier(tableName)}`);

        const columnDefinitions = columnNames.map((name) => {
            const constraints = name === primaryKey ? ' PRIMARY KEY' : '';
            return `${quoteIdentifier(name)} ${columns[name]}${constraints}`;
        });

        await db.exec(`
            CREATE TABLE ${quoteIdentifier(tableName)} (
                ${columnDefinitions.join(',\n                ')}
            );
        `);

        const placeholders = columnNames.map(() => '?').join(', ');
        const insertStatement = await db.prepare(`
            INSERT INTO ${quoteIdentifier(tableName)}
            (${columnNames.map(quoteIdentifier).join(', ')})
            VALUES (${placeholders})
        `);

        try {
            await db.exec('BEGIN');
            try {
                for (const row of rows) {
                    try {
                        await insertStatement.run(columnNames.map((name) => row[name] ?? null));
                    } catch (error) {
                        throw new Error(
                            `Failed to insert ${primaryKey}=${String(row[primaryKey])} into ${tableName}: ${(error as Error).message}`,
                            { cause: error }
                        );
                    }
                }
                await db.exec('COMMIT');
            } catch (error) {
                await db.exec('ROLLBACK');
                throw error;
            }
        } finally {
            await insertStatement.finalize();
        }
    } finally {
        await db.close();
    }
}

/*
    Read-only connection with a small statement cache used by the mock APIs.
*/
export class DocumentStore {
    private m_db: Database;

    private constructor(db: Database) {
        this.m_db = db;
    }

    public static async open(dbPath: string): Promise<DocumentStore> {
        try {
            await fs.access(dbPath);
        } catch {
            throw new Error(`Database not found at ${dbPath}. Run "npm run db:generate" first.`);
        }
        const db = await open({ filename: dbPath, driver: sqlite3.Database, mode: sqlite3.OPEN_READONLY });
        return new DocumentStore(db);
    }

    public findByVin<T>(tableName: string, vin: string, orderByColumn: string): Promise<T[]> {
        return this.m_db.all<T[]>(
            `SELECT * FROM ${quoteIdentifier(tableName)} WHERE vin = ? ORDER BY ${quoteIdentifier(orderByColumn)} DESC`,
            [vin]
        );
    }

    public async close(): Promise<void> {
        await this.m_db.close();
    }
}
