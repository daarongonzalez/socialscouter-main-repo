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
import { setupAuth, isAuthenticated } from "./replitAuth";
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

  // Auth middleware
  await setupAuth(app);

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

  // CSRF token endpoint
  app.get("/api/csrf-token", (req: any, res) => {
    const token = req.csrfToken ? req.csrfToken() : getCsrfToken();
    res.json({ csrfToken: token });
  });

  // Analyze videos endpoint
  app.post("/api/analyze", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      
      // Validate input
      const validationResults = analyzeVideosSchema.safeParse(req.body);
      if (!validationResults.success) {
        return res.status(400).json({ 
          error: "Invalid request", 
          details: validationResults.error.errors 
        });
      }

      const { urls, contentType, includeTimestamps } = validationResults.data;

      // Check usage limits
      const limitCheck = await planLimitsService.checkUserLimits(userId, urls.length);
      if (!limitCheck.canProceed) {
        return res.status(403).json({
          error: limitCheck.errorMessage,
          currentUsage: limitCheck.currentUsage,
          planLimits: limitCheck.planLimits
        });
      }

      // Sanitize URLs
      const sanitizedUrls = urls.map(url => InputSanitizer.sanitizeUrl(url));

      // Create batch analysis record
      const batchData = {
        userId,
        contentType,
        totalVideos: sanitizedUrls.length,
        totalWords: 0,
        avgConfidence: 0,
        processingTime: 0,
        sentimentCounts: JSON.stringify({ POSITIVE: 0, NEUTRAL: 0, NEGATIVE: 0 })
      };

      const batch = await storage.createBatchAnalysis(batchData);
      const startTime = Date.now();
      
      // Process each URL
      const results: any[] = [];
      let totalWords = 0;
      let totalConfidence = 0;
      const sentimentCounts = { POSITIVE: 0, NEUTRAL: 0, NEGATIVE: 0 };

      for (const url of sanitizedUrls) {
        try {
          // Get transcript
          const transcript = await transcriptService.getTranscript(url, contentType);
          if (!transcript) {
            console.warn(`Failed to get transcript for ${url}`);
            continue;
          }

          // Analyze sentiment
          const sentimentResult = await sentimentService.analyzeSentiment(transcript);
          const wordCount = transcript.split(/\s+/).length;
          
          // Store result
          const analysisResult = await storage.createAnalysisResult({
            url,
            platform: contentType,
            sentiment: sentimentResult.sentiment,
            confidence: sentimentResult.confidence,
            transcript: InputSanitizer.sanitizeText(transcript),
            wordCount,
            sentimentScores: JSON.stringify(sentimentResult.scores || {}),
            batchId: batch.id
          });

          results.push(analysisResult);
          totalWords += wordCount;
          totalConfidence += sentimentResult.confidence;
          sentimentCounts[sentimentResult.sentiment.toUpperCase() as keyof typeof sentimentCounts]++;

        } catch (error) {
          console.error(`Error processing URL ${url}:`, error);
        }
      }

      const processingTime = (Date.now() - startTime) / 1000;
      const avgConfidence = results.length > 0 ? totalConfidence / results.length : 0;

      // Calculate sentiment percentages
      const totalResults = results.length;
      const sentimentScores = {
        positive: totalResults > 0 ? (sentimentCounts.POSITIVE / totalResults) * 100 : 0,
        neutral: totalResults > 0 ? (sentimentCounts.NEUTRAL / totalResults) * 100 : 0,
        negative: totalResults > 0 ? (sentimentCounts.NEGATIVE / totalResults) * 100 : 0
      };

      // Record usage
      await planLimitsService.recordVideoUsage(userId, results.length);

      const response: AnalyzeVideosResponse = {
        batchId: batch.id,
        results,
        summary: {
          totalVideos: results.length,
          totalWords,
          avgConfidence,
          processingTime,
          sentimentCounts,
          sentimentScores
        }
      };

      res.json(response);

    } catch (error) {
      console.error('Error in analyze endpoint:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // Get batch analysis results
  app.get("/api/batch/:id", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const batchId = InputSanitizer.validateBatchId(req.params.id);
      
      const batch = await storage.getBatchAnalysis(batchId);
      if (!batch) {
        return res.status(404).json({ error: "Batch not found" });
      }
      
      // Verify ownership
      if (batch.userId !== userId) {
        return res.status(403).json({ error: "Access denied" });
      }
      
      const results = await storage.getAnalysisResultsByBatchId(batchId);
      res.json({ batch, results });
    } catch (error) {
      console.error('Error fetching batch:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // Get user's batch analyses for history
  app.get("/api/history", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const batches = await storage.getUserBatchAnalyses(userId);
      res.json(batches);
    } catch (error) {
      console.error('Error fetching history:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // Get user plan information and usage
  app.get("/api/user/plan", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const planInfo = await planLimitsService.getUserPlanInfo(userId);
      res.json(planInfo);
    } catch (error) {
      console.error('Error fetching plan info:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // Stripe subscription routes
  app.post('/api/create-subscription', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { priceId } = req.body;

      if (!priceId) {
        return res.status(400).json({ error: 'Price ID is required' });
      }

      // Get or create Stripe customer
      let user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }

      let customerId = user.stripeCustomerId;
      if (!customerId) {
        const customer = await stripe.customers.create({
          email: user.email || undefined,
          name: user.firstName && user.lastName ? `${user.firstName} ${user.lastName}` : undefined,
        });
        customerId = customer.id;
        await storage.updateUserStripeInfo(userId, customerId, '');
      }

      // Create subscription
      const subscription = await stripe.subscriptions.create({
        customer: customerId,
        items: [{ price: priceId }],
        payment_behavior: 'default_incomplete',
        payment_settings: { save_default_payment_method: 'on_subscription' },
        expand: ['latest_invoice.payment_intent'],
      });

      res.json({
        subscriptionId: subscription.id,
        clientSecret: (subscription.latest_invoice as any)?.payment_intent?.client_secret,
      });
    } catch (error) {
      console.error('Error creating subscription:', error);
      res.status(500).json({ error: 'Failed to create subscription' });
    }
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
    
    await storage.updateUserSubscription(customerId, status, planType || undefined);
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