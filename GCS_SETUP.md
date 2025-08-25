# Google Cloud Storage Setup Guide

## Environment Variables Required

Add these to your `.env` file:

```bash
# Google Cloud Storage Configuration
STORAGE_PROVIDER=gcs
GOOGLE_APPLICATION_CREDENTIALS_JSON={"type":"service_account","project_id":"your-project-id",...}
GCS_BUCKET_NAME=your-bucket-name
```

## How to Get the Credentials JSON

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Navigate to "IAM & Admin" → "Service Accounts"
3. Find your service account or create a new one
4. Click on the service account → "Keys" tab
5. Click "Add Key" → "Create new key" → "JSON"
6. Download the JSON file
7. Copy the entire JSON content and paste it as the value for `GOOGLE_APPLICATION_CREDENTIALS_JSON`

## Testing Your Setup

Run the test script to verify everything works:

```bash
npm run test:gcs
```

## Storage Service Selection

The app will automatically use GCS storage when:
- `STORAGE_PROVIDER=gcs` is set
- `GOOGLE_APPLICATION_CREDENTIALS_JSON` contains valid JSON credentials
- `GCS_BUCKET_NAME` is set to a valid bucket name

If GCS is not configured, it falls back to:
- Local storage for development (`NODE_ENV=development`)
- Render storage for production (`NODE_ENV=production`)

## Benefits of GCS Storage

- ✅ **Mobile App Ready**: Direct HTTPS URLs for mobile apps
- ✅ **Scalable**: Handle thousands of users and files
- ✅ **Reliable**: 99.9% uptime guarantee
- ✅ **Cost Effective**: Pay only for what you use
- ✅ **CDN Ready**: Can be connected to Cloud CDN
- ✅ **Global Access**: Files accessible worldwide

## Security Notes

- Never commit the credentials JSON to Git
- Use environment variables in production
- Consider using IAM roles instead of service account keys for production
- Set up proper CORS configuration if needed
