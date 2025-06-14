import { useQuery } from "@tanstack/react-query";

export function useAuth() {
  const { data: user, isLoading } = useQuery({
    queryKey: ["/api/auth/user"],
    retry: false,
    staleTime: Infinity, // Don't refetch during auth migration
  });

  return {
    user: null, // No user during auth migration
    isLoading: false, // Not loading during auth migration
    isAuthenticated: false, // Not authenticated during auth migration
  };
}