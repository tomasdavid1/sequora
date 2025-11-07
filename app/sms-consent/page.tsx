'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { CheckCircle2, Phone, Shield, MessageSquare } from 'lucide-react';
import Link from 'next/link';

/**
 * SMS Consent & Opt-In Page
 * 
 * ⚠️ REQUIRED FOR TWILIO COMPLIANCE (Error 30509)
 * This page provides:
 * - Clear call-to-action
 * - Explicit consent mechanism
 * - Required disclosures (frequency, STOP/HELP, rates, T&C links)
 * - Public accessibility (no login required)
 */
export default function SMSConsentPage() {
  const [phone, setPhone] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [consent, setConsent] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!consent) {
      setError('You must agree to receive SMS messages');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await fetch('/api/sms-consent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone,
          firstName,
          lastName,
          consentGiven: true
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to process consent');
      }

      setSubmitted(true);
      console.log('✅ SMS consent recorded:', data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to process consent. Please try again.');
      console.error('❌ SMS consent error:', err);
    } finally {
      setLoading(false);
    }
  };

  if (submitted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center p-4">
        <Card className="max-w-md w-full shadow-xl">
          <CardHeader className="text-center space-y-2">
            <div className="flex justify-center">
              <CheckCircle2 className="w-16 h-16 text-green-500" />
            </div>
            <CardTitle className="text-2xl">Consent Confirmed!</CardTitle>
            <CardDescription>
              You're all set to receive care coordination messages from Sequora Health
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 space-y-2">
              <p className="text-sm text-blue-900 font-medium">
                What happens next:
              </p>
              <ul className="text-sm text-blue-800 space-y-1 list-disc list-inside">
                <li>You'll receive a confirmation text shortly</li>
                <li>Your care team will send check-in messages based on your recovery plan</li>
                <li>Reply STOP anytime to unsubscribe</li>
                <li>Reply HELP for assistance</li>
              </ul>
            </div>

            <div className="text-center text-sm text-gray-600">
              <p>Thank you for trusting Sequora Health with your care.</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 py-12 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            Sequora Health SMS Program
          </h1>
          <p className="text-xl text-gray-600">
            Stay connected with your care team through text messages
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-6 mb-8">
          {/* Benefits */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageSquare className="w-5 h-5 text-blue-600" />
                Why Join Our SMS Program?
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="font-medium text-gray-900">Daily Check-Ins</p>
                  <p className="text-sm text-gray-600">Receive personalized health check-ins during your recovery</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="font-medium text-gray-900">Medication Reminders</p>
                  <p className="text-sm text-gray-600">Get timely reminders about your medications</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="font-medium text-gray-900">24/7 Care Support</p>
                  <p className="text-sm text-gray-600">Quick access to your care coordination team</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="font-medium text-gray-900">Appointment Alerts</p>
                  <p className="text-sm text-gray-600">Never miss important follow-up appointments</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Privacy & Security */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="w-5 h-5 text-green-600" />
                Your Privacy Matters
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm text-gray-700">
                <strong>HIPAA Compliant:</strong> All communications are secure and comply with healthcare privacy regulations.
              </p>
              <p className="text-sm text-gray-700">
                <strong>Opt Out Anytime:</strong> Reply STOP to any message to immediately unsubscribe.
              </p>
              <p className="text-sm text-gray-700">
                <strong>No Spam:</strong> We only send messages related to your care coordination.
              </p>
              <p className="text-sm text-gray-700">
                <strong>Your Control:</strong> You decide what information to share via SMS.
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Consent Form */}
        <Card className="shadow-xl">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Phone className="w-5 h-5 text-blue-600" />
              Sign Up for SMS Messages
            </CardTitle>
            <CardDescription>
              Complete the form below to start receiving care coordination messages
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Contact Info */}
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="firstName">First Name *</Label>
                  <Input
                    id="firstName"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    required
                    placeholder="John"
                  />
                </div>
                <div>
                  <Label htmlFor="lastName">Last Name *</Label>
                  <Input
                    id="lastName"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    required
                    placeholder="Smith"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="phone">Mobile Phone Number *</Label>
                <Input
                  id="phone"
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  required
                  placeholder="(555) 123-4567"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Message and data rates may apply
                </p>
              </div>

              {/* Required Disclosures */}
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-6 space-y-4">
                <h3 className="font-semibold text-gray-900">Program Details & Disclosures</h3>
                
                <div className="space-y-2 text-sm text-gray-700">
                  <p>
                    <strong>Program Name:</strong> Sequora Health Care Coordination
                  </p>
                  <p>
                    <strong>Message Frequency:</strong> Message frequency varies by care plan. You may receive 1-5 messages per day during your recovery period (typically 30-90 days post-discharge).
                  </p>
                  <p>
                    <strong>How to Opt Out:</strong> Reply <strong>STOP</strong> to any message to unsubscribe at any time. You'll receive a confirmation message.
                  </p>
                  <p>
                    <strong>Need Help?:</strong> Reply <strong>HELP</strong> to any message or call us at (555) 123-4567.
                  </p>
                  <p>
                    <strong>Carrier Charges:</strong> Message and data rates may apply based on your mobile plan.
                  </p>
                  <p className="pt-2">
                    <strong>Supported Carriers:</strong> This service is available on AT&T, Verizon, T-Mobile, Sprint, and most major US carriers.
                  </p>
                </div>
              </div>

              {/* Consent Checkbox */}
              <div className="space-y-4">
                <div className="flex items-start gap-3 p-4 border-2 border-blue-200 bg-blue-50 rounded-lg">
                  <Checkbox
                    id="consent"
                    checked={consent}
                    onCheckedChange={(checked) => setConsent(checked as boolean)}
                    className="mt-1"
                  />
                  <div className="flex-1">
                    <Label
                      htmlFor="consent"
                      className="text-sm font-medium leading-relaxed cursor-pointer"
                    >
                      I agree to receive automated SMS text messages from Sequora Health at the phone number provided above. I understand that:
                      <ul className="list-disc list-inside mt-2 space-y-1 text-gray-700">
                        <li>These messages are for care coordination purposes only</li>
                        <li>Message frequency varies by my care plan</li>
                        <li>I can opt out anytime by replying STOP</li>
                        <li>Message and data rates may apply</li>
                        <li>Consent is not a condition of receiving care</li>
                      </ul>
                    </Label>
                  </div>
                </div>

                {error && (
                  <Alert variant="destructive">
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}
              </div>

              {/* Submit Button */}
              <Button
                type="submit"
                className="w-full text-lg py-6"
                disabled={!consent || loading}
              >
                {loading ? 'Processing...' : 'Agree & Subscribe to SMS'}
              </Button>

              {/* Legal Links */}
              <div className="text-center space-y-2 text-sm text-gray-600">
                <p>
                  By subscribing, you agree to our{' '}
                  <Link href="/terms" className="text-blue-600 hover:underline">
                    Terms of Service
                  </Link>
                  {' '}and{' '}
                  <Link href="/privacy" className="text-blue-600 hover:underline">
                    Privacy Policy
                  </Link>
                </p>
                <p className="text-xs">
                  Sequora Health · Care Coordination Platform · HIPAA Compliant
                </p>
              </div>
            </form>
          </CardContent>
        </Card>

        {/* Footer Info */}
        <div className="mt-8 text-center text-sm text-gray-600">
          <p className="mb-2">
            Questions? Contact us at <a href="mailto:support@sequorahealth.com" className="text-blue-600 hover:underline">support@sequorahealth.com</a> or call (555) 123-4567
          </p>
          <p className="text-xs text-gray-500">
            © {new Date().getFullYear()} Sequora Health. All rights reserved.
          </p>
        </div>
      </div>
    </div>
  );
}

