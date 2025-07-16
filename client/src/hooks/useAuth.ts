import { useState, useEffect } from "react";
import { onAuthStateChange, handleRedirectResult } from "@/lib/firebase";
import { useQuery, useQueryClient } from "@tanstack/react-query";

export function useAuth() {
  const [firebaseUser, setFirebaseUser] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
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
        // Invalidate queries to refetch user data when user signs in
        queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      } else {
        // Clear all queries when user signs out
        queryClient.clear();
      }
    });

    // Handle redirect result on page load (only in production)
    if (!import.meta.env.DEV) {
      handleRedirectResult().then((result) => {
        if (result?.user) {
          console.log("Redirect authentication successful");
        }
      }).catch((error) => {
        console.error("Error handling redirect result:", error);
      });
    }

    return () => unsubscribe();
  }, [queryClient]);

  return {
    user: backendUser || firebaseUser,
    isLoading,
    isAuthenticated: !!firebaseUser,
    firebaseUser,
  };
}