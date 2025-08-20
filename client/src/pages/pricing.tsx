import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Check, Music, Zap, Crown } from "lucide-react";
import { Link } from "wouter";
import type { SubscriptionPlan } from "@shared/schema";

export default function Pricing() {
  const { data: plans = [], isLoading } = useQuery<SubscriptionPlan[]>({
    queryKey: ["/api/plans"],
  });

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
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-indigo-900">
      {/* Navigation */}
      <nav className="border-b border-gray-800 bg-black/50 backdrop-blur-sm">
        <div className="container mx-auto px-4">
          <div className="flex h-16 items-center justify-between">
            <Link href="/" className="flex items-center space-x-2">
              <Music className="w-8 h-8 text-purple-400" />
              <span className="text-xl font-bold text-white">AI Music Studio</span>
            </Link>
            <div className="flex items-center space-x-6">
              <Link href="/" className="text-gray-300 hover:text-white transition-colors">
                Home
              </Link>
              <Link href="/pricing" className="text-purple-400 font-medium">
                Pricing
              </Link>
            </div>
          </div>
        </div>
      </nav>

      <div className="container mx-auto px-4 py-16">
        {/* Header */}
        <div className="text-center mb-16">
          <h1 className="text-4xl md:text-6xl font-bold text-white mb-6">
            Choose Your <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-400">Creative Plan</span>
          </h1>
          <p className="text-xl text-gray-300 max-w-2xl mx-auto">
            Unlock the power of AI music generation with our flexible subscription plans. 
            Create amazing music that fits your needs and budget.
          </p>
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
                className={`bg-gray-800/50 border-gray-700 backdrop-blur-sm relative ${
                  isPopular ? 'ring-2 ring-purple-500 scale-105' : ''
                }`}
                data-testid={`card-plan-${plan.name.toLowerCase()}`}
              >
                {isPopular && (
                  <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                    <span className="bg-gradient-to-r from-purple-500 to-pink-500 text-white px-4 py-1 rounded-full text-sm font-medium">
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
                      {formatPrice(plan.monthlyPrice || '0')}
                      {parseFloat(plan.monthlyPrice || '0') > 0 && (
                        <span className="text-lg text-gray-400 font-normal">/month</span>
                      )}
                    </div>
                    {parseFloat(plan.yearlyPrice || '0') > 0 && (
                      <div className="text-sm text-gray-400">
                        or {formatPrice(plan.yearlyPrice || '0')} yearly
                        <span className="text-green-400 ml-1">
                          (Save {Math.round((1 - (parseFloat(plan.yearlyPrice || '0') / (parseFloat(plan.monthlyPrice || '0') * 12))) * 100)}%)
                        </span>
                      </div>
                    )}
                  </div>
                </CardHeader>
                
                <CardContent>
                  <ul className="space-y-3 mb-8">
                    {features.map((feature, index) => (
                      <li key={index} className="flex items-start">
                        <Check className="w-5 h-5 text-green-400 mt-0.5 mr-3 flex-shrink-0" />
                        <span className="text-gray-300">{feature}</span>
                      </li>
                    ))}
                  </ul>
                  
                  <Button 
                    className={`w-full bg-gradient-to-r ${gradientColor} hover:opacity-90 text-white font-medium py-3`}
                    data-testid={`button-select-${plan.name.toLowerCase()}`}
                  >
                    {plan.name === 'Free' ? 'Get Started Free' : `Choose ${plan.name}`}
                  </Button>
                  
                  {plan.name !== 'Free' && (
                    <p className="text-xs text-gray-500 text-center mt-3">
                      Cancel anytime. No hidden fees.
                    </p>
                  )}
                </CardContent>
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
            <Button variant="outline" className="border-gray-600 text-white hover:bg-gray-800">
              Contact Support
            </Button>
            <Link href="/">
              <Button variant="outline" className="border-gray-600 text-white hover:bg-gray-800">
                Try Demo
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}