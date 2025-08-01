import { useState } from 'react';
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { loadStripe } from '@stripe/stripe-js';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft } from 'lucide-react';
import { queryClient } from '@/lib/queryClient';
import { useLocation } from 'wouter';

const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLIC_KEY!);

interface SubscriptionCheckoutProps {
  planName: string;
  isYearly: boolean;
  clientSecret: string;
  onBack: () => void;
}

function CheckoutForm({ planName, isYearly, onBack }: { planName: string; isYearly: boolean; onBack: () => void }) {
  const stripe = useStripe();
  const elements = useElements();
  const { toast } = useToast();
  const [isProcessing, setIsProcessing] = useState(false);
  const [, navigate] = useLocation();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!stripe || !elements) {
      return;
    }

    setIsProcessing(true);

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
      setIsProcessing(false);
    } else {
      toast({
        title: "Payment Successful",
        description: `Successfully subscribed to ${planName}!`,
      });
      
      // Invalidate user plan query to refetch updated subscription
      queryClient.invalidateQueries({ queryKey: ['/api/user/plan'] });
      queryClient.invalidateQueries({ queryKey: ['/api/auth/user'] });
      
      // Navigate to dashboard
      navigate("/dashboard");
    }
  };

  const planDisplayName = planName.charAt(0).toUpperCase() + planName.slice(1);
  const billingPeriod = isYearly ? 'yearly' : 'monthly';

  return (
    <div className="max-w-md mx-auto">
      <Card>
        <CardHeader>
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="sm" onClick={onBack}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <CardTitle>Complete Your Subscription</CardTitle>
          </div>
          <p className="text-sm text-gray-600">
            {planDisplayName} Plan - {billingPeriod}
          </p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <PaymentElement />
            <Button 
              type="submit" 
              disabled={!stripe || isProcessing} 
              className="w-full bg-blue-ribbon hover:opacity-90 text-white"
            >
              {isProcessing ? (
                <div className="flex items-center">
                  <div className="w-4 h-4 mr-2 animate-spin border-2 border-white border-t-transparent rounded-full"></div>
                  Processing...
                </div>
              ) : (
                `Subscribe to ${planDisplayName}`
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

export function SubscriptionCheckout({ planName, isYearly, clientSecret, onBack }: SubscriptionCheckoutProps) {
  const options = {
    clientSecret,
    appearance: {
      theme: 'stripe' as const,
    },
  };

  return (
    <div className="w-full max-w-2xl mx-auto">
      <Elements stripe={stripePromise} options={options}>
        <CheckoutForm planName={planName} isYearly={isYearly} onBack={onBack} />
      </Elements>
    </div>
  );
}