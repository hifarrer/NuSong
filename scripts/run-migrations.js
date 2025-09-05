import { runMigrations } from './deploy-migrations.js';

async function main() {
  try {
    await runMigrations();
    console.log('✅ Database deployment completed successfully');
    process.exit(0);
  } catch (error) {
    console.error('❌ Migration script failed:', error);
    process.exit(1);
  }
}

main();
