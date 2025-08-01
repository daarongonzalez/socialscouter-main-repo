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
import { extractPhrases } from "./lib/phrase-extractor";
import { getCsrfToken } from "./lib/csrf-middleware";
import { authenticateFirebaseToken, type AuthenticatedRequest } from "./lib/auth-middleware";
import { authSyncService } from "./lib/auth-sync-service";
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

function getPriceIdForPlan(plan: string, isYearly: boolean): string | null {
  // Map plan names to Stripe price IDs
  const planToPrices: { [key: string]: { monthly: string; yearly: string } } = {
    starter: {
      monthly: 'price_1RVfTT2MTD7ADXrKJFfxbBpF',
      yearly: 'price_1RW6gp2MTD7ADXrKajpegBna'
    },
    business: {
      monthly: 'price_1RVfZ02MTD7ADXrK9BhHfTCb',
      yearly: 'price_1RW6jA2MTD7ADXrKJppgZcP1'
    },
    enterprise: {
      monthly: 'price_1RW6de2MTD7ADXrKSbM0Iz6B',
      yearly: 'price_1RW6kz2MTD7ADXrKVxkkKteC'
    }
  };
  
  const prices = planToPrices[plan];
  if (!prices) return null;
  
  return isYearly ? prices.yearly : prices.monthly;
}

export async function registerRoutes(app: Express): Promise<Server> {
  // Session middleware for CSRF and state management
  app.use(getSession());

  const transcriptService = new TranscriptService();
  const sentimentService = new SentimentService();

  // Auth routes (requires authentication)
  app.get('/api/auth/user', authenticateFirebaseToken, async (req: any, res) => {
    res.json({
      id: req.user.id,
      email: req.user.email,
      name: `${req.user.firstName} ${req.user.lastName}`.trim(),
      firstName: req.user.firstName,
      lastName: req.user.lastName,
      profileImageUrl: req.user.profileImageUrl,
      isDemo: false
    });
  });

  // Health check endpoint
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", timestamp: new Date().toISOString() });
  });

  // Post-authentication sync endpoint (requires authentication)
  app.post('/api/auth/sync', authenticateFirebaseToken, async (req: AuthenticatedRequest, res) => {
    try {
      const { displayName } = req.body;
      
      const syncResult = await authSyncService.handlePostSignup(
        req.user.id, 
        req.user.email,
        displayName || `${req.user.firstName} ${req.user.lastName}`.trim()
      );
      
      if (syncResult.success) {
        res.json({
          success: true,
          message: syncResult.message,
          stripeCustomerId: syncResult.stripeCustomerId
        });
      } else {
        res.status(500).json({
          success: false,
          message: syncResult.message
        });
      }
    } catch (error) {
      console.error("Auth sync error:", error);
      res.status(500).json({ 
        success: false,
        message: "Authentication sync failed" 
      });
    }
  });

  // CSRF token endpoint
  app.get("/api/csrf-token", (req: any, res) => {
    const token = req.csrfToken ? req.csrfToken() : getCsrfToken();
    res.json({ csrfToken: token });
  });

  // Analyze videos endpoint (requires authentication)
  app.post("/api/analyze", authenticateFirebaseToken, async (req: AuthenticatedRequest, res) => {
    try {
      const validationErrors = validationResult(req);
      if (!validationErrors.isEmpty()) {
        return res.status(400).json({
          error: "Validation failed",
          details: validationErrors.array()
        });
      }

      const startTime = Date.now();
      const requestBody = analyzeVideosSchema.parse(req.body);
      const userId = req.user.id; // Use authenticated user ID

      // Check user limits before processing
      const limitCheck = await planLimitsService.checkUserLimits(userId, requestBody.urls.length);
      if (!limitCheck.canProceed) {
        return res.status(403).json({
          error: "Usage limit exceeded",
          message: limitCheck.errorMessage,
          currentUsage: limitCheck.currentUsage,
          planLimits: limitCheck.planLimits
        });
      }

      // Create batch analysis record
      const batch = await storage.createBatchAnalysis({
        userId,
        contentType: requestBody.contentType,
        totalVideos: requestBody.urls.length,
        totalWords: 0,
        avgConfidence: 0,
        processingTime: 0,
        sentimentCounts: JSON.stringify({ POSITIVE: 0, NEUTRAL: 0, NEGATIVE: 0 })
      });

      // Process each URL
      const results: any[] = [];
      let totalWords = 0;
      let totalConfidence = 0;
      const sentimentCounts = { POSITIVE: 0, NEUTRAL: 0, NEGATIVE: 0 };
      const sentimentScores = { positive: 0, neutral: 0, negative: 0 };

      for (const url of requestBody.urls) {
        const sanitizedUrl = InputSanitizer.sanitizeUrl(url);
        
        try {
          // Get transcript
          const transcript = await transcriptService.getTranscript(sanitizedUrl, requestBody.contentType);
          
          if (!transcript) {
            results.push({
              url: sanitizedUrl,
              platform: requestBody.contentType,
              sentiment: "NEUTRAL",
              confidence: 0.5,
              transcript: "No transcript available",
              wordCount: 0,
              sentimentScores: JSON.stringify({ positive: 0, neutral: 1, negative: 0 }),
              commonPositivePhrases: JSON.stringify([]),
              commonNegativePhrases: JSON.stringify([])
            });
            continue;
          }

          // Analyze sentiment
          const sentimentResult = await sentimentService.analyzeSentiment(transcript);
          
          // Extract positive and negative phrases
          const extractedPhrases = extractPhrases(transcript);
          
          // Create analysis result
          const analysisResult = await storage.createAnalysisResult({
            batchId: batch.id,
            url: sanitizedUrl,
            platform: requestBody.contentType,
            transcript: InputSanitizer.sanitizeText(transcript),
            sentiment: sentimentResult.sentiment,
            confidence: sentimentResult.confidence,
            wordCount: transcript.split(' ').length,
            sentimentScores: JSON.stringify(sentimentResult.scores || {}),
            commonPositivePhrases: JSON.stringify(extractedPhrases.positivePhrases),
            commonNegativePhrases: JSON.stringify(extractedPhrases.negativePhrases)
          });

          results.push(analysisResult);
          totalWords += transcript.split(' ').length;
          totalConfidence += sentimentResult.confidence;
          
          // Count sentiments
          sentimentCounts[sentimentResult.sentiment as keyof typeof sentimentCounts]++;
          
          // Aggregate scores
          if (sentimentResult.scores) {
            sentimentScores.positive += sentimentResult.scores.positive;
            sentimentScores.neutral += sentimentResult.scores.neutral;
            sentimentScores.negative += sentimentResult.scores.negative;
          }
        } catch (error) {
          console.error(`Error processing URL ${sanitizedUrl}:`, error);
          results.push({
            url: sanitizedUrl,
            platform: requestBody.contentType,
            sentiment: "NEUTRAL",
            confidence: 0.5,
            transcript: "Error processing video",
            wordCount: 0,
            sentimentScores: JSON.stringify({ positive: 0, neutral: 1, negative: 0 }),
            commonPositivePhrases: JSON.stringify([]),
            commonNegativePhrases: JSON.stringify([])
          });
        }
      }

      // Calculate averages
      const totalVideos = results.length;
      const avgConfidence = totalVideos > 0 ? totalConfidence / totalVideos : 0;
      const processingTime = Date.now() - startTime;

      // Calculate average sentiment scores across all videos
      if (totalVideos > 0) {
        sentimentScores.positive = sentimentScores.positive / totalVideos;
        sentimentScores.neutral = sentimentScores.neutral / totalVideos;
        sentimentScores.negative = sentimentScores.negative / totalVideos;
      }

      // Update the batch with calculated results
      await storage.updateBatchAnalysis(batch.id, {
        totalWords,
        avgConfidence,
        processingTime,
        sentimentCounts: JSON.stringify(sentimentCounts)
      });

      // Record video usage for the user
      await planLimitsService.recordVideoUsage(userId, totalVideos);

      const response: AnalyzeVideosResponse = {
        batchId: batch.id,
        results,
        summary: {
          totalVideos,
          totalWords,
          avgConfidence,
          processingTime,
          sentimentCounts,
          sentimentScores
        }
      };

      res.json(response);
    } catch (error) {
      console.error("Analysis error:", error);
      if (error instanceof ZodError) {
        return res.status(400).json({
          error: "Invalid request data",
          details: error.errors
        });
      }
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Get batch analysis results (requires authentication)
  app.get("/api/batch/:id", authenticateFirebaseToken, async (req: AuthenticatedRequest, res) => {
    try {
      const batchId = InputSanitizer.validateBatchId(req.params.id);
      
      // Get the batch and verify ownership
      const batch = await storage.getBatchAnalysis(batchId);
      if (!batch) {
        return res.status(404).json({ error: "Batch not found" });
      }
      
      // Check if user owns this batch
      if (batch.userId !== req.user.id) {
        return res.status(403).json({ error: "Access denied" });
      }
      
      // Get analysis results for this batch
      const results = await storage.getAnalysisResultsByBatchId(batchId);
      
      res.json({ batch, results });
    } catch (error) {
      console.error("Error fetching batch:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Get user's analysis history (requires authentication)
  app.get("/api/history", authenticateFirebaseToken, async (req: AuthenticatedRequest, res) => {
    try {
      const batches = await storage.getUserBatchAnalyses(req.user.id);
      res.json(batches);
    } catch (error) {
      console.error("Error fetching history:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Fix incomplete batch data (admin route)
  app.post("/api/admin/fix-batch-data", async (req, res) => {
    try {
      await storage.fixIncompleteBatchData();
      res.json({ message: "Batch data fixed successfully" });
    } catch (error) {
      console.error("Error fixing batch data:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Get user plan information (requires authentication)
  app.get("/api/user/plan", authenticateFirebaseToken, async (req: AuthenticatedRequest, res) => {
    try {
      const planInfo = await planLimitsService.getUserPlanInfo(req.user.id);
      res.json(planInfo);
    } catch (error) {
      console.error("Error fetching plan info:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Stripe subscription routes (requires authentication)
  app.post('/api/create-subscription', authenticateFirebaseToken, async (req: AuthenticatedRequest, res) => {
    try {
      const { plan, isYearly } = req.body;
      
      // Validate plan
      if (!plan || !['starter', 'business', 'enterprise'].includes(plan)) {
        return res.status(400).json({ error: "Invalid plan selected" });
      }
      
      // Get or create Stripe customer
      let stripeCustomerId = req.user.stripeCustomerId;
      if (!stripeCustomerId) {
        const customer = await stripe.customers.create({
          email: req.user.email,
          name: `${req.user.firstName} ${req.user.lastName}`.trim(),
          metadata: {
            userId: req.user.id
          }
        });
        stripeCustomerId = customer.id;
        
        // Update user with Stripe customer ID
        await storage.updateUserStripeInfo(req.user.id, stripeCustomerId, '');
      }
      
      // Create Stripe subscription
      const priceId = getPriceIdForPlan(plan, isYearly);
      if (!priceId) {
        return res.status(400).json({ error: "Invalid plan configuration" });
      }
      
      const subscription = await stripe.subscriptions.create({
        customer: stripeCustomerId,
        items: [{ price: priceId }],
        payment_behavior: 'default_incomplete',
        payment_settings: { save_default_payment_method: 'on_subscription' },
        expand: ['latest_invoice.payment_intent'],
        metadata: {
          userId: req.user.id,
          plan: plan,
          isYearly: isYearly.toString()
        }
      });
      
      // Update user with subscription ID
      await storage.updateUserStripeInfo(req.user.id, stripeCustomerId, subscription.id);
      
      const invoice = subscription.latest_invoice as any;
      const clientSecret = invoice?.payment_intent?.client_secret;
      if (!clientSecret) {
        return res.status(400).json({ error: "Failed to create payment intent" });
      }
      
      res.json({
        clientSecret,
        subscriptionId: subscription.id
      });
    } catch (error) {
      console.error("Subscription creation error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Stripe webhook endpoint (must be before JSON body parsing middleware)
  app.post('/api/stripe/webhook', async (req, res) => {
    const signature = req.headers['stripe-signature'];
    
    if (!signature) {
      return res.status(400).json({ error: 'No signature provided' });
    }
    
    try {
      const event = stripe.webhooks.constructEvent(
        req.body,
        signature,
        process.env.STRIPE_WEBHOOK_SECRET!
      );
      
      switch (event.type) {
        case 'customer.subscription.created':
        case 'customer.subscription.updated':
          const subscription = event.data.object;
          const plan = getPlanFromPriceId(subscription.items.data[0].price.id);
          
          if (plan) {
            await storage.updateUserSubscription(
              subscription.customer as string,
              subscription.status,
              plan
            );
            console.log(`Updated subscription for customer ${subscription.customer}: ${plan} - ${subscription.status}`);
          }
          break;
          
        case 'customer.subscription.deleted':
          const deletedSub = event.data.object;
          await storage.updateUserSubscription(
            deletedSub.customer as string,
            'canceled',
            undefined
          );
          console.log(`Canceled subscription for customer ${deletedSub.customer}`);
          break;
          
        case 'invoice.payment_succeeded':
          const invoice = event.data.object as any;
          console.log(`Payment succeeded for customer ${invoice.customer}`);
          
          // Ensure subscription is active after successful payment
          if (invoice.subscription) {
            const subId = invoice.subscription as string;
            try {
              const subDetails = await stripe.subscriptions.retrieve(subId);
              const plan = getPlanFromPriceId(subDetails.items.data[0].price.id);
              if (plan) {
                await storage.updateUserSubscription(
                  subDetails.customer as string,
                  'active',
                  plan
                );
              }
            } catch (error) {
              console.error('Error processing successful payment:', error);
            }
          }
          break;
          
        case 'invoice.payment_failed':
          const failedInvoice = event.data.object as any;
          console.log(`Payment failed for customer ${failedInvoice.customer}`);
          
          // Mark subscription as past_due
          if (failedInvoice.subscription) {
            await storage.updateUserSubscription(
              failedInvoice.customer as string,
              'past_due',
              undefined
            );
          }
          break;
      }
      
      res.json({ received: true });
    } catch (error) {
      console.error('Webhook error:', error);
      res.status(400).json({ error: 'Webhook signature verification failed' });
    }
  });

  const server = createServer(app);
  return server;
}