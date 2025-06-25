# SocialScouter AI - Video Sentiment Analysis Platform

## Overview

SocialScouter AI is a comprehensive web application that analyzes sentiment in social media videos from TikTok, Instagram Reels, and YouTube Shorts. The platform provides batch analysis capabilities with detailed sentiment scoring, user management, subscription billing, and comprehensive analytics.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript
- **Styling**: Tailwind CSS with custom design system
- **UI Components**: Radix UI primitives with shadcn/ui components
- **State Management**: TanStack Query for server state management
- **Routing**: Wouter for client-side routing
- **Build Tool**: Vite with custom configuration

### Backend Architecture
- **Runtime**: Node.js with Express.js
- **Language**: TypeScript with ESM modules
- **Authentication**: Firebase Auth (OAuth-based)
- **Database**: PostgreSQL with Drizzle ORM
- **Session Management**: Express sessions with PostgreSQL store
- **Security**: Helmet.js, CSRF protection, rate limiting

### Data Storage Solutions
- **Primary Database**: PostgreSQL via Neon serverless
- **ORM**: Drizzle with type-safe schema definitions
- **Session Store**: PostgreSQL-based session storage
- **Schema Management**: Drizzle Kit for migrations

## Key Components

### Authentication and Authorization
- Firebase Authentication with Google OAuth provider
- JWT token-based authentication with Firebase Admin SDK verification
- User profile management with Stripe customer integration
- Role-based access control for subscription tiers

### Sentiment Analysis Engine
- Multi-provider sentiment analysis (AWS Comprehend, OpenAI, local fallback)
- Transcript extraction via ScrapeCreators API
- Batch processing capabilities with configurable limits
- Confidence scoring and detailed sentiment breakdowns

### Subscription and Billing
- Stripe integration for payment processing
- Tiered subscription plans (Starter, Business, Enterprise)
- Usage tracking and enforcement
- Monthly limits with automatic reset functionality

### Security Framework
- HTTPS enforcement in production with HSTS headers
- CSRF token protection for state-changing operations
- Input validation and sanitization using DOMPurify
- Rate limiting with tier-based restrictions
- SQL injection prevention through parameterized queries

## Data Flow

1. **User Authentication**: OAuth flow through Firebase Auth service
2. **Video Analysis Request**: User submits batch of video URLs
3. **Transcript Extraction**: ScrapeCreators API fetches video transcripts
4. **Sentiment Analysis**: Multi-provider analysis with fallback chain
5. **Data Storage**: Results stored in PostgreSQL with batch metadata
6. **Response Delivery**: Formatted results with visualizations and statistics

## External Dependencies

### Core Services
- **Database**: Neon PostgreSQL serverless
- **Authentication**: Firebase OAuth service
- **Payment Processing**: Stripe API
- **Sentiment Analysis**: AWS Comprehend, OpenAI API
- **Transcript Extraction**: ScrapeCreators API

### Development Tools
- **Build System**: Vite with React plugin
- **Type Checking**: TypeScript strict mode
- **Code Quality**: ESLint configuration
- **Package Management**: npm with lockfile

## Deployment Strategy

### Production Environment
- **Platform**: Replit autoscale deployment
- **Build Process**: Vite production build + esbuild server bundling
- **Environment Variables**: Comprehensive security configuration
- **Monitoring**: Built-in error handling with sanitized responses

### Security Configuration
- Production HTTPS enforcement with redirect
- Secure session configuration (HttpOnly, Secure, SameSite)
- Content Security Policy with domain restrictions
- Rate limiting and DDoS protection

## User Preferences

Preferred communication style: Simple, everyday language.

## Recent Changes

- June 25, 2025: Firebase Authentication integration completed
  - Replaced Replit Auth with Firebase Auth using Google OAuth
  - Updated frontend to use Firebase SDK for authentication flow
  - Implemented Firebase Admin SDK for backend token verification
  - Updated all API endpoints to support Firebase authentication
  - Modified query client to automatically include Firebase JWT tokens

## Changelog

Changelog:
- June 25, 2025. Initial setup