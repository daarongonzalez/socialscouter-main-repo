import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useAuth } from "@/hooks/useAuth";
import Dashboard from "@/pages/dashboard";
import HistoryPage from "@/pages/history";
import Subscribe from "@/pages/subscribe";
import LoginPortal from "@/pages/landing";
import NotFound from "@/pages/not-found";

function Router() {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    // If on dashboard route but not authenticated, redirect to login
    if (window.location.pathname === '/dashboard') {
      window.location.href = '/api/login';
      return null;
    }
    return <Landing />;
  }

  return (
    <Switch>
      {isAuthenticated ? (
        <>
          <Route path="/" component={Dashboard} />
          <Route path="/dashboard" component={Dashboard} />
          <Route path="/history" component={HistoryPage} />
          <Route path="/subscribe" component={Subscribe} />
          <Route component={NotFound} />
        </>
      ) : (
        <>
          <Route path="/subscribe" component={Subscribe} />
          <Route path="*" component={LoginPortal} />
        </>
      )}
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
```import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useAuth } from "@/hooks/useAuth";
import Dashboard from "@/pages/dashboard";
import HistoryPage from "@/pages/history";
import Subscribe from "@/pages/subscribe";
import LoginPortal from "@/pages/landing";
import NotFound from "@/pages/not-found";

function Router() {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-2 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    // If on dashboard route but not authenticated, redirect to login
    if (window.location.pathname === '/dashboard') {
      window.location.href = '/api/login';
      return null;
    }
    return <LoginPortal />;
  }

  return (
    <Switch>
      {isAuthenticated ? (
        <>
          <Route path="/" component={Dashboard} />
          <Route path="/history" component={HistoryPage} />
          <Route path="/subscribe" component={Subscribe} />
          <Route path="/dashboard" component={Dashboard} />
          <Route component={NotFound} />
        </>
      ) : (
        <>
          <Route path="/subscribe" component={Subscribe} />
          <Route path="*" component={LoginPortal} />
        </>
      )}
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;