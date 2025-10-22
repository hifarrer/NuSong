# NuSong

## Overview

NuSong is a full-stack web application that enables users to generate AI-powered music using ElevenLabs AI music generation service. Users can input musical tags, lyrics, and specify duration to create custom audio tracks. The application features a modern React frontend with shadcn/ui components and an Express.js backend with PostgreSQL database integration.

## User Preferences

Preferred communication style: Simple, everyday language.

## Project Configuration

**Production Domain**: nusong.ai  
**Development Environment**: Replit workspace  
**Webhook Endpoints**: Configured for nusong.ai domain

## Subscription Plans

The platform offers three subscription tiers:

- **Free Plan**: Up to 5 songs per week, standard quality, public sharing only
- **Basic Plan**: Up to 30 songs per week, high quality, private/public sharing ($2.08/week, $9/month, or $90/year)
- **Premium Plan**: Up to 100 songs per week, ultra-high quality, priority generation, commercial license ($4.39/week, $19/month, or $190/year)

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript
- **Build Tool**: Vite for fast development and optimized builds
- **UI Library**: shadcn/ui components built on Radix UI primitives
- **Styling**: Tailwind CSS with custom design tokens and CSS variables
- **State Management**: TanStack Query for server state management
- **Routing**: Wouter for lightweight client-side routing
- **Form Handling**: React Hook Form with Zod validation

### Backend Architecture
- **Runtime**: Node.js with Express.js framework
- **Language**: TypeScript with ES modules
- **Authentication**: Replit Auth with OpenID Connect integration
- **Session Management**: Express sessions with PostgreSQL storage
- **API Design**: RESTful endpoints with structured error handling
- **Request Logging**: Custom middleware for API request/response logging

### Data Layer
- **Database**: PostgreSQL with Neon serverless driver
- **ORM**: Drizzle ORM for type-safe database operations
- **Schema Management**: Drizzle Kit for migrations and schema changes
- **Connection**: Connection pooling with @neondatabase/serverless

### Authentication & Authorization
- **Provider**: Custom database-driven authentication system
- **Password Security**: bcrypt hashing with salt rounds for secure password storage
- **Session Management**: Express sessions with PostgreSQL storage
- **User Management**: Complete user registration and login with email/password
- **Route Protection**: Middleware-based authentication checks with requireAuth
- **Auth Endpoints**: `/api/auth/login`, `/api/auth/register`, `/api/auth/logout`, `/api/auth/user`

### External Dependencies

- **AI Service**: FAL.ai for music generation using the ace-step model
- **Database**: Neon PostgreSQL for data persistence
- **Authentication**: Custom database-driven auth system with bcrypt password hashing
- **Email Service**: Resend for transactional email delivery (verification and welcome emails)
- **Font Services**: Google Fonts for typography (Inter, Architects Daughter, DM Sans, Fira Code, Geist Mono)
- **Development**: Replit-specific tooling for development environment integration

### Key Design Decisions

**Monorepo Structure**: Single repository with separate client, server, and shared directories for code organization and type sharing.

**Type Safety**: Full TypeScript implementation with shared types between frontend and backend, validated using Zod schemas.

**Component Architecture**: Modular UI components using shadcn/ui for consistency and maintainability.

**Database Design**: Normalized schema with separate tables for users, sessions, music generations, admin users, subscription plans, and site settings to support scalability.

**Authentication System**: Custom-built authentication with secure password hashing, session management, email verification requirements, and comprehensive form validation.

**Email Verification**: Mandatory email verification system using Resend service with professional branded email templates, token-based verification, and automated welcome emails.

**Error Handling**: Centralized error handling with structured responses and proper HTTP status codes.

**Development Experience**: Hot reloading, runtime error overlays, and Replit-specific development tools for improved productivity.

## Storage Configuration

### Google Cloud Storage (GCS) Setup

The application supports multiple storage backends with automatic fallback:

1. **Google Cloud Storage** (Recommended for production)
2. **Local File Storage** (Development fallback)
3. **Render File Storage** (Production fallback)

#### GCS Configuration

To use Google Cloud Storage for file storage:

1. **Create a Google Cloud Project**:
   - Go to [Google Cloud Console](https://console.cloud.google.com/)
   - Create a new project or select existing one
   - Enable the Cloud Storage API

2. **Create a Storage Bucket**:
   - Navigate to "Cloud Storage" → "Buckets"
   - Create a new bucket with globally unique name
   - Choose location closest to your users
   - Set storage class to "Standard"

3. **Create Service Account**:
   - Go to "IAM & Admin" → "Service Accounts"
   - Create new service account with name like "nusong-storage"
   - Add roles: "Storage Object Admin" and "Storage Object Viewer"
   - Create and download JSON key file

4. **Configure Environment Variables**:
   ```bash
   # Add to your .env file
   STORAGE_PROVIDER=gcs
   GOOGLE_APPLICATION_CREDENTIALS_JSON={"type":"service_account","project_id":"your-project-id",...}
   GCS_BUCKET_NAME=your-bucket-name
   ```

5. **Test Configuration**:
   ```bash
   npm run test:gcs
   ```

#### Storage Service Selection

The app automatically selects the appropriate storage service:

- **GCS Storage**: When `STORAGE_PROVIDER=gcs` and credentials are configured
- **Local Storage**: Development fallback (`NODE_ENV=development`)
- **Render Storage**: Production fallback (`NODE_ENV=production`)

#### Benefits of GCS Storage

- ✅ **Mobile App Ready**: Direct HTTPS URLs for mobile apps
- ✅ **Scalable**: Handle thousands of users and files
- ✅ **Reliable**: 99.9% uptime guarantee
- ✅ **Cost Effective**: Pay only for what you use (~$0.02/GB/month)
- ✅ **CDN Ready**: Can be connected to Cloud CDN
- ✅ **Global Access**: Files accessible worldwide

#### Security Best Practices

- Never commit service account keys to Git
- Use environment variables in production
- Consider IAM roles instead of service account keys for production
- Set up proper CORS configuration if needed
- Regularly rotate service account keys

#### File Structure

Generated files are organized in the bucket:
- `uploads/` - User uploaded files
- `generated/` - AI-generated music files

#### Troubleshooting

If GCS is not working:
1. Verify environment variables are set correctly
2. Check service account permissions
3. Ensure bucket exists and is accessible
4. Run `npm run test:gcs` to diagnose issues