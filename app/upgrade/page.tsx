'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { HoverCard, HoverCardContent, HoverCardTrigger } from '@/components/ui/hover-card';
import { useToast } from '@/hooks/use-toast';
import { CheckCircle, Info, CreditCard, Shield, Clock, ArrowLeft, Star } from 'lucide-react';

export default function UpgradePage() {
  const [isLoading, setIsLoading] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState('premium');
  const { toast } = useToast();

  const plans = {
    premium: {
      name: 'Premium',
      price: 29,
      originalPrice: 49,
      period: 'month',
      popular: false,
      description: 'Complete wellness plan with personalized recommendations',
      badge: 'Most Popular',
      features: [
        'Detailed supplement recommendations with specific brands & dosages',
        'Personalized dietary protocols based on your unique health profile',
        'Advanced root cause analysis and targeted treatment plans',
        'Progress tracking with detailed health metrics',
        'Priority doctor review and approval',
        'Access to exclusive wellness content and guides',
        '24/7 customer support',
        'Mobile app access'
      ]
    },
    vip: {
      name: 'VIP',
      price: 97,
      originalPrice: 149,
      period: 'month',
      popular: true,
      description: 'Everything in Premium plus 1-on-1 practitioner support',
      badge: 'Best Value',
      features: [
        'Everything in Premium',
        'Monthly 1-on-1 consultation with certified practitioner',
        'Custom protocol adjustments based on progress',
        'Direct messaging with your wellness team',
        'Advanced lab test interpretations',
        'Concierge health support',
        'Priority scheduling',
        'Quarterly health assessments'
      ]
    }
  };

  const currentPlan = plans[selectedPlan as keyof typeof plans];

  const handleUpgrade = async () => {
    setIsLoading(true);
    
    try {
      // Simulate payment processing
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      toast({
        title: "Payment successful! 🎉",
        description: `Welcome to ${currentPlan.name}! Your free trial has started.`,
        duration: 5000,
      });
      
      // Redirect to dashboard after a short delay
      setTimeout(() => {
        window.location.href = '/dashboard';
      }, 2000);
      
    } catch (error) {
      toast({
        title: "Payment failed",
        description: "There was an issue processing your payment. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20">
      <div className="container mx-auto py-8 px-4 max-w-7xl">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="flex items-center justify-center mb-4">
            <Button 
              variant="ghost" 
              size="sm"
              onClick={() => window.history.back()}
              className="absolute left-4 top-8"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
          </div>
          
          <Badge variant="secondary" className="mb-4">
            7-Day Free Trial
          </Badge>
          
          <h1 className="text-4xl font-bold tracking-tight mb-4">
            Upgrade Your Wellness Journey
          </h1>
          
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Choose the plan that's right for you. Cancel anytime during your trial period.
          </p>
        </div>

        <div className="grid lg:grid-cols-3 gap-8 max-w-6xl mx-auto">
          {/* Plan Selection */}
          <div className="lg:col-span-2">
            <div className="grid md:grid-cols-2 gap-6">
              {Object.entries(plans).map(([key, plan]) => (
                <Card 
                  key={key}
                  className={`cursor-pointer transition-all duration-200 hover:shadow-lg ${
                    selectedPlan === key 
                      ? 'ring-2 ring-primary shadow-lg scale-[1.02]' 
                      : 'hover:shadow-md'
                  } ${plan.popular ? 'border-primary' : ''}`}
                  onClick={() => setSelectedPlan(key)}
                >
                  <CardHeader className="text-center pb-4">
                    <div className="flex items-center justify-center mb-3">
                      <CardTitle className="text-2xl font-bold">{plan.name}</CardTitle>
                      {plan.popular && (
                        <Badge className="ml-2 bg-primary text-primary-foreground">
                          <Star className="w-3 h-3 mr-1" />
                          {plan.badge}
                        </Badge>
                      )}
                    </div>
                    
                    <div className="space-y-2">
                      <div className="flex items-center justify-center gap-3">
                        <span className="text-3xl font-bold text-primary">
                          ${plan.price}
                        </span>
                        <div className="text-right">
                          <div className="text-sm text-muted-foreground line-through">
                            ${plan.originalPrice}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            /{plan.period}
                          </div>
                        </div>
                      </div>
                      
                      <Badge variant="secondary" className="bg-emerald-100 text-emerald-700">
                        Save ${plan.originalPrice - plan.price}/month
                      </Badge>
                    </div>
                    
                    <CardDescription className="text-center mt-3">
                      {plan.description}
                    </CardDescription>
                  </CardHeader>
                  
                  <CardContent>
                    <ul className="space-y-3">
                      {plan.features.map((feature, index) => (
                        <li key={index} className="flex items-start gap-3">
                          <CheckCircle className="w-5 h-5 text-emerald-500 mt-0.5 flex-shrink-0" />
                          <span className="text-sm">{feature}</span>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          {/* Payment Form */}
          <div className="lg:col-span-1">
            <Card className="sticky top-8">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CreditCard className="w-5 h-5" />
                  Complete Your Order
                </CardTitle>
                <CardDescription>
                  Selected: <strong>{currentPlan.name}</strong> Plan
                </CardDescription>
              </CardHeader>
              
              <CardContent className="space-y-6">
                {/* Trial Alert */}
                <Alert className="border-emerald-200 bg-emerald-50">
                  <Clock className="h-4 w-4 text-emerald-600" />
                  <AlertDescription className="text-emerald-800">
                    <strong>7-Day Free Trial</strong> - You won't be charged until 7 days after signup
                  </AlertDescription>
                </Alert>

                {/* Order Summary */}
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="font-medium">{currentPlan.name} Plan</span>
                    <span className="font-medium">${currentPlan.price}/{currentPlan.period}</span>
                  </div>
                  
                  <div className="flex justify-between items-center text-emerald-600">
                    <span>Free Trial (7 days)</span>
                    <span>-${currentPlan.price}</span>
                  </div>
                  
                  <Separator />
                  
                  <div className="flex justify-between items-center text-lg font-bold">
                    <span>Due Today</span>
                    <span className="text-2xl">$0.00</span>
                  </div>
                </div>

                <Separator />

                {/* Payment Form */}
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="email">Email Address</Label>
                    <Input 
                      id="email" 
                      type="email" 
                      placeholder="john@example.com"
                      className="transition-all focus:ring-2 focus:ring-primary/20"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="card" className="flex items-center gap-2">
                      Card Information
                      <HoverCard>
                        <HoverCardTrigger asChild>
                          <Info className="w-4 h-4 text-muted-foreground cursor-help" />
                        </HoverCardTrigger>
                        <HoverCardContent className="w-80">
                          <div className="space-y-2">
                            <h4 className="font-semibold">Secure Payment</h4>
                            <p className="text-sm text-muted-foreground">
                              Your payment information is encrypted and secure. We use industry-standard SSL encryption.
                            </p>
                          </div>
                        </HoverCardContent>
                      </HoverCard>
                    </Label>
                    <Input 
                      id="card" 
                      placeholder="1234 5678 9012 3456"
                      className="font-mono"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="expiry">Expiry</Label>
                      <Input 
                        id="expiry" 
                        placeholder="MM/YY"
                        className="font-mono"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="cvc">CVC</Label>
                      <Input 
                        id="cvc" 
                        placeholder="123"
                        className="font-mono"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="name">Cardholder Name</Label>
                    <Input 
                      id="name" 
                      placeholder="John Doe"
                    />
                  </div>
                </div>

                {/* Action Button */}
                <Button 
                  onClick={handleUpgrade}
                  disabled={isLoading}
                  className="w-full h-12 text-lg font-semibold"
                  size="lg"
                >
                  {isLoading ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Processing...
                    </>
                  ) : (
                    <>
                      <Shield className="w-4 h-4 mr-2" />
                      Start Free Trial
                    </>
                  )}
                </Button>

                {/* Terms */}
                <p className="text-xs text-center text-muted-foreground leading-relaxed">
                  By clicking "Start Free Trial", you agree to our{' '}
                  <a href="#" className="underline hover:text-primary">Terms of Service</a>{' '}
                  and{' '}
                  <a href="#" className="underline hover:text-primary">Privacy Policy</a>.
                  Cancel anytime during your trial period.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Trust Signals */}
        <div className="mt-16 max-w-4xl mx-auto">
          <div className="grid md:grid-cols-3 gap-8 text-center">
            <div className="flex flex-col items-center space-y-3">
              <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center">
                <Shield className="w-6 h-6 text-primary" />
              </div>
              <h3 className="font-semibold">Bank-Level Security</h3>
              <p className="text-sm text-muted-foreground">
                256-bit SSL encryption protects your payment information
              </p>
            </div>
            
            <div className="flex flex-col items-center space-y-3">
              <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center">
                <CheckCircle className="w-6 h-6 text-primary" />
              </div>
              <h3 className="font-semibold">Money-Back Guarantee</h3>
              <p className="text-sm text-muted-foreground">
                Full refund within 30 days if you're not satisfied
              </p>
            </div>
            
            <div className="flex flex-col items-center space-y-3">
              <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center">
                <Clock className="w-6 h-6 text-primary" />
              </div>
              <h3 className="font-semibold">Cancel Anytime</h3>
              <p className="text-sm text-muted-foreground">
                No long-term commitments. Cancel your subscription anytime
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 