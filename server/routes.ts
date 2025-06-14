import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { analyzeVideosSchema, type AnalyzeVideosRequest, type AnalyzeVideosResponse } from "@shared/schema";
import { ZodError } from "zod";
import { TranscriptService } from "./lib/transcript-service";
import { SentimentService } from "./lib/sentiment-service";
import { planLimitsService } from "./lib/plan-limits-service";
import { getSession } from "./session";
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
  // Map actual Stripe price IDs to plan names
  const priceToPlans: { [key: string]: string } = {
    // Starter plans
    'price_1RVfTT2MTD7ADXrKJFfxbBpF': 'starter', // $29/month - Starter Tier
    'price_1RW6gp2MTD7ADXrKajpegBna': 'starter', // $279/year - Starter Tier
    
    // Business plans  
    'price_1RVfZ02MTD7ADXrK9BhHfTCb': 'business', // $49/month - Business Tier
    'price_1RW6jA2MTD7ADXrKJppgZcP1': 'business', // $470/year - Business Tier
    
    // Enterprise plans
    'price_1RW6de2MTD7ADXrKSbM0Iz6B': 'enterprise', // $129/month - Enterprise Tier
    'price_1RW6kz2MTD7ADXrKVxkkKteC': 'enterprise', // $1238/year - Enterprise Tier
  };
  
  return priceToPlans[priceId] || null;
}

export async function registerRoutes(app: Express): Promise<Server> {
  // Session middleware for CSRF and state management
  app.use(getSession());

  const transcriptService = new TranscriptService();
  const sentimentService = new SentimentService();

  // Auth routes - temporarily disabled during auth provider migration
  app.get('/api/auth/user', async (req: any, res) => {
    // TODO: Replace with new authentication provider
    res.status(401).json({ message: "Authentication system under maintenance" });
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

  // Analyze videos endpoint - temporarily disabled during auth provider migration
  app.post("/api/analyze", async (req: any, res) => {
    // TODO: Replace with new authentication provider
    res.status(401).json({ error: "Authentication required", message: "Please sign in to analyze videos" });
  });

  // Get batch analysis results - temporarily disabled during auth provider migration
  app.get("/api/batch/:id", async (req: any, res) => {
    // TODO: Replace with new authentication provider
    res.status(401).json({ error: "Authentication required", message: "Please sign in to view analysis results" });
  });

  // Get user's batch analyses for history - temporarily disabled during auth provider migration
  app.get("/api/history", async (req: any, res) => {
    // TODO: Replace with new authentication provider
    res.status(401).json({ error: "Authentication required", message: "Please sign in to view history" });
  });

  // Get user plan information and usage - temporarily disabled during auth provider migration
  app.get("/api/user/plan", async (req: any, res) => {
    // TODO: Replace with new authentication provider
    res.status(401).json({ error: "Authentication required", message: "Please sign in to view plan information" });
  });

  // Stripe subscription routes - temporarily disabled during auth provider migration
  app.post('/api/create-subscription', async (req: any, res) => {
    // TODO: Replace with new authentication provider
    res.status(401).json({ error: "Authentication required", message: "Please sign in to create subscription" });
  });

  // Stripe webhook endpoint (must be before JSON body parsing middleware)
  app.post('/api/stripe/webhook', async (req, res) => {
    const sig = req.headers['stripe-signature'];
    let event: Stripe.Event;

    try {
      // Verify webhook signature
      if (!process.env.STRIPE_WEBHOOK_SECRET) {
        console.error('Missing STRIPE_WEBHOOK_SECRET environment variable');
        return res.status(400).send('Webhook secret not configured');
      }

      event = stripe.webhooks.constructEvent(req.body, sig as string, process.env.STRIPE_WEBHOOK_SECRET);
    } catch (err: any) {
      console.error('Webhook signature verification failed:', err.message);
      return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    // Handle the event
    try {
      console.log(`Received Stripe webhook event: ${event.type}`);
      
      switch (event.type) {
        case 'customer.subscription.created':
        case 'customer.subscription.updated':
          console.log(`Processing subscription event: ${event.type}`);
          await handleSubscriptionUpdate(event.data.object as Stripe.Subscription);
          break;
        
        case 'customer.subscription.deleted':
          console.log(`Processing subscription deletion`);
          await handleSubscriptionCanceled(event.data.object as Stripe.Subscription);
          break;
        
        case 'invoice.payment_succeeded':
          console.log(`Processing payment success`);
          await handlePaymentSucceeded(event.data.object as Stripe.Invoice);
          break;
        
        case 'invoice.payment_failed':
          console.log(`Processing payment failure`);
          await handlePaymentFailed(event.data.object as Stripe.Invoice);
          break;
        
        default:
          console.log(`Unhandled event type: ${event.type}`);
      }

      console.log(`Successfully processed webhook event: ${event.type}`);
      res.json({ received: true });
    } catch (error: any) {
      console.error('Error processing webhook:', error);
      res.status(500).json({ error: 'Webhook processing failed' });
    }
  });

  // Webhook event handlers
  async function handleSubscriptionUpdate(subscription: Stripe.Subscription) {
    try {
      const customerId = subscription.customer as string;
      const priceId = subscription.items.data[0]?.price.id;
      const planName = getPlanFromPriceId(priceId || '');
      
      if (planName) {
        await storage.updateUserSubscription(
          customerId,
          subscription.status,
          planName
        );
        console.log(`Updated subscription for customer ${customerId}: ${planName} (${subscription.status})`);
      }
    } catch (error) {
      console.error('Error handling subscription update:', error);
      throw error;
    }
  }

  async function handleSubscriptionCanceled(subscription: Stripe.Subscription) {
    try {
      const customerId = subscription.customer as string;
      await storage.updateUserSubscription(customerId, 'canceled');
      console.log(`Canceled subscription for customer ${customerId}`);
    } catch (error) {
      console.error('Error handling subscription cancellation:', error);
      throw error;
    }
  }

  async function handlePaymentSucceeded(invoice: Stripe.Invoice) {
    try {
      const customerId = invoice.customer as string;
      console.log(`Payment succeeded for customer ${customerId}`);
      // Additional payment success logic can be added here
    } catch (error) {
      console.error('Error handling payment success:', error);
      throw error;
    }
  }

  async function handlePaymentFailed(invoice: Stripe.Invoice) {
    try {
      const customerId = invoice.customer as string;
      console.log(`Payment failed for customer ${customerId}`);
      // Additional payment failure logic can be added here
    } catch (error) {
      console.error('Error handling payment failure:', error);
      throw error;
    }
  }

  const httpServer = createServer(app);
  return httpServer;
}