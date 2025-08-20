# AI Music Studio

## Overview

AI Music Studio is a full-stack web application that enables users to generate AI-powered music using FAL.ai's music generation service. Users can input musical tags, lyrics, and specify duration to create custom audio tracks. The application features a modern React frontend with shadcn/ui components and an Express.js backend with PostgreSQL database integration.

## User Preferences

Preferred communication style: Simple, everyday language.

## Subscription Plans

The platform offers three subscription tiers:

- **Free Plan**: Up to 5 songs per month, standard quality, public sharing only
- **Basic Plan**: Up to 30 songs per month, high quality, private/public sharing ($9/month or $90/year)
- **Premium Plan**: Up to 200 songs per month, ultra-high quality, priority generation, commercial license ($19/month or $190/year)

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
- **Provider**: Replit Auth using OpenID Connect protocol
- **Session Storage**: PostgreSQL-backed sessions with connect-pg-simple
- **User Management**: Automatic user creation/update on authentication
- **Route Protection**: Middleware-based authentication checks

### External Dependencies

- **AI Service**: FAL.ai for music generation using the ace-step model
- **Database**: Neon PostgreSQL for data persistence
- **Authentication**: Replit Auth service for user management
- **Font Services**: Google Fonts for typography (Inter, Architects Daughter, DM Sans, Fira Code, Geist Mono)
- **Development**: Replit-specific tooling for development environment integration

### Key Design Decisions

**Monorepo Structure**: Single repository with separate client, server, and shared directories for code organization and type sharing.

**Type Safety**: Full TypeScript implementation with shared types between frontend and backend, validated using Zod schemas.

**Component Architecture**: Modular UI components using shadcn/ui for consistency and maintainability.

**Database Design**: Normalized schema with separate tables for users, sessions, and music generations to support scalability.

**Error Handling**: Centralized error handling with structured responses and proper HTTP status codes.

**Development Experience**: Hot reloading, runtime error overlays, and Replit-specific development tools for improved productivity.