import * as client from "openid-client";
import { Strategy, type VerifyFunction } from "openid-client/passport";

import passport from "passport";
import session from "express-session";
import type { Express, RequestHandler } from "express";
import memoize from "memoizee";
import connectPg from "connect-pg-simple";
import { storage } from "./storage";

if (!process.env.REPLIT_DOMAINS) {
  throw new Error("Environment variable REPLIT_DOMAINS not provided");
}

const getOidcConfig = memoize(
  async () => {
    return await client.discovery(
      new URL("https://replit.com/oidc"),
      process.env.REPL_ID!
    );
  },
  { maxAge: 3600 * 1000 }
);

export function getSession() {
  const sessionTtl = 7 * 24 * 60 * 60 * 1000; // 1 week
  
  // Use memory store for development, PostgreSQL for production
  let store;
  if (process.env.NODE_ENV === 'production' && process.env.DATABASE_URL) {
    try {
      const pgStore = connectPg(session);
      store = new pgStore({
        conString: process.env.DATABASE_URL,
        createTableIfMissing: false,
        ttl: sessionTtl,
        tableName: "sessions",
      });
    } catch (error) {
      console.warn('Failed to connect to PostgreSQL session store, using memory store:', error);
      store = undefined; // Use default memory store
    }
  }
  
  return session({
    secret: process.env.SESSION_SECRET!,
    store: store,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
      maxAge: sessionTtl,
    },
  });
}

function updateUserSession(
  user: any,
  tokens: client.TokenEndpointResponse & client.TokenEndpointResponseHelpers
) {
  user.claims = tokens.claims();
  user.access_token = tokens.access_token;
  user.refresh_token = tokens.refresh_token;
  user.expires_at = user.claims?.exp;
}

async function upsertUser(
  claims: any,
) {
  await storage.upsertUser({
    id: claims["sub"],
    email: claims["email"],
    firstName: claims["first_name"],
    lastName: claims["last_name"],
    profileImageUrl: claims["profile_image_url"],
  });
}

export async function setupAuth(app: Express) {
  const config = await getOidcConfig();

  const verify: VerifyFunction = async (
    tokens: client.TokenEndpointResponse & client.TokenEndpointResponseHelpers,
    verified: passport.AuthenticateCallback
  ) => {
    try {
      console.log('OAuth verify callback triggered');
      const claims = tokens.claims();
      if (!claims) {
        throw new Error('No claims received from OAuth provider');
      }
      console.log('User claims:', { sub: claims?.sub, email: claims?.email });
      
      const user = {};
      updateUserSession(user, tokens);
      await upsertUser(claims);
      
      console.log('User successfully verified and upserted');
      verified(null, user);
    } catch (error) {
      console.error('Error in verify callback:', error);
      verified(error);
    }
  };

  const domains = process.env.REPLIT_DOMAINS!.split(",");
  // Add your production domain for external routing
  const allDomains = [...domains, "app.socialscouter.ai"];
  console.log('Registering Replit Auth strategies for domains:', allDomains);
  
  // Register all strategies synchronously
  for (const domain of allDomains) {
    const strategyName = `replitauth:${domain}`;
    const strategy = new Strategy(
      {
        name: strategyName,
        config,
        scope: "openid email profile offline_access",
        callbackURL: `https://${domain}/api/callback`,
      },
      verify,
    );
    passport.use(strategy);
    console.log(`Registered strategy: ${strategyName} with callback: https://${domain}/api/callback`);
  }

  passport.serializeUser((user: Express.User, cb) => cb(null, user));
  passport.deserializeUser((user: Express.User, cb) => cb(null, user));

  // Store domains for use in routes
  (app as any).replitDomains = allDomains;

  app.get("/api/login", (req, res, next) => {
    // Map hostname to appropriate strategy
    let hostname = req.hostname;
    
    // For development domains, use the primary Replit domain
    if (hostname === '127.0.0.1' || hostname === 'localhost') {
      hostname = domains[0]; // Use primary Replit domain
    }
    
    const strategyName = `replitauth:${hostname}`;
    console.log(`Login attempt for hostname: ${req.hostname}, mapped to strategy: ${strategyName}`);
    console.log(`Available domains: ${allDomains.join(', ')}`);
    

    
    try {
      passport.authenticate(strategyName, {
        prompt: "login consent",
        scope: ["openid", "email", "profile", "offline_access"],
      })(req, res, next);
    } catch (error: any) {
      console.error('Authentication error:', error);
      res.status(500).json({ error: 'Authentication failed', details: error?.message || String(error) });
    }
  });

  app.get("/api/callback", (req, res, next) => {
    console.log('=== OAuth Callback Debug Info ===');
    console.log('Callback endpoint hit for hostname:', req.hostname);
    console.log('Query parameters:', req.query);
    console.log('Session ID:', req.sessionID);
    console.log('User in session:', req.user);
    
    // Map hostname to appropriate strategy (same logic as login)
    let hostname = req.hostname;
    
    // For development domains, use the primary Replit domain
    if (hostname === '127.0.0.1' || hostname === 'localhost') {
      hostname = domains[0]; // Use primary Replit domain
    }
    
    const strategyName = `replitauth:${hostname}`;
    console.log(`Callback for hostname: ${req.hostname}, mapped to strategy: ${strategyName}`);
    
    // If no code parameter, something went wrong with OAuth
    if (!req.query.code) {
      console.error('No authorization code received in callback');
      return res.status(400).json({ 
        error: 'OAuth callback missing authorization code',
        query: req.query 
      });
    }
    
    passport.authenticate(strategyName, (err: any, user: any, info: any) => {
      console.log('=== Passport Authenticate Result ===');
      console.log('Error:', err);
      console.log('User:', user);
      console.log('Info:', info);
      
      if (err) {
        console.error('OAuth callback error:', err);
        return res.status(500).json({ error: 'Authentication failed', details: err.message });
      }
      
      if (!user) {
        console.log('No user returned from OAuth, redirecting to login');
        return res.redirect('/api/login');
      }
      
      req.logIn(user, (loginErr) => {
        if (loginErr) {
          console.error('Login error:', loginErr);
          return res.status(500).json({ error: 'Login failed', details: loginErr.message });
        }
        
        console.log('User successfully authenticated and logged in');
        return res.redirect('/');
      });
    })(req, res, next);
  });

  app.get("/api/logout", (req, res) => {
    req.logout(() => {
      res.redirect(
        client.buildEndSessionUrl(config, {
          client_id: process.env.REPL_ID!,
          post_logout_redirect_uri: `${req.protocol}://${req.hostname}`,
        }).href
      );
    });
  });

  // Test endpoint to verify OAuth configuration
  app.get("/api/auth/test", (req, res) => {
    res.json({
      replId: process.env.REPL_ID,
      domains: allDomains,
      strategies: Object.keys((passport as any)._strategies || {}),
      session: {
        id: req.sessionID,
        user: req.user,
        isAuthenticated: req.isAuthenticated()
      }
    });
  });
}

export const isAuthenticated: RequestHandler = async (req, res, next) => {
  const user = req.user as any;

  if (!req.isAuthenticated() || !user.expires_at) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  const now = Math.floor(Date.now() / 1000);
  if (now <= user.expires_at) {
    return next();
  }

  const refreshToken = user.refresh_token;
  if (!refreshToken) {
    res.status(401).json({ message: "Unauthorized" });
    return;
  }

  try {
    const config = await getOidcConfig();
    const tokenResponse = await client.refreshTokenGrant(config, refreshToken);
    updateUserSession(user, tokenResponse);
    return next();
  } catch (error) {
    res.status(401).json({ message: "Unauthorized" });
    return;
  }
};