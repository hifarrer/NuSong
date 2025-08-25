import { writeFileSync, existsSync } from 'fs';
import { readFileSync } from 'fs';

console.log('🔧 NuMusic Environment Setup');
console.log('============================\n');

// Check if .env already exists
if (existsSync('.env')) {
  console.log('⚠️  .env file already exists. Backing up to .env.backup');
  const currentEnv = readFileSync('.env', 'utf8');
  writeFileSync('.env.backup', currentEnv, 'utf8');
}

// Create .env template with placeholders
const envTemplate = `# Database Configuration
DATABASE_URL=postgresql://username:password@host:port/database
PGHOST=your_postgres_host
PGDATABASE=your_database_name
PGPASSWORD=your_database_password
PGPORT=5432

# API Keys (Replace with your actual keys)
RESEND_API_KEY=your_resend_api_key
ELEVENLABS_API_KEY=your_elevenlabs_api_key
OPENAI_API_KEY=your_openai_api_key

# Security
SESSION_SECRET=your_session_secret

# Object Storage
DEFAULT_OBJECT_STORAGE_BUCKET_ID=your_object_storage_bucket_id
PRIVATE_OBJECT_DIR=your_private_object_dir
PUBLIC_OBJECT_SEARCH_PATHS=your_public_object_search_paths
`;

writeFileSync('.env', envTemplate, 'utf8');

console.log('✅ Created .env file with placeholder values');
console.log('\n📝 Next steps:');
console.log('1. Edit the .env file and replace placeholder values with your actual API keys');
console.log('2. Make sure your .env file is in .gitignore (it should be already)');
console.log('3. Never commit the .env file to version control');
console.log('\n🔒 Security Note: Your API keys and secrets should be kept private!');
