import {
  users,
  analysisResults,
  batchAnalysis,
  type User,
  type UpsertUser,
  type AnalysisResult,
  type InsertAnalysisResult,
  type BatchAnalysis,
  type InsertBatchAnalysis,
} from "@shared/schema";
import { db } from "./db";
import { eq, desc } from "drizzle-orm";

// Interface for storage operations
export interface IStorage {
  // User operations
  // (IMPORTANT) these user operations are mandatory for Firebase Auth.
  getUser(id: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;
  updateUserStripeInfo(userId: string, stripeCustomerId: string, stripeSubscriptionId: string): Promise<User>;
  updateUserSubscription(stripeCustomerId: string, subscriptionStatus: string, subscriptionPlan?: string): Promise<User | null>;
  getUserByStripeCustomerId(stripeCustomerId: string): Promise<User | undefined>;
  
  // Usage tracking operations
  incrementUserVideoCount(userId: string, videoCount: number): Promise<User>;
  resetMonthlyUsageIfNeeded(userId: string): Promise<User>;
  getUserUsage(userId: string): Promise<{ monthlyVideoCount: number; lastResetDate: Date; subscriptionPlan: string | null; subscriptionStatus: string | null } | null>;
  
  // Migration helper
  migrateUserToFirebase(firebaseUid: string, email: string): Promise<User>;
  
  // Fix existing incomplete batch data
  fixIncompleteBatchData(): Promise<void>;
  
  createAnalysisResult(result: InsertAnalysisResult): Promise<AnalysisResult>;
  getAnalysisResultsByBatchId(batchId: number): Promise<AnalysisResult[]>;
  
  createBatchAnalysis(batch: InsertBatchAnalysis): Promise<BatchAnalysis>;
  updateBatchAnalysis(id: number, updates: Partial<InsertBatchAnalysis>): Promise<BatchAnalysis>;
  getBatchAnalysis(id: number): Promise<BatchAnalysis | undefined>;
  getAllBatchAnalyses(): Promise<BatchAnalysis[]>;
  getUserBatchAnalyses(userId: string): Promise<BatchAnalysis[]>;
}

export class DatabaseStorage implements IStorage {
  // User operations
  // (IMPORTANT) these user operations are mandatory for Firebase Auth.

  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(userData)
      .onConflictDoUpdate({
        target: users.id,
        set: {
          email: userData.email,
          firstName: userData.firstName,
          lastName: userData.lastName,
          profileImageUrl: userData.profileImageUrl,
          updatedAt: new Date(),
        },
      })
      .returning();
    return user;
  }

  async updateUserStripeInfo(userId: string, stripeCustomerId: string, stripeSubscriptionId: string): Promise<User> {
    const [user] = await db
      .update(users)
      .set({
        stripeCustomerId,
        stripeSubscriptionId,
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId))
      .returning();
    return user;
  }

  async updateUserSubscription(stripeCustomerId: string, subscriptionStatus: string, subscriptionPlan?: string): Promise<User | null> {
    const updateData: any = {
      subscriptionStatus,
      updatedAt: new Date(),
    };
    
    if (subscriptionPlan) {
      updateData.subscriptionPlan = subscriptionPlan;
    }

    const [user] = await db
      .update(users)
      .set(updateData)
      .where(eq(users.stripeCustomerId, stripeCustomerId))
      .returning();
    
    return user || null;
  }

  async getUserByStripeCustomerId(stripeCustomerId: string): Promise<User | undefined> {
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.stripeCustomerId, stripeCustomerId));
    return user;
  }

  async incrementUserVideoCount(userId: string, videoCount: number): Promise<User> {
    // First reset monthly usage if needed
    await this.resetMonthlyUsageIfNeeded(userId);
    
    // Get current count and increment
    const currentUser = await this.getUser(userId);
    const currentCount = currentUser?.monthlyVideoCount || 0;
    
    const [user] = await db
      .update(users)
      .set({
        monthlyVideoCount: currentCount + videoCount,
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId))
      .returning();
    return user;
  }

  async resetMonthlyUsageIfNeeded(userId: string): Promise<User> {
    const user = await this.getUser(userId);
    if (!user) throw new Error('User not found');

    const now = new Date();
    const lastReset = user.lastResetDate || user.createdAt || now;
    const daysSinceReset = (now.getTime() - lastReset.getTime()) / (1000 * 60 * 60 * 24);

    // Reset if it's been more than 30 days
    if (daysSinceReset >= 30) {
      const [updatedUser] = await db
        .update(users)
        .set({
          monthlyVideoCount: 0,
          lastResetDate: now,
          updatedAt: now,
        })
        .where(eq(users.id, userId))
        .returning();
      return updatedUser;
    }

    return user;
  }

  async getUserUsage(userId: string): Promise<{ monthlyVideoCount: number; lastResetDate: Date; subscriptionPlan: string | null; subscriptionStatus: string | null } | null> {
    const user = await this.getUser(userId);
    if (!user) return null;

    return {
      monthlyVideoCount: user.monthlyVideoCount || 0,
      lastResetDate: user.lastResetDate || user.createdAt || new Date(),
      subscriptionPlan: user.subscriptionPlan,
      subscriptionStatus: user.subscriptionStatus
    };
  }

  async createAnalysisResult(result: InsertAnalysisResult): Promise<AnalysisResult> {
    const [analysisResult] = await db
      .insert(analysisResults)
      .values(result)
      .returning();
    return analysisResult;
  }

  async getAnalysisResultsByBatchId(batchId: number): Promise<AnalysisResult[]> {
    return await db
      .select()
      .from(analysisResults)
      .where(eq(analysisResults.batchId, batchId));
  }

  async createBatchAnalysis(batch: InsertBatchAnalysis): Promise<BatchAnalysis> {
    const [result] = await db
      .insert(batchAnalysis)
      .values(batch)
      .returning();
    return result;
  }

  async updateBatchAnalysis(id: number, updates: Partial<InsertBatchAnalysis>): Promise<BatchAnalysis> {
    const [result] = await db
      .update(batchAnalysis)
      .set(updates)
      .where(eq(batchAnalysis.id, id))
      .returning();
    return result;
  }

  async getBatchAnalysis(id: number): Promise<BatchAnalysis | undefined> {
    const [batch] = await db
      .select()
      .from(batchAnalysis)
      .where(eq(batchAnalysis.id, id));
    return batch || undefined;
  }

  async getAllBatchAnalyses(): Promise<BatchAnalysis[]> {
    return await db
      .select()
      .from(batchAnalysis)
      .orderBy(desc(batchAnalysis.id));
  }

  async getUserBatchAnalyses(userId: string): Promise<BatchAnalysis[]> {
    return await db
      .select()
      .from(batchAnalysis)
      .where(eq(batchAnalysis.userId, userId))
      .orderBy(desc(batchAnalysis.id));
  }

  async migrateUserToFirebase(firebaseUid: string, email: string): Promise<User> {
    // Get existing user by email
    const [existingUser] = await db
      .select()
      .from(users)
      .where(eq(users.email, email));
    
    if (!existingUser) {
      throw new Error('User not found for migration');
    }

    // First, temporarily clear the email to avoid unique constraint
    await db
      .update(users)
      .set({ email: `temp_${Date.now()}_${existingUser.email}` })
      .where(eq(users.id, existingUser.id));

    // Create new user with Firebase UID, preserving existing data
    const [user] = await db
      .insert(users)
      .values({
        id: firebaseUid,
        email: existingUser.email, // Use original email
        firstName: existingUser.firstName,
        lastName: existingUser.lastName,
        profileImageUrl: existingUser.profileImageUrl,
        stripeCustomerId: existingUser.stripeCustomerId,
        stripeSubscriptionId: existingUser.stripeSubscriptionId,
        subscriptionPlan: existingUser.subscriptionPlan,
        subscriptionStatus: existingUser.subscriptionStatus,
        monthlyVideoCount: existingUser.monthlyVideoCount,
        lastResetDate: existingUser.lastResetDate,
      })
      .returning();

    // Update all batch analyses to use the new Firebase UID
    await db
      .update(batchAnalysis)
      .set({ userId: firebaseUid })
      .where(eq(batchAnalysis.userId, existingUser.id));

    // Delete the old user record
    await db
      .delete(users)
      .where(eq(users.id, existingUser.id));

    return user;
  }

  async fixIncompleteBatchData(): Promise<void> {
    // Get all batches with incomplete data (avgConfidence = 0)
    const incompleteBatches = await db
      .select()
      .from(batchAnalysis)
      .where(eq(batchAnalysis.avgConfidence, 0));

    console.log(`Found ${incompleteBatches.length} incomplete batches to fix`);

    for (const batch of incompleteBatches) {
      const results = await this.getAnalysisResultsByBatchId(batch.id);
      
      if (results.length === 0) {
        console.log(`Batch ${batch.id} has no results, skipping`);
        continue;
      }

      // Recalculate the summary data
      const totalWords = results.reduce((sum, result) => sum + (result.wordCount || 0), 0);
      const totalConfidence = results.reduce((sum, result) => sum + (result.confidence || 0), 0);
      const avgConfidence = totalConfidence / results.length;

      // Count sentiments
      const sentimentCounts = { POSITIVE: 0, NEUTRAL: 0, NEGATIVE: 0 };
      results.forEach(result => {
        if (result.sentiment && sentimentCounts.hasOwnProperty(result.sentiment)) {
          sentimentCounts[result.sentiment as keyof typeof sentimentCounts]++;
        }
      });

      // Update the batch
      await this.updateBatchAnalysis(batch.id, {
        totalWords,
        avgConfidence,
        sentimentCounts: JSON.stringify(sentimentCounts)
      });

      console.log(`Fixed batch ${batch.id}: ${results.length} results, avg confidence: ${avgConfidence.toFixed(2)}`);
    }
  }
}

export const storage = new DatabaseStorage();