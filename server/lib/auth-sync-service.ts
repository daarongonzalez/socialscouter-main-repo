import { storage } from "../storage";
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2025-04-30.basil",
});

export interface UserSyncResult {
  success: boolean;
  message: string;
  userId?: string;
  stripeCustomerId?: string;
}

/**
 * Cloud function-style service for syncing Firebase users with Stripe and database
 * This handles the critical user context bridge between authentication and subscription
 */
export class AuthSyncService {
  
  /**
   * Sync newly authenticated Firebase user with Stripe customer
   */
  async syncFirebaseUserWithStripe(
    firebaseUid: string, 
    email: string, 
    displayName?: string
  ): Promise<UserSyncResult> {
    try {
      // Check if user already exists in our database
      let user = await storage.getUser(firebaseUid);
      
      if (!user) {
        // Create new user record
        const nameParts = displayName?.split(' ') || [];
        user = await storage.upsertUser({
          id: firebaseUid,
          email: email,
          firstName: nameParts[0] || '',
          lastName: nameParts.slice(1).join(' ') || '',
          profileImageUrl: null,
        });
      }
      
      // Check if user already has Stripe customer
      if (!user.stripeCustomerId) {
        // Create Stripe customer with Firebase context
        const customer = await stripe.customers.create({
          email: email,
          name: displayName || email.split('@')[0],
          metadata: {
            firebaseUid: firebaseUid,
            source: 'firebase_auth_sync'
          }
        });
        
        // Update user with Stripe customer ID
        await storage.updateUserStripeInfo(firebaseUid, customer.id, '');
        
        return {
          success: true,
          message: "User synced successfully with new Stripe customer",
          userId: firebaseUid,
          stripeCustomerId: customer.id
        };
      }
      
      return {
        success: true,
        message: "User already synced",
        userId: firebaseUid,
        stripeCustomerId: user.stripeCustomerId
      };
      
    } catch (error) {
      console.error('Error syncing Firebase user with Stripe:', error);
      return {
        success: false,
        message: `Sync failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }
  
  /**
   * Handle post-signup flow - sync user and prepare for subscription selection
   */
  async handlePostSignup(firebaseUid: string, email: string, displayName?: string): Promise<UserSyncResult> {
    const syncResult = await this.syncFirebaseUserWithStripe(firebaseUid, email, displayName);
    
    if (syncResult.success) {
      console.log(`Post-signup sync completed for user ${email} (${firebaseUid})`);
    } else {
      console.error(`Post-signup sync failed for user ${email} (${firebaseUid}):`, syncResult.message);
    }
    
    return syncResult;
  }
  
  /**
   * Handle subscription completion - ensure user is properly set up with their plan
   */
  async handleSubscriptionActivation(
    stripeCustomerId: string, 
    subscriptionId: string, 
    planName: string
  ): Promise<UserSyncResult> {
    try {
      // Get user by Stripe customer ID
      const user = await storage.getUserByStripeCustomerId(stripeCustomerId);
      
      if (!user) {
        throw new Error(`No user found for Stripe customer ${stripeCustomerId}`);
      }
      
      // Update subscription info
      await storage.updateUserStripeInfo(user.id, stripeCustomerId, subscriptionId);
      await storage.updateUserSubscription(stripeCustomerId, 'active', planName);
      
      console.log(`Subscription activated for user ${user.email}: ${planName} plan`);
      
      return {
        success: true,
        message: "Subscription activated successfully",
        userId: user.id,
        stripeCustomerId: stripeCustomerId
      };
      
    } catch (error) {
      console.error('Error activating subscription:', error);
      return {
        success: false,
        message: `Activation failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }
  
  /**
   * Validate that a user context bridge exists between Firebase and Stripe
   */
  async validateUserBridge(firebaseUid: string): Promise<boolean> {
    try {
      const user = await storage.getUser(firebaseUid);
      return !!(user && user.stripeCustomerId);
    } catch (error) {
      console.error('Error validating user bridge:', error);
      return false;
    }
  }
}

export const authSyncService = new AuthSyncService();