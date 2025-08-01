import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import { csrfMiddleware } from "./lib/csrf-middleware";

const app = express();

// Security headers with production HTTPS enforcement
app.use(helmet({
  contentSecurityPolicy: process.env.NODE_ENV === 'production' ? {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      scriptSrc: ["'self'", "'unsafe-eval'", "https://firebase.googleapis.com"],
      imgSrc: ["'self'", "data:", "https:", "https://firebase.googleapis.com"],
      connectSrc: ["'self'", "ws:", "wss:", "https://*.googleapis.com", "https://*.google.com", "https://identitytoolkit.googleapis.com", "https://firebase.googleapis.com", "https://*.firebaseio.com", "https://*.firebase.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"],
      frameAncestors: ["'none'"],
    },
  } : false,
  crossOriginEmbedderPolicy: false,
  hsts: process.env.NODE_ENV === 'production' ? {
    maxAge: 31536000, // 1 year
    includeSubDomains: true,
    preload: true
  } : false
}));

// Force HTTPS in production
if (process.env.NODE_ENV === 'production') {
  app.use((req, res, next) => {
    const forwarded = req.headers['x-forwarded-proto'];
    if (forwarded && forwarded !== 'https') {
      return res.redirect(301, `https://${req.get('Host')}${req.url}`);
    }
    next();
  });
}

// Rate limiting with trust proxy for Replit environment
app.set('trust proxy', 1);

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: {
    error: "Too many requests",
    message: "Please try again later"
  },
  standardHeaders: true,
  legacyHeaders: false,
  trustProxy: true,
});

// Apply rate limiting to all requests
app.use(limiter);

// Stricter rate limiting for analysis endpoint
const analysisLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // Limit each IP to 10 analysis requests per windowMs
  message: {
    error: "Analysis rate limit exceeded",
    message: "Please wait before analyzing more videos"
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Special handling for Stripe webhook - needs raw body
app.use('/api/stripe/webhook', express.raw({ type: 'application/json' }));

// Apply analysis rate limiter to analysis endpoint
app.use('/api/analyze', analysisLimiter);

// JSON parsing for all other routes
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: false, limit: '10mb' }));

// CSRF protection for all routes except webhooks and health checks
app.use((req, res, next) => {
  // Skip CSRF for webhooks, health checks, and admin routes
  if (req.path.startsWith('/api/stripe/webhook') || 
      req.path === '/api/health' ||
      req.path.startsWith('/api/admin/')) {
    return next();
  }
  csrfMiddleware(req, res, next);
});

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

(async () => {
  const server = await registerRoutes(app);

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    
    // Sanitize error messages to prevent information disclosure
    let message: string;
    if (status >= 400 && status < 500) {
      // Client errors - can show specific message
      message = err.message || "Bad Request";
    } else {
      // Server errors - generic message only
      message = "Internal Server Error";
      // Log the actual error for debugging
      console.error("Server error:", err);
    }

    res.status(status).json({ 
      error: message,
      ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
    });
  });

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  // ALWAYS serve the app on port 5000
  // this serves both the API and the client.
  // It is the only port that is not firewalled.
  const port = 5000;
  server.listen({
    port,
    host: "0.0.0.0",
    reusePort: true,
  }, () => {
    log(`serving on port ${port}`);
  });
})();
