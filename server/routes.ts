import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { analyzeVideosSchema, type AnalyzeVideosRequest, type AnalyzeVideosResponse } from "@shared/schema";
import { ZodError } from "zod";
import { TranscriptService } from "./lib/transcript-service";
import { SentimentService } from "./lib/sentiment-service";
import { planLimitsService } from "./lib/plan-limits-service";
import { body, validationResult } from "express-validator";
import { InputSanitizer } from "./lib/input-sanitizer";
import { getCsrfToken } from "./lib/csrf-middleware";
import Stripe from "stripe";

if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error('Missing required Stripe secret: STRIPE_SECRET_KEY');
}
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: "2025-04-30.basil",
});

// Helper function to extract plan from price ID
function getPlanFromPriceId(priceId: string): string | null {
  // Map Stripe price IDs to plan names
  const priceToPlans: { [key: string]: string } = {
    'price_starter_monthly': 'starter',
    'price_starter_yearly': 'starter',
    'price_business_monthly': 'business', 
    'price_business_yearly': 'business',
    'price_enterprise_monthly': 'enterprise',
    'price_enterprise_yearly': 'enterprise'
  };
  
  return priceToPlans[priceId] || null;
}

export async function registerRoutes(app: Express): Promise<Server> {
  const transcriptService = new TranscriptService();
  const sentimentService = new SentimentService();

  // Temporary: No authentication middleware (will be reimplemented)
  const authMiddleware = (req: any, res: any, next: any) => next();

  // Auth routes (temporarily disabled - will be reimplemented)
  app.get('/api/auth/user', authMiddleware, async (req: any, res) => {
    res.status(401).json({ message: "Authentication not configured" });
  });

  // Health check endpoint
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", timestamp: new Date().toISOString() });
  });

  // CSRF token endpoint
  app.get("/api/csrf-token", (req: any, res) => {
    const token = req.csrfToken ? req.csrfToken() : getCsrfToken();
    res.json({ csrfToken: token });
  });

  // Analyze videos endpoint - temporarily disabled
  app.post("/api/analyze", authMiddleware, async (req: any, res) => {
    res.status(401).json({ error: "Authentication required" });
  });

  // Get batch analysis results - temporarily disabled
  app.get("/api/batch/:id", authMiddleware, async (req: any, res) => {
    res.status(401).json({ error: "Authentication required" });
  });

  // Get user's batch analyses for history - temporarily disabled
  app.get("/api/history", authMiddleware, async (req: any, res) => {
    res.status(401).json({ error: "Authentication required" });
  });

  // Get user plan information and usage - temporarily disabled
  app.get("/api/user/plan", authMiddleware, async (req: any, res) => {
    res.status(401).json({ error: "Authentication required" });
  });

  // Stripe subscription routes - temporarily disabled
  app.post('/api/create-subscription', authMiddleware, async (req: any, res) => {
    res.status(401).json({ error: "Authentication required" });
  });

  // Stripe webhook endpoint (must be before JSON body parsing middleware)
  app.post('/api/stripe/webhook', async (req, res) => {
    const sig = req.headers['stripe-signature'];
    let event;

    try {
      event = stripe.webhooks.constructEvent(req.body, sig as string, process.env.STRIPE_WEBHOOK_SECRET!);
    } catch (err: any) {
      console.error('Webhook signature verification failed:', err.message);
      return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    // Handle the event
    try {
      switch (event.type) {
        case 'customer.subscription.updated':
          await handleSubscriptionUpdate(event.data.object as Stripe.Subscription);
          break;
        case 'customer.subscription.deleted':
          await handleSubscriptionCanceled(event.data.object as Stripe.Subscription);
          break;
        case 'invoice.payment_succeeded':
          await handlePaymentSucceeded(event.data.object as Stripe.Invoice);
          break;
        case 'invoice.payment_failed':
          await handlePaymentFailed(event.data.object as Stripe.Invoice);
          break;
        default:
          console.log(`Unhandled event type ${event.type}`);
      }

      res.json({ received: true });
    } catch (error) {
      console.error('Error handling webhook:', error);
      res.status(500).json({ error: 'Webhook handler failed' });
    }
  });

  async function handleSubscriptionUpdate(subscription: Stripe.Subscription) {
    const customerId = subscription.customer as string;
    const status = subscription.status;
    
    // Extract plan from subscription items
    let planType = null;
    if (subscription.items.data.length > 0) {
      const priceId = subscription.items.data[0].price.id;
      planType = getPlanFromPriceId(priceId);
    }
    
    await storage.updateUserSubscription(customerId, status, planType);
    console.log(`Subscription updated for customer ${customerId}: ${status}, plan: ${planType}`);
  }

  async function handleSubscriptionCanceled(subscription: Stripe.Subscription) {
    const customerId = subscription.customer as string;
    await storage.updateUserSubscription(customerId, 'canceled');
    console.log(`Subscription canceled for customer ${customerId}`);
  }

  async function handlePaymentSucceeded(invoice: Stripe.Invoice) {
    const customerId = invoice.customer as string;
    console.log(`Payment succeeded for customer ${customerId}`);
    // Additional logic for successful payments can be added here
  }

  async function handlePaymentFailed(invoice: Stripe.Invoice) {
    const customerId = invoice.customer as string;
    console.log(`Payment failed for customer ${customerId}`);
    // Additional logic for failed payments can be added here
  }

  return createServer(app);
}