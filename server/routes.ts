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

  // Auth routes with Firebase
  app.get('/api/auth/user', async (req: any, res) => {
    try {
      const authHeader = req.headers.authorization;
      
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'No token provided' });
      }

      const { authenticateFirebaseToken } = await import('./lib/auth-middleware');
      
      // Use middleware to authenticate and get user
      authenticateFirebaseToken(req, res, () => {
        res.json(req.user);
      });
    } catch (error) {
      console.error('Auth error:', error);
      res.status(401).json({ error: 'Authentication failed' });
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

  // Analyze videos endpoint with Firebase auth
  app.post("/api/analyze", async (req: any, res) => {
    const { authenticateFirebaseToken } = await import('./lib/auth-middleware');
    
    authenticateFirebaseToken(req, res, async () => {
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
        const userId = req.user.id;

        // Check user limits
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
          processingStatus: 'completed'
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
                transcript: null,
                sentiment: 'NEUTRAL',
                confidence: 0,
                scores: { positive: 0, neutral: 1, negative: 0 },
                error: 'Could not extract transcript'
              });
              continue;
            }

            // Analyze sentiment
            const sentimentResult = await sentimentService.analyzeSentiment(transcript);
            
            // Create analysis result
            const analysisResult = await storage.createAnalysisResult({
              batchId: batch.id,
              url: sanitizedUrl,
              transcript: InputSanitizer.sanitizeText(transcript),
              sentiment: sentimentResult.sentiment,
              confidence: sentimentResult.confidence,
              positiveScore: sentimentResult.scores?.positive || 0,
              neutralScore: sentimentResult.scores?.neutral || 0,
              negativeScore: sentimentResult.scores?.negative || 0
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
              transcript: null,
              sentiment: 'NEUTRAL',
              confidence: 0,
              scores: { positive: 0, neutral: 1, negative: 0 },
              error: 'Processing failed'
            });
          }
        }

        // Record usage
        await planLimitsService.recordVideoUsage(userId, requestBody.urls.length);

        // Calculate averages
        const totalVideos = results.length;
        const avgConfidence = totalVideos > 0 ? totalConfidence / totalVideos : 0;
        const processingTime = Date.now() - startTime;

        // Normalize sentiment scores
        const totalScore = sentimentScores.positive + sentimentScores.neutral + sentimentScores.negative;
        if (totalScore > 0) {
          sentimentScores.positive = sentimentScores.positive / totalScore;
          sentimentScores.neutral = sentimentScores.neutral / totalScore;
          sentimentScores.negative = sentimentScores.negative / totalScore;
        }

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
  });

  // Get batch analysis results with Firebase auth
  app.get("/api/batch/:id", async (req: any, res) => {
    const { authenticateFirebaseToken } = await import('./lib/auth-middleware');
    
    authenticateFirebaseToken(req, res, async () => {
      try {
        const batchId = InputSanitizer.validateBatchId(req.params.id);
        const batch = await storage.getBatchAnalysis(batchId);
        
        if (!batch) {
          return res.status(404).json({ error: "Batch not found" });
        }
        
        // Check if user owns this batch
        if (batch.userId !== req.user.id) {
          return res.status(403).json({ error: "Access denied" });
        }
        
        const results = await storage.getAnalysisResultsByBatchId(batchId);
        res.json({ batch, results });
      } catch (error) {
        console.error("Batch retrieval error:", error);
        res.status(500).json({ error: "Internal server error" });
      }
    });
  });

  // Get user's batch analyses for history with Firebase auth
  app.get("/api/history", async (req: any, res) => {
    const { authenticateFirebaseToken } = await import('./lib/auth-middleware');
    
    authenticateFirebaseToken(req, res, async () => {
      try {
        const batches = await storage.getUserBatchAnalyses(req.user.id);
        res.json(batches);
      } catch (error) {
        console.error("History retrieval error:", error);
        res.status(500).json({ error: "Internal server error" });
      }
    });
  });

  // Get user plan information and usage with Firebase auth
  app.get("/api/user/plan", async (req: any, res) => {
    const { authenticateFirebaseToken } = await import('./lib/auth-middleware');
    
    authenticateFirebaseToken(req, res, async () => {
      try {
        const planInfo = await planLimitsService.getUserPlanInfo(req.user.id);
        res.json(planInfo);
      } catch (error) {
        console.error("Plan info retrieval error:", error);
        res.status(500).json({ error: "Internal server error" });
      }
    });
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