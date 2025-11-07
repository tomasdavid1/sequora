'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Phone, ChevronLeft, Shield } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import Link from 'next/link';

interface PhoneConsentStepProps {
  email: string;
  patientData: any;
  onVerified: () => void;
  onBack: () => void;
}

export function PhoneConsentStep({ 
  email, 
  patientData, 
  onVerified, 
  onBack 
}: PhoneConsentStepProps) {
  const [smsConsent, setSmsConsent] = useState(false);
  const [termsConsent, setTermsConsent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Format phone number for display (e.g., +1234567890 -> (123) 456-7890)
  const formatPhoneNumber = (phone: string) => {
    if (!phone) return 'No phone number on file';
    
    // Remove all non-numeric characters
    const cleaned = phone.replace(/\D/g, '');
    
    // Handle US phone numbers
    if (cleaned.length === 10) {
      return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6)}`;
    } else if (cleaned.length === 11 && cleaned[0] === '1') {
      return `+1 (${cleaned.slice(1, 4)}) ${cleaned.slice(4, 7)}-${cleaned.slice(7)}`;
    }
    
    // Return as-is for other formats
    return phone;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!termsConsent) {
      setError('Please accept the Terms & Conditions to proceed.');
      return;
    }

    if (!smsConsent) {
      setError('SMS consent is required for care coordination. Please check the box to proceed.');
      return;
    }

    setLoading(true);

    try {
      // Record SMS consent
      const response = await fetch('/api/sms-consent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone: patientData?.primary_phone,
          firstName: patientData?.first_name,
          lastName: patientData?.last_name,
          consentGiven: true
        })
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to record consent');
      }

      console.log('✅ SMS consent recorded during signup');
      onVerified();
      
    } catch (err) {
      console.error('❌ Error recording SMS consent:', err);
      setError(err instanceof Error ? err.message : 'Failed to process consent. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const phoneNumber = patientData?.primary_phone;

  return (
    <div className="space-y-8">
      <Button
        variant="ghost"
        size="sm"
        onClick={onBack}
        className="-ml-2"
      >
        <ChevronLeft className="w-4 h-4 mr-1" />
        Back
      </Button>

      <div className="text-center space-y-3">
        <div className="mx-auto w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
          <Phone className="w-6 h-6 text-blue-600" />
        </div>
        <div>
          <h2 className="text-xl font-semibold mb-1">Confirm Your Phone Number</h2>
          <p className="text-sm text-gray-600">
            Verify your contact information
          </p>
        </div>
      </div>

      <div className="bg-gray-50 rounded-lg p-3 text-center">
        <p className="text-xs text-gray-500 mb-0.5">Setting up account for</p>
        <p className="font-medium">{email}</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="space-y-4">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-center">
            <p className="text-sm text-gray-600 mb-2">We have this number on file:</p>
            <p className="text-2xl font-semibold text-gray-900 tracking-wide">
              {formatPhoneNumber(phoneNumber)}
            </p>
          </div>

          <Alert>
            <AlertDescription className="text-sm">
              <strong>Is this number correct?</strong>
              <br />
              If not, please contact your care coordinator to update it before proceeding.
            </AlertDescription>
          </Alert>

          {/* Terms & Conditions Consent */}
          <div className="border rounded-lg p-4 space-y-3">
            <div className="flex items-start space-x-3">
              <Checkbox
                id="terms-consent"
                checked={termsConsent}
                onCheckedChange={(checked) => setTermsConsent(checked as boolean)}
                className="mt-1"
              />
              <Label 
                htmlFor="terms-consent" 
                className="text-sm leading-relaxed cursor-pointer flex-1"
              >
                I agree to the{' '}
                <Link href="/terms" target="_blank" className="text-blue-600 hover:underline">
                  Terms of Service
                </Link>
                {' '}and{' '}
                <Link href="/privacy" target="_blank" className="text-blue-600 hover:underline">
                  Privacy Policy
                </Link>
              </Label>
            </div>
          </div>

          {/* SMS Consent - TCPA Compliant */}
          <div className="border-2 border-blue-200 bg-blue-50 rounded-lg p-4 space-y-3">
            <div className="flex items-start gap-2 mb-2">
              <Shield className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="font-semibold text-gray-900 text-sm">SMS Care Coordination (Required)</h3>
                <p className="text-xs text-gray-600 mt-1">
                  This is our primary way to check on your recovery and ensure your safety
                </p>
              </div>
            </div>
            
            <div className="flex items-start space-x-3">
              <Checkbox
                id="sms-consent"
                checked={smsConsent}
                onCheckedChange={(checked) => setSmsConsent(checked as boolean)}
                className="mt-1"
              />
              <Label 
                htmlFor="sms-consent" 
                className="text-sm leading-relaxed cursor-pointer flex-1"
              >
                <strong>I agree to receive automated SMS text messages</strong> from Sequora Health at the phone number above for post-discharge care coordination, including:
                <ul className="list-disc list-inside mt-2 space-y-1 text-gray-700">
                  <li>Daily health check-ins</li>
                  <li>Medication reminders</li>
                  <li>Appointment notifications</li>
                  <li>Care team communications</li>
                </ul>
                <div className="mt-3 text-xs text-gray-600 space-y-1">
                  <p><strong>Message Frequency:</strong> Varies by care plan (1-5 messages/day during recovery, typically 30-90 days)</p>
                  <p><strong>Opt-Out:</strong> Reply STOP to any message to unsubscribe</p>
                  <p><strong>Rates:</strong> Message & data rates may apply</p>
                  <p className="text-gray-500 italic">Consent not required as condition of care, but is our primary communication method for your safety.</p>
                </div>
              </Label>
            </div>
          </div>
        </div>

        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <Button 
          type="submit" 
          className="w-full h-11" 
          disabled={!smsConsent || !termsConsent || loading}
        >
          {loading ? 'Processing...' : 'Accept & Continue'}
        </Button>

        <p className="text-xs text-center text-gray-500">
          By continuing, you confirm this phone number is correct and you consent to receive SMS messages as described above.
        </p>
      </form>
    </div>
  );
}

