import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { analyzeVideosSchema, type AnalyzeVideosRequest, type AnalyzeVideosResponse } from "@shared/schema";
import { ZodError } from "zod";
import { TranscriptService } from "./lib/transcript-service";
import { SentimentService } from "./lib/sentiment-service";
import { planLimitsService } from "./lib/plan-limits-service";
import { setupAuth, isAuthenticated } from "./replitAuth";
import { body, validationResult } from "express-validator";
import { InputSanitizer } from "./lib/input-sanitizer";
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
  // Auth middleware
  await setupAuth(app);

  const transcriptService = new TranscriptService();
  const sentimentService = new SentimentService();

  // Auth routes
  app.get('/api/auth/user', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      res.json(user);
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  // Health check endpoint
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", timestamp: new Date().toISOString() });
  });

  // Analyze videos endpoint - now requires authentication
  app.post("/api/analyze", isAuthenticated, async (req: any, res) => {
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
      const userId = req.user.claims.sub;

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

  // Get batch analysis results - requires authentication and ownership verification
  app.get("/api/batch/:id", isAuthenticated, async (req: any, res) => {
    try {
      const batchId = InputSanitizer.validateBatchId(req.params.id);

      const userId = req.user.claims.sub;
      const batchAnalysis = await storage.getBatchAnalysis(batchId);
      
      if (!batchAnalysis) {
        return res.status(404).json({ error: "Batch analysis not found" });
      }

      // Verify ownership - user can only access their own batch analyses
      if (batchAnalysis.userId !== userId) {
        return res.status(403).json({ error: "Access denied" });
      }

      const results = await storage.getAnalysisResultsByBatchId(batchId);
      
      res.json({
        batch: batchAnalysis,
        results
      });
    } catch (error) {
      console.error("Error fetching batch analysis:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Get user's batch analyses for history
  app.get("/api/history", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const batches = await storage.getUserBatchAnalyses(userId);
      res.json(batches);
    } catch (error) {
      console.error("Error fetching history:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Get user plan information and usage
  app.get("/api/user/plan", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const planInfo = await planLimitsService.getUserPlanInfo(userId);
      
      if (!planInfo) {
        return res.status(404).json({ error: "User plan information not found" });
      }

      res.json(planInfo);
    } catch (error) {
      console.error("Error fetching user plan info:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Stripe subscription routes
  app.post('/api/create-subscription', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      const { priceId, planName } = req.body;

      if (!user?.email) {
        return res.status(400).json({ error: 'User email is required' });
      }

      let customerId = user.stripeCustomerId;

      // Create customer if doesn't exist
      if (!customerId) {
        const customer = await stripe.customers.create({
          email: user.email,
          name: `${user.firstName || ''} ${user.lastName || ''}`.trim(),
        });
        customerId = customer.id;
        await storage.updateUserStripeInfo(userId, customerId, '');
      }

      // Create subscription
      const subscription = await stripe.subscriptions.create({
        customer: customerId,
        items: [{ price: priceId }],
        payment_behavior: 'default_incomplete',
        expand: ['latest_invoice.payment_intent'],
      });

      // Update user with subscription info
      await storage.updateUserStripeInfo(userId, customerId, subscription.id);

      res.json({
        subscriptionId: subscription.id,
        clientSecret: (subscription.latest_invoice as any)?.payment_intent?.client_secret,
      });
    } catch (error: any) {
      console.error('Subscription creation error:', error);
      res.status(400).json({ error: error.message });
    }
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