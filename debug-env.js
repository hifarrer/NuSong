import { config } from 'dotenv';
import { resolve } from 'path';

// Load .env file with explicit path
config({ path: resolve(process.cwd(), '.env') });

console.log('Environment variables check:');
console.log('PGHOST:', process.env.PGHOST);
console.log('PGDATABASE:', process.env.PGDATABASE);
console.log('PGPASSWORD:', process.env.PGPASSWORD);
console.log('PGPORT:', process.env.PGPORT);
console.log('DATABASE_URL:', process.env.DATABASE_URL ? 'Set' : 'Not set');
console.log('DEFAULT_OBJECT_STORAGE_BUCKET_ID:', process.env.DEFAULT_OBJECT_STORAGE_BUCKET_ID ? 'Set' : 'Not set');
console.log('PRIVATE_OBJECT_DIR:', process.env.PRIVATE_OBJECT_DIR ? 'Set' : 'Not set');
console.log('PUBLIC_OBJECT_SEARCH_PATHS:', process.env.PUBLIC_OBJECT_SEARCH_PATHS ? 'Set' : 'Not set');
console.log('RESEND_API_KEY:', process.env.RESEND_API_KEY ? 'Set' : 'Not set');

console.log('\nType checks:');
console.log('PGHOST type:', typeof process.env.PGHOST);
console.log('PGDATABASE type:', typeof process.env.PGDATABASE);
console.log('PGPASSWORD type:', typeof process.env.PGPASSWORD);
console.log('PGPORT type:', typeof process.env.PGPORT);

console.log('\nLength checks:');
console.log('PGHOST length:', process.env.PGHOST?.length);
console.log('PGDATABASE length:', process.env.PGDATABASE?.length);
console.log('PGPASSWORD length:', process.env.PGPASSWORD?.length);
console.log('PGPORT length:', process.env.PGPORT?.length);
