import type { Express, RequestHandler } from "express";
import { storage } from "./storage";

// Development authentication bypass
export const devAuthBypass: RequestHandler = async (req: any, res, next) => {
  if (process.env.NODE_ENV !== 'development') {
    return next();
  }

  // Create a mock user for development
  const mockUser = {
    claims: {
      sub: "dev-user-123",
      email: "dev@example.com",
      first_name: "Dev",
      last_name: "User",
      profile_image_url: null
    },
    access_token: "dev-token",
    expires_at: Math.floor(Date.now() / 1000) + 3600 // 1 hour from now
  };

  // Ensure the mock user exists in the database
  try {
    await storage.upsertUser({
      id: mockUser.claims.sub,
      email: mockUser.claims.email,
      firstName: mockUser.claims.first_name,
      lastName: mockUser.claims.last_name,
      profileImageUrl: mockUser.claims.profile_image_url,
    });
  } catch (error) {
    console.error("Error creating mock user:", error);
  }

  req.user = mockUser;
  req.isAuthenticated = () => true;
  next();
};

export function setupDevAuth(app: Express) {
  if (process.env.NODE_ENV === 'development') {
    console.log("🔧 Development mode: Authentication bypass enabled");
    
    // Add development routes
    app.get('/api/auth/user', devAuthBypass, async (req: any, res) => {
      try {
        const userId = req.user.claims.sub;
        const user = await storage.getUser(userId);
        res.json(user);
      } catch (error) {
        console.error("Error fetching user:", error);
        res.status(500).json({ message: "Failed to fetch user" });
      }
    });

    app.get('/api/login', (req, res) => {
      res.redirect('/');
    });

    app.get('/api/logout', (req, res) => {
      res.redirect('/');
    });
  }
}