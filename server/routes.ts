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

  // Analyze videos endpoint - now requires authentication
  app.post("/api/analyze", authMiddleware, async (req: any, res) => {
    try {
      const startTime = Date.now();
      
      // Validate request body
      const validationResult = analyzeVideosSchema.safeParse(req.body);
      if (!validationResult.success) {
        return res.status(400).json({
          error: "Invalid request data",
          details: validationResult.error.issues
        });
      }

      const { urls, contentType, includeTimestamps } = validationResult.data;
      // Temporarily disabled - authentication required
      return res.status(401).json({ error: "Authentication required" });

      // Sanitize and validate URLs
      const sanitizedUrls: string[] = [];
      for (const url of urls) {
        try {
          const sanitizedUrl = InputSanitizer.sanitizeUrl(url);
          sanitizedUrls.push(sanitizedUrl);
        } catch (error) {
          return res.status(400).json({
            error: "Invalid URL",
            message: `URL validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`
          });
        }
      }

      // Check user limits before processing
      const limitCheck = await planLimitsService.checkUserLimits(userId, sanitizedUrls.length);
      if (!limitCheck.canProceed) {
        return res.status(403).json({
          error: "Usage limit exceeded",
          message: limitCheck.errorMessage,
          currentUsage: limitCheck.currentUsage,
          planLimits: limitCheck.planLimits
        });
      }

      // Create batch analysis record first (with placeholder data)
      const batchAnalysis = await storage.createBatchAnalysis({
        userId,
        contentType,
        totalVideos: sanitizedUrls.length,
        totalWords: 0, // Will be updated
        avgConfidence: 0, // Will be updated  
        processingTime: 0, // Will be updated
        sentimentCounts: JSON.stringify({ POSITIVE: 0, NEUTRAL: 0, NEGATIVE: 0 })
      });

      // Process each video URL
      const results = [];
      let totalWords = 0;
      let totalConfidence = 0;
      const sentimentCounts = { POSITIVE: 0, NEUTRAL: 0, NEGATIVE: 0 };
      let totalPositiveScore = 0;
      let totalNeutralScore = 0;
      let totalNegativeScore = 0;

      for (const url of sanitizedUrls) {
        try {
          // Get transcript from video URL
          const transcript = await transcriptService.getTranscript(url, contentType);
          
          if (!transcript) {
            console.warn(`Failed to get transcript for URL: ${url}`);
            continue;
          }

          // Analyze sentiment
          const sentimentResult = await sentimentService.analyzeSentiment(transcript);
          console.log(`Sentiment result for ${url}:`, sentimentResult);
          
          // Count words in transcript
          const wordCount = transcript.split(/\s+/).length;
          totalWords += wordCount;
          totalConfidence += sentimentResult.confidence;

          // Count sentiment occurrences
          sentimentCounts[sentimentResult.sentiment as keyof typeof sentimentCounts]++;

          // Accumulate scores for averaging
          if (sentimentResult.scores) {
            totalPositiveScore += sentimentResult.scores.positive;
            totalNeutralScore += sentimentResult.scores.neutral;
            totalNegativeScore += sentimentResult.scores.negative;
          }

          // Store analysis result with the correct batch ID
          const analysisResult = await storage.createAnalysisResult({
            url,
            platform: contentType,
            sentiment: sentimentResult.sentiment,
            confidence: sentimentResult.confidence,
            transcript,
            wordCount,
            sentimentScores: JSON.stringify(sentimentResult.scores || {}),
            batchId: batchAnalysis.id
          });

          results.push(analysisResult);
        } catch (error) {
          console.error(`Error processing URL ${url}:`, error);
          // Continue with other URLs even if one fails
        }
      }

      if (results.length === 0) {
        return res.status(400).json({
          error: "No videos could be processed",
          message: "Please check your URLs and try again."
        });
      }

      // Calculate averages
      const avgConfidence = totalConfidence / results.length;
      const processingTime = Date.now() - startTime;

      // Calculate average sentiment scores
      const avgPositiveScore = Math.round(totalPositiveScore / results.length);
      const avgNeutralScore = Math.round(totalNeutralScore / results.length);
      const avgNegativeScore = Math.round(totalNegativeScore / results.length);

      console.log("Sentiment Score Debug:", {
        totalPositiveScore,
        totalNeutralScore,
        totalNegativeScore,
        resultsLength: results.length,
        avgPositiveScore,
        avgNeutralScore,
        avgNegativeScore
      });

      // Record video usage after successful analysis
      await planLimitsService.recordVideoUsage(userId, sanitizedUrls.length);

      const response: AnalyzeVideosResponse = {
        batchId: batchAnalysis.id,
        results,
        summary: {
          totalVideos: results.length,
          totalWords,
          avgConfidence: Math.round(avgConfidence),
          processingTime,
          sentimentCounts,
          sentimentScores: {
            positive: avgPositiveScore,
            neutral: avgNeutralScore,
            negative: avgNegativeScore
          }
        }
      };

      res.json(response);
    } catch (error) {
      console.error("Error in analyze endpoint:", error);
      res.status(500).json({
        error: "Internal server error",
        message: "An unexpected error occurred while processing your request. Please try again."
      });
    }
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
      switch (event.type) {
        case 'customer.subscription.created':
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
          console.log(`Unhandled event type: ${event.type}`);
      }

      res.json({ received: true });
    } catch (error: any) {
      console.error('Error processing webhook:', error);
      res.status(500).json({ error: 'Webhook processing failed' });
    }
  });

  // Webhook handler functions
  async function handleSubscriptionUpdate(subscription: Stripe.Subscription) {
    const customerId = subscription.customer as string;
    const status = subscription.status;
    
    // Determine plan from price ID
    let plan = null;
    if (subscription.items.data.length > 0) {
      const priceId = subscription.items.data[0].price.id;
      plan = getPlanFromPriceId(priceId);
    }

    // Map Stripe statuses to our internal statuses
    let subscriptionStatus = 'inactive';
    if (status === 'active' || status === 'trialing') {
      subscriptionStatus = 'active';
    } else if (status === 'past_due') {
      subscriptionStatus = 'past_due';
    } else if (status === 'canceled' || status === 'unpaid') {
      subscriptionStatus = 'canceled';
    }

    await storage.updateUserSubscription(customerId, subscriptionStatus, plan ?? undefined);
    console.log(`Updated subscription for customer ${customerId}: ${subscriptionStatus} (${plan})`);
  }

  async function handleSubscriptionCanceled(subscription: Stripe.Subscription) {
    const customerId = subscription.customer as string;
    await storage.updateUserSubscription(customerId, 'canceled');
    console.log(`Canceled subscription for customer ${customerId}`);
  }

  async function handlePaymentSucceeded(invoice: Stripe.Invoice) {
    const subscriptionId = (invoice as any).subscription;
    if (subscriptionId && typeof subscriptionId === 'string') {
      const subscription = await stripe.subscriptions.retrieve(subscriptionId);
      await handleSubscriptionUpdate(subscription);
      console.log(`Payment succeeded for subscription ${subscription.id}`);
    }
  }

  async function handlePaymentFailed(invoice: Stripe.Invoice) {
    const subscriptionId = (invoice as any).subscription;
    if (subscriptionId) {
      const customerId = invoice.customer as string;
      await storage.updateUserSubscription(customerId, 'past_due');
      console.log(`Payment failed for customer ${customerId}, marked as past_due`);
    }
  }

  const httpServer = createServer(app);
  return httpServer;
}