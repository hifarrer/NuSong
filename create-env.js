import { writeFileSync } from 'fs';

const envContent = `DATABASE_URL=postgresql://numusicuser:7w3PcD7S0u3xkhMlZyRRQtWCU6rVXtAQ@dpg-d2lpkeruibrs73fh0ar0-a.oregon-postgres.render.com/numusicdb
PGHOST=dpg-d2lpkeruibrs73fh0ar0-a.oregon-postgres.render.com
PGDATABASE=numusicdb
PGPASSWORD=7w3PcD7S0u3xkhMlZyRRQtWCU6rVXtAQ
PGPORT=5432
RESEND_API_KEY=re_3YMYnHZt_5GdjBKDsVD9DEAs3vVHdG27N
ELEVENLABS_API_KEY=sk_d5323a3d63a97aadc7fa918bab31b4cf830fe8ef6a648d88
OPENAI_API_KEY=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
SESSION_SECRET=/Xo/SxhdskQPXm0M5wUCpibXOSsIrwsuKuOeUmUI3LMyy1AyPlBexfKncj8cd9IpbFuI6GvsQWJn7LicF3xgNw==
DEFAULT_OBJECT_STORAGE_BUCKET_ID=replit-objstore-2325db84-4326-4ff5-8712-7f1e59d7edff
PRIVATE_OBJECT_DIR=/replit-objstore-2325db84-4326-4ff5-8712-7f1e59d7edff/.private
PUBLIC_OBJECT_SEARCH_PATHS=/replit-objstore-2325db84-4326-4ff5-8712-7f1e59d7edff/public
`;

writeFileSync('.env', envContent, 'utf8');
console.log('✅ .env file created successfully with all production variables!');
