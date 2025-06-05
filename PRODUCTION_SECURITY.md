# Production Security Configuration

## Environment Variables Required

For production deployment, ensure these environment variables are set:

```bash
# Session Security
SESSION_SECRET=your-strong-session-secret-here

# CSRF Protection
CSRF_SECRET=your-csrf-secret-key-here

# Database
DATABASE_URL=your-production-database-url

# Authentication
ISSUER_URL=https://replit.com/oidc
REPL_ID=your-repl-id
REPLIT_DOMAINS=your-custom-domain.com,app.socialscouter.ai

# API Keys (Server-side only)
OPENAI_API_KEY=your-openai-key
AWS_ACCESS_KEY_ID=your-aws-key
AWS_SECRET_ACCESS_KEY=your-aws-secret
AWS_REGION=us-east-1
SCRAPECREATORS_API_KEY=your-scraping-api-key
STRIPE_SECRET_KEY=your-stripe-secret-key
```

## Security Features Implemented

### ✅ HTTPS Configuration
- Automatic HTTPS redirect in production
- HSTS headers with 1-year max age
- Secure cookie configuration

### ✅ CSRF Protection
- CSRF tokens for all state-changing requests
- Automatic token inclusion in API requests
- Webhook endpoints properly excluded

### ✅ Secure Session Management
- HttpOnly cookies
- SameSite=strict in production
- Secure flag enabled in production
- PostgreSQL session store

### ✅ Input Validation & Sanitization
- DOMPurify for XSS prevention
- URL validation with domain whitelisting
- HTTPS-only URL enforcement

### ✅ Rate Limiting
- 100 requests per 15 minutes (general)
- 10 requests per 15 minutes (analysis endpoint)

### ✅ Security Headers
- Content Security Policy
- X-Frame-Options
- X-Content-Type-Options
- Helmet.js comprehensive protection

## Pre-Launch Checklist

- [ ] Generate strong SESSION_SECRET and CSRF_SECRET
- [ ] Configure custom domain in REPLIT_DOMAINS
- [ ] Verify SSL certificate is active
- [ ] Test CSRF protection on all forms
- [ ] Confirm rate limiting is working
- [ ] Run security audit scan
- [ ] Test error handling doesn't expose sensitive data