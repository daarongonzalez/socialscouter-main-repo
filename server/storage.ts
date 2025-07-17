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
  
  createAnalysisResult(result: InsertAnalysisResult): Promise<AnalysisResult>;
  getAnalysisResultsByBatchId(batchId: number): Promise<AnalysisResult[]>;
  
  createBatchAnalysis(batch: InsertBatchAnalysis): Promise<BatchAnalysis>;
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
}

export const storage = new DatabaseStorage();