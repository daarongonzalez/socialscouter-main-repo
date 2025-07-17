import { Switch, Route } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { useLocation } from "wouter";
import Dashboard from "@/pages/dashboard";
import HistoryPage from "@/pages/history";
import Subscribe from "@/pages/subscribe";
import NotFound from "@/pages/not-found";
import { useEffect } from "react";

export default function AppLayout() {
  const [, navigate] = useLocation();
  const { isAuthenticated, isLoading } = useAuth();

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!isAuthenticated && !isLoading) {
      navigate("/login");
    }
  }, [isAuthenticated, isLoading, navigate]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-neutral-500">Loading...</div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  return (
    <Switch>
      <Route path="/" component={Dashboard} />
      <Route path="/dashboard" component={Dashboard} />
      <Route path="/history" component={HistoryPage} />
      <Route path="/subscribe" component={Subscribe} />
      <Route component={NotFound} />
    </Switch>
  );
}