import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useAuth } from '@/hooks/useAuth';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import users1Icon from '@assets/Users-1.png';
import users2Icon from '@assets/Users-2.png';
import users3Icon from '@assets/Users-3.png';

interface PricingTableProps {
  onPlanSelect: (plan: string, isYearly: boolean, clientSecret: string) => void;
  isSignUpFlow?: boolean; // New prop to indicate if this is part of sign-up process
}

export function PricingTable({ onPlanSelect, isSignUpFlow = false }: PricingTableProps) {
  const [isYearly, setIsYearly] = useState(false);
  const [isLoading, setIsLoading] = useState<string | null>(null);
  const { isAuthenticated } = useAuth();
  const { toast } = useToast();

  const handlePlanSelection = async (planName: string) => {
    setIsLoading(planName);
    
    try {
      if (!isAuthenticated) {
        // For unauthenticated users, pass plan selection to parent 
        // Parent will handle authentication first, then create subscription
        onPlanSelect(planName.toLowerCase(), isYearly, '');
        return;
      }

      // For authenticated users, create subscription immediately
      const response = await apiRequest("POST", "/api/create-subscription", { 
        plan: planName.toLowerCase(), 
        isYearly 
      });
      
      const data = await response.json();
      
      if (data.clientSecret) {
        onPlanSelect(planName.toLowerCase(), isYearly, data.clientSecret);
      } else {
        throw new Error('No client secret received');
      }
    } catch (error) {
      console.error("Error creating subscription:", error);
      toast({
        title: "Error",
        description: "Failed to start subscription process. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(null);
    }
  };

  const plans = {
    monthly: [
      {
        name: 'Starter',
        price: '$29/mo.',
        features: [
          'Batch analysis for 5 videos at a time',
          'Analyze 20 videos a month'
        ],
        icon: users1Icon
      },
      {
        name: 'Business',
        price: '$49/mo.',
        features: [
          'Batch analysis for 10 videos at a time',
          'Analyze 50 videos a month'
        ],
        icon: users2Icon
      },
      {
        name: 'Enterprise',
        price: '$129/mo.',
        features: [
          'Batch analysis for 20 videos at a time',
          'Analyze 100 videos a month'
        ],
        icon: users3Icon
      }
    ],
    yearly: [
      {
        name: 'Starter',
        price: '$279/year',
        features: [
          'Batch analysis for 5 videos at a time',
          'Analyze 20 videos a month'
        ],
        icon: users1Icon
      },
      {
        name: 'Business',
        price: '$470/year',
        features: [
          'Batch analysis for 10 videos at a time',
          'Analyze 50 videos a month'
        ],
        icon: users2Icon
      },
      {
        name: 'Enterprise',
        price: '$1,238/year',
        features: [
          'Batch analysis for 20 videos at a time',
          'Analyze 100 videos a month'
        ],
        icon: users3Icon
      }
    ]
  };

  const currentPlans = isYearly ? plans.yearly : plans.monthly;

  return (
    <div className="w-full max-w-4xl">
      <h2 className="text-3xl font-bold text-center mb-8" style={{ color: 'hsl(var(--neutral-800))' }}>
        A Plan for Any Size Team
      </h2>
      
      {/* Monthly/Yearly Toggle with Save 20% Callout */}
      <div className="flex justify-center mb-8">
        <div className="relative">
          {/* Save 20% Callout positioned above Yearly */}
          <div className="absolute -top-12 right-6">
            <div className="relative">
              <div 
                className="px-3 py-1 rounded-full text-sm font-medium text-white"
                style={{ backgroundColor: 'hsl(var(--tree-poppy-500))' }}
              >
                Save 20%
              </div>
              <div 
                className="absolute top-full left-1/2 transform -translate-x-1/2 mt-1"
                style={{ color: 'hsl(var(--tree-poppy-500))' }}
              >
                <svg width="12" height="8" viewBox="0 0 12 8" fill="currentColor">
                  <path d="M6 8L0 0h12L6 8z"/>
                </svg>
              </div>
            </div>
          </div>
          
          <div className="flex items-center bg-white border rounded-full p-1" style={{ borderColor: 'hsl(var(--border))' }}>
            <button
              className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                !isYearly 
                  ? 'bg-blue-ribbon text-white' 
                  : 'text-gray-600 hover:text-gray-800'
              }`}
              onClick={() => setIsYearly(false)}
            >
              Monthly
            </button>
            <span className="mx-1 text-gray-400">|</span>
            <button
              className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                isYearly 
                  ? 'bg-blue-ribbon text-white' 
                  : 'text-gray-600 hover:text-gray-800'
              }`}
              onClick={() => setIsYearly(true)}
            >
              Yearly
            </button>
          </div>
        </div>
      </div>

      {/* Pricing Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {currentPlans.map((plan, index) => (
          <Card 
            key={plan.name} 
            className="bg-white border shadow-sm hover:shadow-md transition-shadow"
            style={{ borderColor: 'hsl(var(--border))' }}
          >
            <CardContent className="p-6">
              {/* Icon */}
              <div className="flex justify-center mb-4">
                <img 
                  src={plan.icon} 
                  alt={`${plan.name} plan icon`}
                  className="w-12 h-12 object-contain"
                />
              </div>

              {/* Plan Name and Price */}
              <h3 className="text-lg font-semibold text-center mb-4" style={{ color: 'hsl(var(--neutral-800))' }}>
                {plan.name} - {plan.price}
              </h3>

              {/* Features */}
              <ul className="space-y-2 mb-6">
                {plan.features.map((feature, featureIndex) => (
                  <li 
                    key={featureIndex}
                    className="text-sm flex items-start"
                    style={{ color: 'hsl(var(--neutral-600))' }}
                  >
                    <span className="mr-2">•</span>
                    {feature}
                  </li>
                ))}
              </ul>

              {/* Sign Up Button */}
              <Button
                className="w-full bg-blue-ribbon hover:opacity-90 text-white"
                onClick={() => handlePlanSelection(plan.name)}
                disabled={isLoading === plan.name}
              >
                {isLoading === plan.name ? (
                  <div className="flex items-center">
                    <div className="w-4 h-4 mr-2 animate-spin border-2 border-white border-t-transparent rounded-full"></div>
                    Creating...
                  </div>
                ) : (
                  `Select ${plan.name}`
                )}
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}