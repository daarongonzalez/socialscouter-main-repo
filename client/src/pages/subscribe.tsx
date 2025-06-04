import { useStripe, Elements, PaymentElement, useElements } from '@stripe/react-stripe-js';
import { loadStripe } from '@stripe/stripe-js';
import { useEffect, useState } from 'react';
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, ArrowLeft } from "lucide-react";
import { Link } from "wouter";

// Make sure to call `loadStripe` outside of a component's render to avoid
// recreating the `Stripe` object on every render.
if (!import.meta.env.VITE_STRIPE_PUBLIC_KEY) {
  throw new Error('Missing required Stripe key: VITE_STRIPE_PUBLIC_KEY');
}
const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLIC_KEY);

const SubscribeForm = ({ priceId, planName }: { priceId: string; planName: string }) => {
  const stripe = useStripe();
  const elements = useElements();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    if (!stripe || !elements) {
      return;
    }

    const { error } = await stripe.confirmPayment({
      elements,
      confirmParams: {
        return_url: window.location.origin + "/dashboard",
      },
    });

    if (error) {
      toast({
        title: "Payment Failed",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({
        title: "Payment Successful",
        description: `You are now subscribed to ${planName}!`,
      });
    }
    setIsLoading(false);
  };

  return (
    <Card className="max-w-md mx-auto">
      <CardHeader>
        <CardTitle>Complete Your {planName} Subscription</CardTitle>
        <CardDescription>
          Enter your payment details to start your subscription
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <PaymentElement />
          <Button type="submit" disabled={!stripe || isLoading} className="w-full">
            {isLoading ? "Processing..." : `Subscribe to ${planName}`}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
};

export default function Subscribe() {
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);
  const [clientSecret, setClientSecret] = useState("");
  const [isYearly, setIsYearly] = useState(false);

  const plans = [
    {
      id: "starter",
      name: "Starter",
      description: "Perfect for small teams getting started",
      monthlyPrice: 29,
      yearlyPrice: 279,
      monthlyPriceId: "price_starter_monthly", // You'll need to create these in Stripe
      yearlyPriceId: "price_starter_yearly",
      features: [
        "Up to 50 video analyses per month",
        "Basic sentiment analysis",
        "Standard support",
        "Export to CSV"
      ],
      popular: false
    },
    {
      id: "business",
      name: "Business",
      description: "Ideal for growing social media teams",
      monthlyPrice: 49,
      yearlyPrice: 470,
      monthlyPriceId: "price_business_monthly",
      yearlyPriceId: "price_business_yearly",
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
      id: "enterprise",
      name: "Enterprise",
      description: "For large organizations with custom needs",
      monthlyPrice: 129,
      yearlyPrice: 1238,
      monthlyPriceId: "price_enterprise_monthly",
      yearlyPriceId: "price_enterprise_yearly",
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

  const handlePlanSelection = async (plan: typeof plans[0]) => {
    const priceId = isYearly ? plan.yearlyPriceId : plan.monthlyPriceId;
    
    try {
      const response = await apiRequest("POST", "/api/create-subscription", { 
        priceId, 
        planName: plan.name 
      });
      const data = await response.json();
      
      setClientSecret(data.clientSecret);
      setSelectedPlan(plan.name);
    } catch (error) {
      console.error("Error creating subscription:", error);
    }
  };

  if (clientSecret && selectedPlan) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-12">
        <div className="container mx-auto px-4">
          <Link href="/dashboard">
            <Button variant="ghost" className="mb-8">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Dashboard
            </Button>
          </Link>
          
          <Elements stripe={stripePromise} options={{ clientSecret }}>
            <SubscribeForm priceId="" planName={selectedPlan} />
          </Elements>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-12">
      <div className="container mx-auto px-4">
        <Link href="/dashboard">
          <Button variant="ghost" className="mb-8">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Dashboard
          </Button>
        </Link>

        <div className="text-center mb-12">
          <h1 className="text-3xl font-bold mb-4">Choose Your Plan</h1>
          <p className="text-gray-600 dark:text-gray-300 mb-8">
            Select the plan that best fits your needs
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
            <Card key={plan.id} className={`relative ${plan.popular ? 'border-blue-500 scale-105' : ''}`}>
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
                  onClick={() => handlePlanSelection(plan)}
                  className="w-full" 
                  variant={plan.popular ? "default" : "outline"}
                >
                  Choose {plan.name}
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}