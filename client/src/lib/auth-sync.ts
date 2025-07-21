import { apiRequest } from "./queryClient";

export interface AuthSyncResponse {
  success: boolean;
  message: string;
  stripeCustomerId?: string;
}

/**
 * Sync newly authenticated Firebase user with backend systems
 * This ensures proper user context bridge between Firebase and Stripe
 */
export async function syncUserAfterAuth(displayName?: string): Promise<AuthSyncResponse> {
  try {
    const response = await apiRequest('/api/auth/sync', 'POST', {
      displayName: displayName || ''
    });
    
    return response as AuthSyncResponse;
  } catch (error) {
    console.error('Auth sync error:', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Unknown sync error'
    };
  }
}

/**
 * Handle post-authentication flow including sync and navigation
 */
export async function handlePostAuthFlow(user: { displayName?: string }): Promise<void> {
  try {
    // Sync user with backend systems
    const syncResult = await syncUserAfterAuth(user.displayName);
    
    if (syncResult.success) {
      console.log('User sync completed:', syncResult.message);
    } else {
      console.warn('User sync failed:', syncResult.message);
      // Still proceed - user is authenticated, sync is best effort
    }
  } catch (error) {
    console.error('Post-auth flow error:', error);
    // Don't block user flow for sync failures
  }
}