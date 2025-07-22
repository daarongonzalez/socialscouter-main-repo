import { useState, useEffect } from "react";
import { onAuthStateChange, handleRedirectResult } from "@/lib/firebase";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { handlePostAuthFlow } from "@/lib/auth-sync";

export function useAuth() {
  const [firebaseUser, setFirebaseUser] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [, navigate] = useLocation();
  const queryClient = useQueryClient();

  // Get user data from backend after Firebase auth
  const { data: backendUser, error: backendError } = useQuery({
    queryKey: ["/api/auth/user"],
    enabled: !!firebaseUser?.uid,
    retry: false,
  });

  // Debug backend user fetch
  useEffect(() => {
    if (firebaseUser?.uid && backendError) {
      console.error("Backend user fetch error:", backendError);
    }
    if (backendUser) {
      console.log("Backend user data:", backendUser);
    }
  }, [backendUser, backendError, firebaseUser]);

  useEffect(() => {
    // Listen to auth state changes
    const unsubscribe = onAuthStateChange((user) => {
      console.log("Firebase auth state changed:", user ? `User: ${user.email}` : "No user");
      setFirebaseUser(user);
      setIsLoading(false);
      
      if (user) {
        // Sync user with backend systems after authentication
        handlePostAuthFlow({ displayName: user.displayName || undefined });
        
        // Invalidate queries to refetch user data when user signs in
        queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
        // Redirect to dashboard if user just authenticated
        if (window.location.pathname === "/login" || window.location.pathname === "/app") {
          navigate("/dashboard");
        }
      } else {
        // Clear all queries when user signs out
        queryClient.clear();
      }
    });

    // Handle redirect result on page load - ensure backend sync happens
    handleRedirectResult().then(async (result) => {
      if (result?.user) {
        console.log("Redirect authentication successful");
        
        // Ensure backend user data is properly fetched after redirect
        // This handles the case where redirect result has user but backend fetch might fail
        try {
          await handlePostAuthFlow({ displayName: result.user.displayName || undefined });
          
          // Force refetch of backend user data
          await queryClient.refetchQueries({ queryKey: ["/api/auth/user"] });
          
          console.log("Backend user data sync completed after redirect");
          
          // Check if user had a plan selected before redirect
          const selectedPlan = localStorage.getItem('selectedPlan');
          if (selectedPlan) {
            const [planName, billing] = selectedPlan.split('-');
            const isYearly = billing === 'yearly';
            
            // Clear the stored plan
            localStorage.removeItem('selectedPlan');
            
            // Navigate to login with checkout flow
            navigate(`/login?checkout=${planName}&yearly=${isYearly}`);
          }
        } catch (error) {
          console.error("Backend sync failed after redirect:", error);
          // Don't block the user flow, but log the issue for debugging
        }
      }
    }).catch((error) => {
      console.error("Error handling redirect result:", error);
    });

    return () => unsubscribe();
  }, [queryClient, navigate]);

  return {
    user: backendUser || firebaseUser,
    isLoading,
    isAuthenticated: !!firebaseUser,
    firebaseUser,
  };
}