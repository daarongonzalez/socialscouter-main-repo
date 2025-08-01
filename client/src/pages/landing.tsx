import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useState } from "react";
import iconNameSmall from "@assets/icon-name-small.png";
import { PricingTable } from "@/components/pricing-table";

export default function LoginPortal() {
  const [isSignUp, setIsSignUp] = useState(false);
  const [showPricing, setShowPricing] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [selectedPlan, setSelectedPlan] = useState("");

  const handleAuthAction = async () => {
    try {
      const { signInWithGoogle } = await import("@/lib/firebase");
      await signInWithGoogle();
    } catch (error) {
      console.error("Authentication error:", error);
      alert("Authentication failed. Please try again.");
    }
  };

  const handleSignUpClick = () => {
    if (isSignUp && !showPricing) {
      // Show pricing table when signing up
      setShowPricing(true);
    } else {
      // Handle login - currently disabled
      handleAuthAction();
    }
  };

  const handlePlanSelect = (plan: string, isYearly: boolean) => {
    setSelectedPlan(`${plan}-${isYearly ? 'yearly' : 'monthly'}`);
    // Authentication system temporarily disabled during migration
    handleAuthAction();
  };

  const handleBackToSignup = () => {
    setShowPricing(false);
  };

  return (
    <div className="min-h-screen" style={{ backgroundColor: 'hsl(var(--neutral-50))' }}>
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
            onClick={handleAuthAction}
          >Login</Button>
        </div>
      </header>
      {/* Main Content */}
      <div className="flex flex-col items-center justify-center px-4 py-16 relative">
        <h1 className="text-4xl font-bold mb-16 text-center" style={{ color: 'hsl(var(--neutral-800))' }}>
          {isSignUp ? "We're Stoked You're Here!" : "Welcome Back!"}
        </h1>

        {/* Background Gradients */}
        <div 
          className="absolute pointer-events-none"
          style={{
            top: '15%',
            left: '5%',
            width: '500px',
            height: '500px',
            background: `radial-gradient(circle, hsl(var(--blue-ribbon-500) / 0.15) 0%, hsl(var(--blue-ribbon-500) / 0.08) 40%, transparent 70%)`,
            borderRadius: '50%'
          }}
        ></div>
        
        <div 
          className="absolute pointer-events-none"
          style={{
            bottom: '5%',
            right: '5%',
            width: '450px',
            height: '450px',
            background: `radial-gradient(circle, hsl(var(--tree-poppy-500) / 0.15) 0%, hsl(var(--tree-poppy-500) / 0.08) 40%, transparent 70%)`,
            borderRadius: '50%'
          }}
        ></div>

        {/* Conditional Content - Pricing Table or Login/Signup Form */}
        {isSignUp && showPricing ? (
          <div className="relative z-10">
            <PricingTable onPlanSelect={handlePlanSelect} />
            <div className="mt-8 text-center">
              <button
                type="button"
                className="text-sm text-tree-poppy hover:opacity-80"
                onClick={handleBackToSignup}
              >
                ← Back to Sign Up Form
              </button>
            </div>
          </div>
        ) : (
          <Card className="w-full max-w-md bg-card border shadow-lg relative z-10" style={{ borderColor: 'hsl(var(--blue-ribbon-500))', borderWidth: '1px' }}>
            <CardContent className="p-8">
              <div className="flex flex-col items-center mb-6">
                <img src={iconNameSmall} alt="SocialScouter" className="h-12 object-contain mb-4" />
                
                {isSignUp ? (
                  <>
                    <h2 className="text-xl font-semibold mb-1" style={{ color: 'hsl(var(--neutral-800))' }}>Welcome!</h2>
                    <p className="text-sm text-center" style={{ color: 'hsl(var(--neutral-500))' }}>Sign up to create your account</p>
                  </>
                ) : (
                  <>
                    <p className="text-sm text-center" style={{ color: 'hsl(var(--neutral-500))' }}>Sign in to continue to your account</p>
                  </>
                )}
              </div>

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
                  className="w-full bg-blue-ribbon hover:opacity-90 text-white py-2 rounded-md mt-6"
                  onClick={handleSignUpClick}
                >
                  {isSignUp ? "Continue to Pricing" : "Sign In"}
                </Button>
              </form>

              <div className="mt-6">
                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t" style={{ borderColor: 'hsl(var(--border))' }} />
                  </div>
                  <div className="relative flex justify-center text-sm">
                    <span className="px-2 bg-card" style={{ color: 'hsl(var(--neutral-500))' }}>OR CONTINUE WITH</span>
                  </div>
                </div>

                <Button
                  type="button"
                  variant="outline"
                  className="w-full mt-4 border hover:bg-muted"
                  style={{ borderColor: 'hsl(var(--border))', color: 'hsl(var(--neutral-600))' }}
                  onClick={handleAuthAction}
                >
                  <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                  </svg>
                  Sign {isSignUp ? 'up' : 'in'} with Google
                </Button>
              </div>

              <div className="mt-6 text-center">
                <button
                  type="button"
                  className="text-sm text-tree-poppy hover:opacity-80"
                  onClick={() => {
                    setIsSignUp(!isSignUp);
                    setShowPricing(false);
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
        )}
      </div>
    </div>
  );
}