import { useQuery } from '@tanstack/react-query';

interface CsrfResponse {
  csrfToken: string;
}

export function useCsrf() {
  const { data, isLoading, error } = useQuery<CsrfResponse>({
    queryKey: ['/api/csrf-token'],
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: false,
  });

  return {
    csrfToken: data?.csrfToken,
    isLoading,
    error
  };
}