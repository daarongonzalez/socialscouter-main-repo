import { useState, useEffect } from "react";
import { onAuthStateChange, handleRedirectResult } from "@/lib/firebase";
import { useQuery, useQueryClient } from "@tanstack/react-query";

export function useAuth() {
  const [firebaseUser, setFirebaseUser] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const queryClient = useQueryClient();

  // Get user data from backend after Firebase auth
  const { data: backendUser } = useQuery({
    queryKey: ["/api/auth/user"],
    enabled: !!firebaseUser?.uid,
    retry: false,
  });

  useEffect(() => {
    // Listen to auth state changes
    const unsubscribe = onAuthStateChange((user) => {
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