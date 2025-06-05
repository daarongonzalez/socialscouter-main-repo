import { PLAN_LIMITS, type PlanType } from "@shared/schema";
import { storage } from "../storage";

export interface UsageLimitCheck {
  canProceed: boolean;
  errorMessage?: string;
  currentUsage: {
    monthlyVideoCount: number;
    remainingVideos: number;
  };
  planLimits: {
    maxBatchSize: number;
    monthlyVideoLimit: number;
  };
}

export class PlanLimitsService {
  
  async checkUserLimits(userId: string, requestedVideoCount: number): Promise<UsageLimitCheck> {
    // Get user usage and plan information
    const userUsage = await storage.getUserUsage(userId);
    
    if (!userUsage) {
      return {
        canProceed: false,
        errorMessage: "User not found",
        currentUsage: { monthlyVideoCount: 0, remainingVideos: 0 },
        planLimits: { maxBatchSize: 0, monthlyVideoLimit: 0 }
      };
    }

    // Default to starter plan if no active subscription
    const planType = this.getEffectivePlan(userUsage.subscriptionPlan, userUsage.subscriptionStatus);
    const planLimits = PLAN_LIMITS[planType];
    
    // Check batch size limit
    if (requestedVideoCount > planLimits.maxBatchSize) {
      return {
        canProceed: false,
        errorMessage: `Batch size limit exceeded. Your ${planType} plan allows up to ${planLimits.maxBatchSize} videos per batch.`,
        currentUsage: {
          monthlyVideoCount: userUsage.monthlyVideoCount,
          remainingVideos: Math.max(0, planLimits.monthlyVideoLimit - userUsage.monthlyVideoCount)
        },
        planLimits
      };
    }

    // Check monthly limit
    const wouldExceedMonthlyLimit = (userUsage.monthlyVideoCount + requestedVideoCount) > planLimits.monthlyVideoLimit;
    if (wouldExceedMonthlyLimit) {
      const remainingVideos = Math.max(0, planLimits.monthlyVideoLimit - userUsage.monthlyVideoCount);
      return {
        canProceed: false,
        errorMessage: `Monthly limit exceeded. Your ${planType} plan allows ${planLimits.monthlyVideoLimit} videos per month. You have ${remainingVideos} videos remaining.`,
        currentUsage: {
          monthlyVideoCount: userUsage.monthlyVideoCount,
          remainingVideos
        },
        planLimits
      };
    }

    // All checks passed
    return {
      canProceed: true,
      currentUsage: {
        monthlyVideoCount: userUsage.monthlyVideoCount,
        remainingVideos: Math.max(0, planLimits.monthlyVideoLimit - userUsage.monthlyVideoCount - requestedVideoCount)
      },
      planLimits
    };
  }

  private getEffectivePlan(subscriptionPlan: string | null, subscriptionStatus: string | null): PlanType {
    // If user has an active subscription, use their plan
    if (subscriptionStatus === 'active' && subscriptionPlan && subscriptionPlan in PLAN_LIMITS) {
      return subscriptionPlan as PlanType;
    }
    
    // Default to starter plan for free users or inactive subscriptions
    return 'starter';
  }

  async recordVideoUsage(userId: string, videoCount: number): Promise<void> {
    await storage.incrementUserVideoCount(userId, videoCount);
  }

  async getUserPlanInfo(userId: string) {
    const userUsage = await storage.getUserUsage(userId);
    if (!userUsage) return null;

    const planType = this.getEffectivePlan(userUsage.subscriptionPlan, userUsage.subscriptionStatus);
    const planLimits = PLAN_LIMITS[planType];

    return {
      planType,
      planLimits,
      currentUsage: {
        monthlyVideoCount: userUsage.monthlyVideoCount,
        remainingVideos: Math.max(0, planLimits.monthlyVideoLimit - userUsage.monthlyVideoCount),
        lastResetDate: userUsage.lastResetDate
      },
      subscriptionStatus: userUsage.subscriptionStatus
    };
  }
}

export const planLimitsService = new PlanLimitsService();