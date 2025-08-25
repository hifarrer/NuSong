import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Header } from "@/components/Header";
import { Check, Music, Zap, Crown, User, LogOut, CreditCard } from "lucide-react";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import type { SubscriptionPlan } from "@shared/schema";

export default function Pricing() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [billingCycle, setBillingCycle] = useState<'weekly' | 'monthly' | 'yearly'>('monthly');
  
  const { data: plans = [], isLoading } = useQuery<SubscriptionPlan[]>({
    queryKey: ["/api/plans"],
  });

  // Stripe checkout mutation
  const checkoutMutation = useMutation({
    mutationFn: async ({ planId, billingCycle }: { planId: string; billingCycle: 'weekly' | 'monthly' | 'yearly' }) => {
      const response = await apiRequest("/api/stripe/create-checkout-session", "POST", {
        planId,
        billingCycle,
      });
      return response;
    },
    onSuccess: (data) => {
      // Redirect to Stripe checkout
      if (data.url) {
        window.location.href = data.url;
      }
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create checkout session",
        variant: "destructive",
      });
    },
  });

  const handleSubscribe = (planId: string, billingCycle: 'weekly' | 'monthly' | 'yearly') => {
    if (!user) {
      setLocation("/auth");
      return;
    }

    // Check if plan has price ID for the selected billing cycle
    const plan = plans.find(p => p.id === planId);
    if (!plan) return;

    let hasPriceId = false;
    switch (billingCycle) {
      case 'weekly':
        hasPriceId = !!plan.weeklyPriceId;
        break;
      case 'monthly':
        hasPriceId = !!plan.monthlyPriceId;
        break;
      case 'yearly':
        hasPriceId = !!plan.yearlyPriceId;
        break;
    }

    if (!hasPriceId) {
      toast({
        title: "Configuration Error",
        description: `This plan is not configured for ${billingCycle} billing. Please contact support.`,
        variant: "destructive",
      });
      return;
    }

    checkoutMutation.mutate({ planId, billingCycle });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-indigo-900">
        <div className="container mx-auto px-4 py-16">
          <div className="text-center mb-16">
            <div className="h-12 bg-gray-700 rounded animate-pulse mb-4 max-w-md mx-auto" />
            <div className="h-6 bg-gray-700 rounded animate-pulse max-w-2xl mx-auto" />
          </div>
          <div className="grid gap-8 md:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-96 bg-gray-700 rounded-lg animate-pulse" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  const getPlanIcon = (planName: string) => {
    if (planName.toLowerCase().includes('premium')) return Crown;
    if (planName.toLowerCase().includes('basic')) return Zap;
    return Music;
  };

  const getPlanColor = (planName: string) => {
    if (planName.toLowerCase().includes('premium')) return 'from-yellow-600 to-orange-600';
    if (planName.toLowerCase().includes('basic')) return 'from-purple-600 to-indigo-600';
    return 'from-green-600 to-teal-600';
  };

  const formatPrice = (price: string) => {
    const num = parseFloat(price);
    return num === 0 ? 'Free' : `$${num}`;
  };

  const getPlanPrice = (plan: SubscriptionPlan) => {
    if (plan.name === 'Free') return '0';
    switch (billingCycle) {
      case 'weekly':
        return plan.weeklyPrice || '0';
      case 'monthly':
        return plan.monthlyPrice || '0';
      case 'yearly':
        return plan.yearlyPrice || '0';
      default:
        return plan.monthlyPrice || '0';
    }
  };

  const getBillingPeriod = () => {
    switch (billingCycle) {
      case 'weekly':
        return 'week';
      case 'monthly':
        return 'month';
      case 'yearly':
        return 'year';
      default:
        return 'month';
    }
  };

  const getSavingsPercentage = (plan: SubscriptionPlan) => {
    if (plan.name === 'Free') return 0;
    
    switch (billingCycle) {
      case 'yearly':
        if (plan.monthlyPrice && plan.yearlyPrice) {
          const monthly = parseFloat(plan.monthlyPrice);
          const yearly = parseFloat(plan.yearlyPrice);
          return Math.round((1 - (yearly / (monthly * 12))) * 100);
        }
        break;
      case 'monthly':
        if (plan.weeklyPrice && plan.monthlyPrice) {
          const weekly = parseFloat(plan.weeklyPrice);
          const monthly = parseFloat(plan.monthlyPrice);
          return Math.round((1 - (monthly / (weekly * 4))) * 100);
        }
        break;
    }
    return 0;
  };

  const getFeatures = (plan: SubscriptionPlan): string[] => {
    if (!plan.features) return [];
    if (typeof plan.features === 'string') {
      try {
        return JSON.parse(plan.features);
      } catch {
        return (plan.features as string).split('\n').map((f: string) => f.replace('• ', '').trim()).filter(Boolean);
      }
    }
    return Array.isArray(plan.features) ? plan.features : [];
  };

  return (
    <div className="min-h-screen text-white">
      {/* Header */}
      <Header currentPage="pricing" />

      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-indigo-900">

      <div className="container mx-auto px-4 py-16">
        {/* Header */}
        <div className="text-center mb-16">
          <h1 className="text-4xl md:text-6xl font-bold text-white mb-6">
            Choose Your <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-400">Creative Plan</span>
          </h1>
          <p className="text-xl text-gray-300 max-w-2xl mx-auto mb-8">
            Unlock the power of AI music generation with our flexible subscription plans. 
            Create amazing music that fits your needs and budget.
          </p>
          
          {/* Billing Cycle Buttons */}
          <div className="flex items-center justify-center space-x-2 bg-gray-800/50 rounded-lg p-4 max-w-md mx-auto">
            <Button
              variant={billingCycle === 'weekly' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setBillingCycle('weekly')}
              className={billingCycle === 'weekly' 
                ? 'bg-purple-600 hover:bg-purple-700 text-white' 
                : 'border-gray-600 text-purple-400 hover:bg-gray-700 hover:text-purple-300'
              }
            >
              Weekly
            </Button>
            <Button
              variant={billingCycle === 'monthly' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setBillingCycle('monthly')}
              className={billingCycle === 'monthly' 
                ? 'bg-purple-600 hover:bg-purple-700 text-white' 
                : 'border-gray-600 text-purple-400 hover:bg-gray-700 hover:text-purple-300'
              }
            >
              Monthly
            </Button>
            <Button
              variant={billingCycle === 'yearly' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setBillingCycle('yearly')}
              className={billingCycle === 'yearly' 
                ? 'bg-purple-600 hover:bg-purple-700 text-white' 
                : 'border-gray-600 text-purple-400 hover:bg-gray-700 hover:text-purple-300'
              }
            >
              Yearly
            </Button>
            {billingCycle === 'yearly' && (
              <span className="text-green-400 text-xs font-medium bg-green-900/20 px-2 py-1 rounded ml-2">
                Save up to {Math.max(...plans.map(plan => getSavingsPercentage(plan)))}%
              </span>
            )}
          </div>
        </div>

        {/* Pricing Cards */}
        <div className="grid gap-8 md:grid-cols-3 max-w-6xl mx-auto">
          {plans.map((plan) => {
            const IconComponent = getPlanIcon(plan.name);
            const gradientColor = getPlanColor(plan.name);
            const features = getFeatures(plan);
            const isPopular = plan.name.toLowerCase().includes('basic');
            
            return (
              <Card 
                key={plan.id}
                className={`bg-gray-800/50 border-gray-700 backdrop-blur-sm relative h-[750px] grid grid-rows-[auto_1fr_auto] ${
                  isPopular ? 'ring-2 ring-purple-500' : ''
                }`}
                data-testid={`card-plan-${plan.name.toLowerCase()}`}
              >
                {isPopular && (
                  <div className="absolute -top-3 left-1/2 transform -translate-x-1/2 z-10">
                    <span className="bg-gradient-to-r from-purple-500 to-pink-500 text-white px-3 py-1 rounded-full text-xs font-medium">
                      Most Popular
                    </span>
                  </div>
                )}
                
                <CardHeader className="text-center pb-8">
                  <div className={`w-16 h-16 mx-auto rounded-full bg-gradient-to-r ${gradientColor} flex items-center justify-center mb-4`}>
                    <IconComponent className="w-8 h-8 text-white" />
                  </div>
                  
                  <CardTitle className="text-2xl font-bold text-white mb-2">
                    {plan.name}
                  </CardTitle>
                  
                  <CardDescription className="text-gray-400 text-base mb-4">
                    {plan.description ? plan.description.split('\n')[0].replace('• ', '') : ''}
                  </CardDescription>
                  
                  <div className="text-center">
                    <div className="text-4xl font-bold text-white mb-2">
                      {formatPrice(getPlanPrice(plan))}
                      {plan.name !== 'Free' && (
                        <span className="text-lg text-gray-400 font-normal">/{getBillingPeriod()}</span>
                      )}
                    </div>
                    {plan.name !== 'Free' && getSavingsPercentage(plan) > 0 && (
                      <div className="text-sm text-green-400 font-medium">
                        {billingCycle === 'yearly' && 'Save ' + getSavingsPercentage(plan) + '% vs monthly'}
                        {billingCycle === 'monthly' && 'Save ' + getSavingsPercentage(plan) + '% vs weekly'}
                      </div>
                    )}
                  </div>
                </CardHeader>
                
                <CardContent className="overflow-y-auto">
                  <ul className="space-y-3">
                    {features.map((feature, index) => (
                      <li key={index} className="flex items-start">
                        <Check className="w-5 h-5 text-green-400 mt-0.5 mr-3 flex-shrink-0" />
                        <span className="text-gray-300">{feature}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
                
                {/* Button Footer - Grid Row */}
                <div className="p-6 bg-gray-800/30 border-t border-gray-700">
                  {plan.name === 'Free' ? (
                    <Button 
                      className={`w-full bg-gradient-to-r ${gradientColor} hover:opacity-90 text-white font-medium py-3`}
                      data-testid={`button-select-${plan.name.toLowerCase()}`}
                      onClick={() => !user ? setLocation("/auth") : setLocation("/")}
                    >
                      Get Started Free
                    </Button>
                  ) : (
                    <Button 
                      className={`w-full bg-gradient-to-r ${gradientColor} hover:opacity-90 text-white font-medium py-3 flex items-center justify-center`}
                      data-testid={`button-select-${plan.name.toLowerCase()}`}
                      onClick={() => handleSubscribe(plan.id, billingCycle)}
                      disabled={checkoutMutation.isPending}
                    >
                      {checkoutMutation.isPending ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                          Processing...
                        </>
                      ) : (
                        <>
                          <CreditCard className="w-4 h-4 mr-2" />
                          Subscribe with Stripe
                        </>
                      )}
                    </Button>
                  )}
                  
                  <div className="h-8 flex items-center justify-center mt-3">
                    {plan.name !== 'Free' && (
                      <p className="text-xs text-gray-500 text-center">
                        Cancel anytime. No hidden fees.
                      </p>
                    )}
                  </div>
                </div>
              </Card>
            );
          })}
        </div>

        {/* FAQ or Additional Info */}
        <div className="mt-16 text-center">
          <h3 className="text-2xl font-bold text-white mb-4">Need Help Choosing?</h3>
          <p className="text-gray-300 mb-6">
            All plans include access to our AI music generation technology. 
            Upgrade or downgrade anytime as your needs change.
          </p>
          <div className="flex justify-center space-x-4">
            <Button 
              variant="outline" 
              className="border-gray-600 text-gray-300 hover:bg-gray-800 hover:text-white bg-transparent"
              data-testid="button-contact-support"
            >
              Contact Support
            </Button>
            <Link href="/">
              <Button 
                variant="outline" 
                className="border-gray-600 text-gray-300 hover:bg-gray-800 hover:text-white bg-transparent"
                data-testid="button-try-demo"
              >
                Try Demo
              </Button>
            </Link>
          </div>
        </div>
      </div>
      </div>
    </div>
  );
}