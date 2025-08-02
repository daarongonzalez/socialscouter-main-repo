import * as React from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useState } from "react";
import { useLocation } from "wouter";
import iconNameSmall from "@assets/icon-name-small.png";
import { PricingTable } from "@/components/pricing-table";
import { SubscriptionCheckout } from "@/components/subscription-checkout";
import { useAuth } from "@/hooks/useAuth";
import { useEffect } from "react";
import { useIsMobile } from "@/hooks/use-mobile";

export default function LoginPage() {
  const [, navigate] = useLocation();
  const { isAuthenticated, isLoading } = useAuth();
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [selectedPlan, setSelectedPlan] = useState("");
  const [authError, setAuthError] = useState<string | null>(null);
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [showCheckout, setShowCheckout] = useState(false);
  const [checkoutData, setCheckoutData] = useState<{
    planName: string;
    isYearly: boolean;
    clientSecret: string;
  } | null>(null);
  const isMobile = useIsMobile();

  // Handle post-redirect checkout flow
  useEffect(() => {
    if (isAuthenticated) {
      const urlParams = new URLSearchParams(window.location.search);
      const checkoutPlan = urlParams.get('checkout');
      const isYearly = urlParams.get('yearly') === 'true';
      
      if (checkoutPlan) {
        // Clear URL parameters
        window.history.replaceState({}, '', window.location.pathname);
        
        // Trigger subscription creation
        handlePostAuthSubscription(checkoutPlan, isYearly);
      }
    }
  }, [isAuthenticated]);

  // After successful authentication, check localStorage for stored plan and trigger checkout
  useEffect(() => {
    if (isAuthenticated) {
      const storedPlan = localStorage.getItem('selectedPlan');
      const storedIsYearly = localStorage.getItem('selectedIsYearly');
      if (storedPlan) {
        const isYearly = storedIsYearly ? JSON.parse(storedIsYearly) : false;
        handlePostAuthSubscription(storedPlan, isYearly);
        localStorage.removeItem('selectedPlan');
        localStorage.removeItem('selectedIsYearly');
      }
    }
  }, [isAuthenticated]);

  // Redirect authenticated users to app (unless they're in checkout flow)
  if (isAuthenticated && !showCheckout) {
    navigate("/app");
    return null;
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-neutral-500">Loading...</div>
      </div>
    );
  }

  const handleEmailPasswordAuth = async () => {
    if (!email || !password) {
      setAuthError("Please enter both email and password.");
      return;
    }

    if (isSignUp && password !== confirmPassword) {
      setAuthError("Passwords do not match.");
      return;
    }

    try {
      setAuthError(null);
      setIsAuthenticating(true);

      if (isSignUp) {
        const { signUpWithEmail } = await import("@/lib/firebase");
        await signUpWithEmail(email, password);
        console.log("User signed up successfully");
      } else {
        const { signInWithEmail } = await import("@/lib/firebase");
        await signInWithEmail(email, password);
        console.log("User signed in successfully");
      }

      // If there's a selected plan, create subscription after authentication
      if (selectedPlan) {
        await handlePostAuthSubscription(selectedPlan, false);
      }

      // Navigation will be handled by useAuth hook
    } catch (error: any) {
      setIsAuthenticating(false);
      console.error("Authentication error:", error);

      let errorMessage = "Authentication failed. Please try again.";

      if (error?.code === "auth/user-not-found") {
        errorMessage = "No account found with this email address.";
      } else if (error?.code === "auth/wrong-password") {
        errorMessage = "Incorrect password.";
      } else if (error?.code === "auth/email-already-in-use") {
        errorMessage = "An account with this email already exists.";
      } else if (error?.code === "auth/weak-password") {
        errorMessage = "Password should be at least 6 characters.";
      } else if (error?.code === "auth/invalid-email") {
        errorMessage = "Invalid email address.";
      } else if (error?.message) {
        errorMessage = `Authentication failed: ${error.message}`;
      }

      setAuthError(errorMessage);
    }
  };

  const handleGoogleAuth = async () => {
    try {
      setIsAuthenticating(true);
      setAuthError(null);

      const { signInWithGoogle } = await import("@/lib/firebase");
      
      // Store selected plan before redirect (if any)
      if (selectedPlan) {
        localStorage.setItem('selectedPlan', selectedPlan);
      }
      
      // signInWithGoogle uses redirect, so this will redirect the page
      await signInWithGoogle();
      
      // Code after this won't execute due to redirect
    } catch (error) {
      console.error("Authentication error:", error);
      setAuthError("Authentication failed. Please try again.");
      setIsAuthenticating(false);
    }
  };

  const handlePostAuthSubscription = async (planName: string, isYearly: boolean = false) => {
    try {
      console.log(`Creating subscription for plan: ${planName}`);
      const { apiRequest } = await import("@/lib/queryClient");

      const response = await apiRequest("POST", "/api/create-subscription", { 
        plan: planName.toLowerCase(), 
        isYearly
      });

      const data = await response.json();

      if (data.clientSecret) {
        setCheckoutData({ 
          planName: planName.toLowerCase(), 
          isYearly, 
          clientSecret: data.clientSecret 
        });
        setShowCheckout(true);
        setSelectedPlan(""); // Clear selected plan
      }
    } catch (error) {
      console.error("Error creating post-auth subscription:", error);
      setAuthError("Failed to process subscription. Please try again.");
    }
  };

  const handleSignUpClick = () => {
    if (isSignUp) {
      // Handle email/password login
      handleEmailPasswordAuth();
    } else {
      // Show pricing table when signing up
      setShowCheckout(true); // This will trigger the checkout modal
    }
  };

  const handlePlanSelect = async (planName: string, isYearly: boolean, clientSecret: string) => {
    if (clientSecret) {
      setCheckoutData({ planName, isYearly, clientSecret });
      setShowCheckout(true);
      return;
    }

    if (isAuthenticated) {
      await handlePostAuthSubscription(planName, isYearly);
      return;
    }

    // For unauthenticated users: store plan and billing period in localStorage
    setSelectedPlan(planName);
    localStorage.setItem('selectedPlan', planName);
    localStorage.setItem('selectedIsYearly', JSON.stringify(isYearly));
    setAuthError(`Please sign up or log in to continue with your ${planName} plan.`);
  };

  const handleBackToSignup = () => {
    setShowCheckout(false);
    setCheckoutData(null);
  };

  const handleBackFromCheckout = () => {
    setShowCheckout(false);
    setCheckoutData(null);
  };

  return (
    <div className="min-h-screen bg-neutral-50">
      {/* Header */}
      <header className="w-full py-4 px-6">
        <div className="flex items-center justify-between max-w-7xl mx-auto">
          <div className="flex items-center gap-2">
            <span className="text-sm" style={{ color: 'hsl(var(--neutral-500))' }}>Blog</span>
            <span className="text-sm" style={{ color: 'hsl(var(--neutral-500))' }}>Products</span>
          </div>

          <div className="flex items-center gap-2">
            <a href="https://socialscouter.ai/" className="hover:opacity-80 transition-opacity">
              <img src={iconNameSmall} alt="SocialScouter" className="h-8 object-contain" />
            </a>
          </div>

          <Button 
            variant="default" 
            className="bg-blue-ribbon hover:opacity-90 text-white px-6"
            onClick={handleGoogleAuth}
          >Login</Button>
        </div>
      </header>

      {/* Main Content */}
      <div className={`flex ${isMobile ? 'flex-col' : 'flex-row'} items-start justify-center w-full max-w-7xl mx-auto px-4 py-16 gap-8`}>
        {/* Pricing Table Section */}
        <div className={`${isMobile ? 'w-full mb-8' : 'w-1/2 pr-8'}`}> 
          <div className="mb-4 text-center">
            <h2 className="text-2xl font-bold mb-2" style={{ color: 'hsl(var(--neutral-800))' }}>
              Choose Your Plan
            </h2>
            <p className="text-neutral-600 mb-2">
              Select a plan, then sign up or log in to continue to checkout.
            </p>
          </div>
          <PricingTable onPlanSelect={handlePlanSelect} isSignUpFlow={true} />
        </div>
        {/* Auth Form Section */}
        <div className={`${isMobile ? 'w-full' : 'w-1/2'}`}> 
          <Card className="w-full max-w-md mx-auto bg-white border-0 shadow-lg">
            <CardContent className="p-8">
              {authError && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
                  <p className="text-sm text-red-700">{authError}</p>
                </div>
              )}
              <form className="space-y-4">
                {isSignUp && (
                  <div>
                    <Label htmlFor="fullName" className="text-sm" style={{ color: 'hsl(var(--neutral-600))' }}>
                      Full Name / Business Name
                    </Label>
                    <Input
                      id="fullName"
                      type="text"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      className="mt-1 w-full rounded-md border-input"
                      placeholder="Enter your full name"
                    />
                  </div>
                )}

                <div>
                  <Label htmlFor="email" className="text-sm" style={{ color: 'hsl(var(--neutral-600))' }}>
                    Email
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="mt-1 w-full rounded-md border-input"
                    placeholder="Enter your email"
                  />
                </div>

                <div>
                  <Label htmlFor="password" className="text-sm" style={{ color: 'hsl(var(--neutral-600))' }}>
                    Password
                  </Label>
                  <Input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="mt-1 w-full rounded-md border-input"
                    placeholder="Enter your password"
                  />
                </div>

                {isSignUp && (
                  <div>
                    <Label htmlFor="confirmPassword" className="text-sm" style={{ color: 'hsl(var(--neutral-600))' }}>
                      Confirm Password
                    </Label>
                    <Input
                      id="confirmPassword"
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="mt-1 w-full rounded-md border-input"
                      placeholder="Confirm your password"
                    />
                  </div>
                )}

                <Button
                  type="button"
                  className="w-full bg-tree-poppy hover:opacity-90 text-white"
                  onClick={handleSignUpClick}
                  disabled={isAuthenticating}
                >
                  {isAuthenticating ? "Redirecting..." : (isSignUp ? "Sign Up" : "Sign In")}
                </Button>

                <div className="text-center text-sm" style={{ color: 'hsl(var(--neutral-500))' }}>
                  or
                </div>

                <Button
                  type="button"
                  variant="outline"
                  className="w-full mt-4 border hover:bg-muted"
                  style={{ borderColor: 'hsl(var(--border))', color: 'hsl(var(--neutral-600))' }}
                  onClick={handleGoogleAuth}
                  disabled={isAuthenticating}
                >
                  {isAuthenticating ? (
                    <div className="w-5 h-5 mr-2 animate-spin border-2 border-neutral-300 border-t-neutral-600 rounded-full"></div>
                  ) : (
                    <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
                      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                    </svg>
                  )}
                  {isAuthenticating ? "Redirecting to Google..." : `Sign ${isSignUp ? 'up' : 'in'} with Google`}
                </Button>
              </form>

              <div className="mt-6 text-center">
                <button
                  type="button"
                  className="text-sm text-tree-poppy hover:opacity-80"
                  onClick={() => {
                    setIsSignUp(!isSignUp);
                  }}
                >
                  {isSignUp 
                    ? "Already have an account? Sign In!" 
                    : "Don't have an account? Sign Up!"
                  }
                </button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
      {/* Checkout Modal */}
      {showCheckout && checkoutData && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-lg p-8 max-w-lg w-full">
            <SubscriptionCheckout 
              planName={checkoutData.planName}
              isYearly={checkoutData.isYearly}
              clientSecret={checkoutData.clientSecret}
              onBack={handleBackFromCheckout}
            />
          </div>
        </div>
      )}
    </div>
  );
}