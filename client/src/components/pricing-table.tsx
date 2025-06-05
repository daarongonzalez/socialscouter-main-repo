import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import users1Icon from '@assets/Users-1.png';
import users2Icon from '@assets/Users-2.png';
import users3Icon from '@assets/Users-3.png';

interface PricingTableProps {
  onPlanSelect: (plan: string, isYearly: boolean) => void;
}

export function PricingTable({ onPlanSelect }: PricingTableProps) {
  const [isYearly, setIsYearly] = useState(false);

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
        price: '$1,238/mo.',
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
      
      {/* Monthly/Yearly Toggle */}
      <div className="flex justify-center mb-8">
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
                onClick={() => onPlanSelect(plan.name.toLowerCase(), isYearly)}
              >
                Sign Up
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}