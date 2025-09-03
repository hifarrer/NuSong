# Environment Setup for NuSong

## Quick Setup

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Set up environment variables:**
   ```bash
   node setup-env.js
   ```

3. **Edit the `.env` file** with your actual API keys and database credentials.

## Required Environment Variables

### Database Configuration
- `DATABASE_URL` - PostgreSQL connection string
- `PGHOST` - PostgreSQL host
- `PGDATABASE` - Database name
- `PGPASSWORD` - Database password
- `PGPORT` - Database port (default: 5432)

### API Keys
- `RESEND_API_KEY` - Resend email service API key
- `ELEVENLABS_API_KEY` - ElevenLabs text-to-speech API key
- `OPENAI_API_KEY` - OpenAI API key

### Security
- `SESSION_SECRET` - Secret for session encryption

### Object Storage
- `DEFAULT_OBJECT_STORAGE_BUCKET_ID` - Object storage bucket ID
- `PRIVATE_OBJECT_DIR` - Private file storage directory
- `PUBLIC_OBJECT_SEARCH_PATHS` - Public file storage paths

## Security Notes

⚠️ **IMPORTANT:** Never commit your `.env` file or any files containing API keys to version control!

- The `.env` file is already in `.gitignore`
- Use placeholder values in any example files
- Keep your API keys secure and private

## Production Deployment

For production deployment, set these environment variables in your hosting platform's environment configuration (not in files).

## Troubleshooting

If you encounter database connection issues:
1. Verify your database credentials
2. Check that your database is accessible from your network
3. Ensure SSL configuration is correct for your database provider
