import { Pool } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import * as schema from "@shared/schema";

// Debug: Log database configuration
console.log('🔍 Database configuration:');
console.log('  DATABASE_URL exists:', !!process.env.DATABASE_URL);
console.log('  DATABASE_URL preview:', process.env.DATABASE_URL?.substring(0, 50) + '...');

// Clean the DATABASE_URL (remove any extra quotes or whitespace)
const cleanDatabaseUrl = process.env.DATABASE_URL?.trim().replace(/^["']|["']$/g, '');
console.log('🔍 Cleaned DATABASE_URL:', cleanDatabaseUrl);

// Use DATABASE_URL for consistency with drizzle config
const dbConfig = cleanDatabaseUrl ? {
  connectionString: cleanDatabaseUrl,
  ssl: {
    rejectUnauthorized: false
  }
} : {
  host: process.env.PGHOST,
  port: parseInt(process.env.PGPORT || '5432'),
  database: process.env.PGDATABASE,
  user: process.env.PGUSER || 'postgres',
  password: process.env.PGPASSWORD,
  ssl: {
    rejectUnauthorized: false
  }
};

console.log('🔍 Using dbConfig:', cleanDatabaseUrl ? 'DATABASE_URL' : 'individual env vars');

if (!cleanDatabaseUrl && (!dbConfig.host || !dbConfig.database || !dbConfig.password)) {
  throw new Error(
    "Database configuration incomplete. Please check DATABASE_URL or PGHOST, PGDATABASE, and PGPASSWORD environment variables.",
  );
}

export const pool = new Pool(dbConfig);
export const db = drizzle({ client: pool, schema });