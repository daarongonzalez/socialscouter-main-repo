import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, TrendingUp, BarChart3, Zap } from "lucide-react";
import { useState } from "react";

export default function LoginPortal() {
  const [isYearly, setIsYearly] = useState(false);

  const plans = [
    {
      name: "Starter",
      description: "Perfect for small teams getting started",
      monthlyPrice: 29,
      yearlyPrice: 279,
      features: [
        "Up to 50 video analyses per month",
        "Basic sentiment analysis",
        "Standard support",
        "Export to CSV"
      ],
      popular: false
    },
    {
      name: "Business",
      description: "Ideal for growing social media teams",
      monthlyPrice: 49,
      yearlyPrice: 470,
      features: [
        "Up to 200 video analyses per month",
        "Advanced sentiment analysis",
        "Priority support",
        "Custom reports",
        "Team collaboration",
        "API access"
      ],
      popular: true
    },
    {
      name: "Enterprise",
      description: "For large organizations with custom needs",
      monthlyPrice: 129,
      yearlyPrice: 1238,
      features: [
        "Unlimited video analyses",
        "Advanced AI insights",
        "24/7 dedicated support",
        "Custom integrations",
        "White-label solution",
        "Advanced analytics",
        "Custom workflows"
      ],
      popular: false
    }
  ];

  const handleLogin = () => {
    window.location.href = "/api/login";
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
      {/* Header */}
      <header className="border-b bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-center space-x-2">
            <TrendingUp className="h-8 w-8 text-blue-600" />
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Social Scouter</h1>
          </div>
        </div>
      </header>

      {/* Login Hero Section */}
      <section className="py-16 text-center">
        <div className="container mx-auto px-4">
          <h2 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">
            Welcome to Social Scouter
          </h2>
          <p className="text-lg text-gray-600 dark:text-gray-300 mb-8 max-w-2xl mx-auto">
            Choose your plan and start analyzing social media sentiment with AI-powered insights.
          </p>
          <Button onClick={handleLogin} size="lg" className="px-8 py-3 text-lg">
            Sign In with Replit
          </Button>
        </div>
      </section>

      {/* Pricing Section */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h3 className="text-3xl font-bold mb-4 text-gray-900 dark:text-white">
              Choose Your Plan
            </h3>
            <p className="text-gray-600 dark:text-gray-300 mb-8">
              Start with any plan and upgrade as you grow
            </p>
            
            {/* Billing Toggle */}
            <div className="flex items-center justify-center space-x-4 mb-8">
              <span className={`${!isYearly ? 'text-gray-900 dark:text-white font-semibold' : 'text-gray-500'}`}>
                Monthly
              </span>
              <button
                onClick={() => setIsYearly(!isYearly)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  isYearly ? 'bg-blue-600' : 'bg-gray-200 dark:bg-gray-700'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    isYearly ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
              <span className={`${isYearly ? 'text-gray-900 dark:text-white font-semibold' : 'text-gray-500'}`}>
                Yearly
              </span>
              {isYearly && (
                <Badge variant="secondary" className="bg-green-100 text-green-800">
                  Save 20%
                </Badge>
              )}
            </div>
          </div>

          <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
            {plans.map((plan) => (
              <Card key={plan.name} className={`relative ${plan.popular ? 'border-blue-500 scale-105' : ''}`}>
                {plan.popular && (
                  <Badge className="absolute -top-3 left-1/2 transform -translate-x-1/2 bg-blue-600">
                    Most Popular
                  </Badge>
                )}
                <CardHeader className="text-center">
                  <CardTitle className="text-2xl">{plan.name}</CardTitle>
                  <CardDescription>{plan.description}</CardDescription>
                  <div className="mt-4">
                    <span className="text-4xl font-bold">
                      ${isYearly ? plan.yearlyPrice : plan.monthlyPrice}
                    </span>
                    <span className="text-gray-500">
                      /{isYearly ? 'year' : 'month'}
                    </span>
                  </div>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-3 mb-6">
                    {plan.features.map((feature, index) => (
                      <li key={index} className="flex items-center">
                        <CheckCircle className="h-5 w-5 text-green-500 mr-3" />
                        <span className="text-sm">{feature}</span>
                      </li>
                    ))}
                  </ul>
                  <Button 
                    onClick={handleLogin}
                    className="w-full" 
                    variant={plan.popular ? "default" : "outline"}
                  >
                    Get Started
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-12">
        <div className="container mx-auto px-4 text-center">
          <div className="flex items-center justify-center space-x-2 mb-4">
            <TrendingUp className="h-6 w-6" />
            <span className="text-xl font-bold">SentimentPro</span>
          </div>
          <p className="text-gray-400">
            © 2024 SentimentPro. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}