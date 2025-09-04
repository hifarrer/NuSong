# Google OAuth Setup Guide

This guide will walk you through setting up Google Sign-In for your NuSong application.

## Prerequisites

- A Google account
- Access to the Google Cloud Console
- Your NuSong application running locally or deployed

## Step 1: Create a Google Cloud Project

1. Go to the [Google Cloud Console](https://console.cloud.google.com/)
2. Click on the project dropdown at the top of the page
3. Click "New Project"
4. Enter a project name (e.g., "NuSong App")
5. Click "Create"

## Step 2: Enable Google+ API

1. In the Google Cloud Console, go to "APIs & Services" > "Library"
2. Search for "Google+ API" or "Google Identity"
3. Click on "Google+ API" and then click "Enable"
4. Also enable "Google Identity Services API" if available

## Step 3: Configure OAuth Consent Screen

1. Go to "APIs & Services" > "OAuth consent screen"
2. Choose "External" user type (unless you have a Google Workspace account)
3. Click "Create"
4. Fill in the required fields:
   - **App name**: NuSong
   - **User support email**: Your email address
   - **Developer contact information**: Your email address
5. Click "Save and Continue"
6. On the "Scopes" page, click "Add or Remove Scopes"
7. Add these scopes:
   - `../auth/userinfo.email`
   - `../auth/userinfo.profile`
8. Click "Update" then "Save and Continue"
9. On the "Test users" page, add your email address as a test user
10. Click "Save and Continue"

## Step 4: Create OAuth 2.0 Credentials

1. Go to "APIs & Services" > "Credentials"
2. Click "Create Credentials" > "OAuth 2.0 Client IDs"
3. Choose "Web application" as the application type
4. Enter a name (e.g., "NuSong Web Client")
5. Add authorized JavaScript origins:
   - For development: `http://localhost:5000`
   - For production: `https://yourdomain.com`
6. Add authorized redirect URIs:
   - For development: `http://localhost:5000/api/auth/google/callback`
   - For production: `https://yourdomain.com/api/auth/google/callback`
7. Click "Create"
8. Copy the **Client ID** and **Client Secret** (you'll need these for your environment variables)

## Step 5: Configure Environment Variables

Add these environment variables to your `.env` file:

```env
# Google OAuth Configuration
GOOGLE_CLIENT_ID=your_google_client_id_here
GOOGLE_CLIENT_SECRET=your_google_client_secret_here
GOOGLE_REDIRECT_URI=http://localhost:5000/api/auth/google/callback

# Frontend Google Client ID (for the Google Sign-In button)
VITE_GOOGLE_CLIENT_ID=your_google_client_id_here

# Base URL for your application
BASE_URL=http://localhost:5000
```

**Important Notes:**
- The `GOOGLE_CLIENT_ID` and `VITE_GOOGLE_CLIENT_ID` should be the same value
- The `VITE_` prefix makes the variable available in the frontend
- Update the URLs for production deployment

## Step 6: Database Migration

The Google OAuth integration requires new database fields. Run this SQL migration:

```sql
-- Add Google OAuth fields to users table
ALTER TABLE users 
ADD COLUMN google_id VARCHAR UNIQUE,
ADD COLUMN google_email VARCHAR,
ADD COLUMN google_name VARCHAR,
ADD COLUMN google_picture VARCHAR,
ADD COLUMN auth_method VARCHAR NOT NULL DEFAULT 'email';

-- Make password_hash optional for Google OAuth users
ALTER TABLE users ALTER COLUMN password_hash DROP NOT NULL;

-- Add index for Google ID lookups
CREATE INDEX idx_users_google_id ON users(google_id);
```

## Step 7: Test the Integration

1. Start your application: `npm run dev`
2. Go to the login/register page
3. You should see a "Sign in with Google" button
4. Click the button and test the OAuth flow
5. Verify that:
   - New users are created with Google information
   - Existing users with the same email are synced
   - Email verification is automatically set to true for Google users

## Features Implemented

### Account Syncing
- If a user signs in with Google using an email that already exists in your database, the accounts will be automatically synced
- The user can then sign in using either email/password or Google OAuth
- The `authMethod` field tracks whether a user uses 'email', 'google', or 'both'

### Email Verification Bypass
- Google OAuth users are automatically marked as email verified
- No email verification step is required for Google sign-ins

### User Data Storage
- Google profile information (name, email, picture) is stored in the database
- Users can update their profile information through your app

## Troubleshooting

### Common Issues

1. **"Google authentication not available" error**
   - Check that `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` are set in your environment variables
   - Verify the Google Cloud project has the correct APIs enabled

2. **"Invalid Google token" error**
   - Ensure the `VITE_GOOGLE_CLIENT_ID` matches your Google Client ID
   - Check that the authorized JavaScript origins include your domain

3. **Redirect URI mismatch**
   - Verify the redirect URI in Google Cloud Console matches your `GOOGLE_REDIRECT_URI` environment variable
   - Make sure the protocol (http/https) matches

4. **Google Sign-In button not appearing**
   - Check browser console for JavaScript errors
   - Verify the Google Identity Services script is loading
   - Ensure `VITE_GOOGLE_CLIENT_ID` is set

### Development vs Production

For production deployment:

1. Update the authorized origins and redirect URIs in Google Cloud Console
2. Update your environment variables with production URLs
3. Ensure your domain has HTTPS enabled (required for production OAuth)

## Security Considerations

1. **Never expose your Client Secret** in frontend code
2. **Use HTTPS in production** - Google OAuth requires secure connections
3. **Validate tokens server-side** - Always verify Google tokens on your backend
4. **Handle token expiration** - Implement proper error handling for expired tokens

## Additional Resources

- [Google Identity Services Documentation](https://developers.google.com/identity/gsi/web)
- [Google OAuth 2.0 Documentation](https://developers.google.com/identity/protocols/oauth2)
- [Google Cloud Console](https://console.cloud.google.com/)
