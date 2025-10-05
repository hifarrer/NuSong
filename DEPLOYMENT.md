# Database Migration Deployment Guide

This guide explains how database migrations are automatically handled during deployment.

## Automatic Migration on Server Startup

The server automatically runs database migrations when it starts up. This happens in the following order:

1. **Database Migrations** - Runs all pending migrations (production only)
2. **Album Backfill** - Ensures all users have default albums
3. **Server Routes** - Starts the application

**Note**: Migrations are automatically skipped when running locally to avoid connection timeouts to production databases.

## Migration Script

The `scripts/deploy-migrations.js` script handles all database changes:

### Migration 1: Username Column
- Adds `username` column to `users` table
- Makes it unique and nullable

### Migration 2: Generate Usernames
- Generates usernames for existing users
- Format: `firstname + lastname` (lowercase, alphanumeric only)
- Ensures uniqueness by adding numbers if needed

### Migration 3: Shareable Links Table
- Creates `shareable_links` table
- Links albums to shareable tokens

## Manual Migration Commands

If you need to run migrations manually:

```bash
# Run all migrations
npm run db:migrate

# Or run the script directly
node scripts/deploy-migrations.js
```

## Deployment Process

### For Production Deployment:

1. **Deploy Code**: Push your code to production
2. **Automatic Migration**: Server startup will run migrations automatically
3. **Check Logs**: Look for migration success messages in server logs

### Expected Log Output:

**Production Deployment:**
```
🚀 Starting database migrations...
🔌 Testing database connection...
✅ Database connection successful
📝 Migration 1: Adding username column...
✅ Username column added successfully
👤 Migration 2: Generating usernames for existing users...
  Generated username: johnsmith for John Smith
  Generated username: janedoe for Jane Doe
✅ Generated 2 usernames
🔗 Migration 3: Creating shareable_links table...
✅ Shareable links table created successfully
🎉 All migrations completed successfully!
```

**Local Development:**
```
🚀 Starting database migrations...
🏠 Running locally - skipping migrations (will run on production deployment)
🏠 Running locally - skipping album backfill (database not accessible)
🏠 Running locally - skipping admin initialization (database not accessible)
```

## Error Handling

- **Migration Failures**: Server will log errors but continue startup
- **Duplicate Usernames**: Automatically resolved with number suffixes
- **Missing Tables**: Created automatically if they don't exist

## Rollback

If you need to rollback changes:

1. **Username Column**: Can be dropped manually if needed
2. **Shareable Links**: Table can be dropped if not needed
3. **Generated Usernames**: Can be cleared by setting to NULL

## Environment Variables

Ensure these are set in production:

- `DATABASE_URL` - PostgreSQL connection string (with SSL support)
- All other existing environment variables

**Note**: The system now uses `DATABASE_URL` for database connections with SSL enabled automatically.

## Monitoring

After deployment, check:

1. **Server Logs**: Look for migration success messages
2. **Database**: Verify tables exist and usernames are generated
3. **Application**: Test public profiles and shareable links

## Troubleshooting

### Common Issues:

1. **SSL/TLS Required**: Fixed - SSL is now enabled automatically
2. **Connection Timeout**: Check `DATABASE_URL` and network access
3. **Permission Errors**: Ensure database user has CREATE/ALTER permissions
4. **Duplicate Usernames**: Should be handled automatically
5. **Column Not Found**: Fixed - migrations now run before album backfill

### Manual Fixes:

```sql
-- Check if username column exists
SELECT column_name FROM information_schema.columns 
WHERE table_name = 'users' AND column_name = 'username';

-- Check if shareable_links table exists
SELECT table_name FROM information_schema.tables 
WHERE table_name = 'shareable_links';

-- Generate missing usernames manually
UPDATE users SET username = LOWER(REPLACE(first_name || last_name, ' ', '')) 
WHERE username IS NULL;
```

## Next Steps

After successful deployment:

1. Test public profile functionality
2. Test shareable album links
3. Verify username generation worked correctly
4. Monitor for any issues in production logs

.