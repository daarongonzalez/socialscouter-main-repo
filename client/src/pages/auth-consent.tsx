import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import iconNameSmall from "@assets/icon-name-small.png";

export default function AuthConsentPage() {
  const handleAllow = () => {
    // This will be handled by the OAuth flow
    window.location.href = "/api/login";
  };

  const handleDeny = () => {
    window.location.href = "/";
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      {/* Background decorative elements */}
      <div 
        className="absolute top-20 left-10 w-64 h-64 bg-blue-400/10 rounded-full blur-3xl"
      ></div>
      <div 
        className="absolute bottom-20 right-10 w-80 h-80 bg-purple-400/10 rounded-full blur-3xl"
      ></div>

      <Card className="w-full max-w-md bg-white/90 backdrop-blur-sm border border-white/20 shadow-2xl relative z-10">
        <CardContent className="p-8">
          {/* App Icon */}
          <div className="flex justify-center mb-6">
            <div className="w-16 h-16 bg-gradient-to-br from-blue-600 to-purple-600 rounded-2xl flex items-center justify-center shadow-lg">
              <svg 
                className="w-8 h-8 text-white" 
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24"
              >
                <path 
                  strokeLinecap="round" 
                  strokeLinejoin="round" 
                  strokeWidth={2} 
                  d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" 
                />
                <path 
                  strokeLinecap="round" 
                  strokeLinejoin="round" 
                  strokeWidth={2} 
                  d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" 
                />
              </svg>
            </div>
          </div>

          {/* Title */}
          <div className="text-center mb-8">
            <h1 className="text-2xl font-bold text-gray-900 mb-2">
              SocialScouter
            </h1>
            <p className="text-gray-600 text-sm">
              would like to access your Replit account
            </p>
          </div>

          {/* App URL */}
          <div className="bg-gray-50 rounded-lg p-3 mb-6 text-center">
            <p className="text-xs text-gray-500">
              {window.location.origin}
            </p>
          </div>

          {/* Permissions */}
          <div className="mb-8">
            <p className="text-sm font-medium text-gray-900 mb-4">
              This app is requesting the following permissions:
            </p>
            <ul className="space-y-2 text-sm text-gray-600">
              <li className="flex items-start">
                <span className="w-1.5 h-1.5 bg-blue-600 rounded-full mt-2 mr-3 flex-shrink-0"></span>
                Verify your identity
              </li>
              <li className="flex items-start">
                <span className="w-1.5 h-1.5 bg-blue-600 rounded-full mt-2 mr-3 flex-shrink-0"></span>
                Access your email address
              </li>
              <li className="flex items-start">
                <span className="w-1.5 h-1.5 bg-blue-600 rounded-full mt-2 mr-3 flex-shrink-0"></span>
                Access your basic profile information
              </li>
              <li className="flex items-start">
                <span className="w-1.5 h-1.5 bg-blue-600 rounded-full mt-2 mr-3 flex-shrink-0"></span>
                Stay signed in to this application
              </li>
            </ul>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3">
            <Button
              variant="outline"
              className="flex-1 border-gray-300 text-gray-700 hover:bg-gray-50"
              onClick={handleDeny}
            >
              Deny
            </Button>
            <Button
              className="flex-1 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white shadow-lg hover:shadow-xl transition-all duration-200"
              onClick={handleAllow}
            >
              Allow
            </Button>
          </div>

          {/* Security Notice */}
          <div className="mt-6 pt-6 border-t border-gray-200">
            <div className="flex items-center justify-center text-xs text-gray-500">
              <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
              </svg>
              Log in secured by
              <span className="font-semibold ml-1 text-orange-600">replit</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}