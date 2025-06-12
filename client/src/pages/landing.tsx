import { Button } from "@/components/ui/button";
import { useEffect } from "react";
import iconNameSmall from "@assets/icon-name-small.png";

export default function Landing() {
  useEffect(() => {
    // Auto-redirect to Replit Auth after a brief moment
    const timer = setTimeout(() => {
      window.location.href = "/api/login";
    }, 1500);

    return () => clearTimeout(timer);
  }, []);

  const handleLogin = () => {
    window.location.href = "/api/login";
  };

  return (
    <div className="min-h-screen" style={{ backgroundColor: 'hsl(var(--neutral-50))' }}>
      {/* Header */}
      <header className="w-full py-4 px-6">
        <div className="flex items-center justify-between max-w-7xl mx-auto">
          <div className="flex items-center gap-2">
            <a href="https://socialscouter.ai/" className="hover:opacity-80 transition-opacity">
              <img src={iconNameSmall} alt="SocialScouter" className="h-8 object-contain" />
            </a>
          </div>
          
          <Button 
            variant="default" 
            className="bg-blue-ribbon hover:opacity-90 text-white px-6"
            onClick={handleLogin}
          >
            Login
          </Button>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex flex-col items-center justify-center px-4 py-16">
        <h1 className="text-4xl font-bold mb-8 text-center" style={{ color: 'hsl(var(--neutral-800))' }}>
          Welcome to SocialScouter
        </h1>
        
        <p className="text-lg mb-8 text-center max-w-2xl" style={{ color: 'hsl(var(--neutral-600))' }}>
          Advanced sentiment analysis for your social media content. 
          Analyze TikTok, Instagram Reels, and YouTube Shorts with AI-powered insights.
        </p>

        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-sm" style={{ color: 'hsl(var(--neutral-500))' }}>
            Redirecting to secure login...
          </p>
        </div>

        <div className="mt-8">
          <Button 
            onClick={handleLogin}
            className="bg-blue-ribbon hover:opacity-90 text-white px-8 py-3 text-lg"
          >
            Continue to App
          </Button>
        </div>
      </div>
    </div>
  );
}