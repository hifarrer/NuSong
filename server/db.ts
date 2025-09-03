import { Pool } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import * as schema from "@shared/schema";

// Use environment variables
const dbConfig = {
  host: process.env.PGHOST,
  port: parseInt(process.env.PGPORT || '5432'),
  database: process.env.PGDATABASE,
  user: process.env.PGUSER || 'postgres',
  password: process.env.PGPASSWORD,
  ssl: {
    rejectUnauthorized: false
  }
};

if (!dbConfig.host || !dbConfig.database || !dbConfig.password) {
  throw new Error(
    "Database configuration incomplete. Please check PGHOST, PGDATABASE, and PGPASSWORD environment variables.",
  );
}

export const pool = new Pool(dbConfig);
export const db = drizzle({ client: pool, schema });