import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import Link from 'next/link';

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-4xl mx-auto">
        <Card>
          <CardHeader>
            <CardTitle className="text-3xl">Terms of Service</CardTitle>
            <p className="text-gray-600">Last Updated: {new Date().toLocaleDateString()}</p>
          </CardHeader>
          <CardContent className="prose prose-gray max-w-none">
            <h2>1. SMS Program Terms</h2>
            <p>
              By opting into the Sequora Health SMS program, you agree to receive automated text messages
              from Sequora Health for care coordination purposes. These messages may include:
            </p>
            <ul>
              <li>Health check-in reminders</li>
              <li>Medication reminders</li>
              <li>Appointment notifications</li>
              <li>Care coordination updates</li>
            </ul>

            <h2>2. Message Frequency</h2>
            <p>
              Message frequency varies depending on your care plan and recovery stage. You may receive between
              1-5 messages per day during your recovery period (typically 30-90 days post-discharge).
            </p>

            <h2>3. Opt-Out Instructions</h2>
            <p>
              You may opt out of receiving SMS messages at any time by replying <strong>STOP</strong> to any message.
              You will receive a confirmation message upon opting out. You can also contact us at (555) 123-4567 to opt out.
            </p>

            <h2>4. Help & Support</h2>
            <p>
              For assistance, reply <strong>HELP</strong> to any message or contact us at:
            </p>
            <ul>
              <li>Phone: (555) 123-4567</li>
              <li>Email: support@sequorahealth.com</li>
            </ul>

            <h2>5. Carrier Charges</h2>
            <p>
              Message and data rates may apply based on your mobile carrier's plan. Consult your carrier for details.
            </p>

            <h2>6. Supported Carriers</h2>
            <p>
              This service is available on AT&T, Verizon, T-Mobile, Sprint, and most major US carriers.
            </p>

            <h2>7. Privacy & HIPAA Compliance</h2>
            <p>
              All SMS communications are HIPAA compliant and protected. See our{' '}
              <Link href="/privacy" className="text-blue-600 hover:underline">
                Privacy Policy
              </Link>{' '}
              for details.
            </p>

            <h2>8. Consent Not Required for Care</h2>
            <p>
              Consent to receive SMS messages is not a condition of receiving medical care from Sequora Health
              or any affiliated healthcare providers.
            </p>

            <h2>9. Changes to Terms</h2>
            <p>
              We may update these terms from time to time. Continued participation in the SMS program after
              changes constitutes acceptance of the updated terms.
            </p>

            <h2>Contact Information</h2>
            <p>
              <strong>Sequora Health</strong><br />
              Email: support@sequorahealth.com<br />
              Phone: (555) 123-4567
            </p>

            <div className="mt-8 pt-8 border-t">
              <Link href="/sms-consent" className="text-blue-600 hover:underline">
                ← Back to SMS Consent Form
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

