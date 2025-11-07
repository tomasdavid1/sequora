import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import Link from 'next/link';

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-4xl mx-auto">
        <Card>
          <CardHeader>
            <CardTitle className="text-3xl">Privacy Policy</CardTitle>
            <p className="text-gray-600">Last Updated: {new Date().toLocaleDateString()}</p>
          </CardHeader>
          <CardContent className="prose prose-gray max-w-none">
            <h2>1. Information We Collect</h2>
            <p>
              When you opt into our SMS program, we collect:
            </p>
            <ul>
              <li>Your name</li>
              <li>Mobile phone number</li>
              <li>Consent timestamp</li>
              <li>IP address (for security)</li>
              <li>Device information (user agent)</li>
            </ul>

            <h2>2. How We Use Your Information</h2>
            <p>
              We use your information to:
            </p>
            <ul>
              <li>Send care coordination messages</li>
              <li>Provide medication reminders</li>
              <li>Schedule appointment notifications</li>
              <li>Coordinate your post-discharge care</li>
              <li>Comply with legal and regulatory requirements</li>
            </ul>

            <h2>3. HIPAA Compliance</h2>
            <p>
              Sequora Health is HIPAA compliant. All protected health information (PHI) is:
            </p>
            <ul>
              <li>Encrypted in transit and at rest</li>
              <li>Accessible only to authorized care team members</li>
              <li>Never sold or shared with third parties for marketing</li>
              <li>Retained according to healthcare regulations</li>
            </ul>

            <h2>4. SMS Message Security</h2>
            <p>
              While we take precautions to protect your information:
            </p>
            <ul>
              <li>SMS messages are not end-to-end encrypted</li>
              <li>Avoid sharing sensitive medical details via SMS</li>
              <li>Contact your care team directly for urgent medical matters</li>
              <li>Keep your phone secure and password-protected</li>
            </ul>

            <h2>5. Data Sharing</h2>
            <p>
              We may share your information with:
            </p>
            <ul>
              <li><strong>Your care team:</strong> Physicians, nurses, care coordinators involved in your care</li>
              <li><strong>Service providers:</strong> SMS delivery services (Twilio), secure hosting providers</li>
              <li><strong>Legal requirements:</strong> When required by law or to protect rights and safety</li>
            </ul>
            <p>
              We will NEVER sell your information to third parties.
            </p>

            <h2>6. Your Rights</h2>
            <p>
              You have the right to:
            </p>
            <ul>
              <li>Opt out of SMS messages at any time (reply STOP)</li>
              <li>Request a copy of your data</li>
              <li>Request correction of inaccurate data</li>
              <li>Request deletion of your data (subject to legal requirements)</li>
              <li>File a complaint with the Office for Civil Rights (OCR)</li>
            </ul>

            <h2>7. Data Retention</h2>
            <p>
              We retain your SMS consent data for:
            </p>
            <ul>
              <li>Consent records: 7 years (regulatory requirement)</li>
              <li>Message logs: 7 years (HIPAA requirement)</li>
              <li>After opt-out: Records marked inactive but retained for compliance</li>
            </ul>

            <h2>8. Children's Privacy</h2>
            <p>
              Our SMS program is not intended for individuals under 18 years of age. If you are under 18,
              please have a parent or guardian provide consent on your behalf.
            </p>

            <h2>9. Changes to Privacy Policy</h2>
            <p>
              We may update this privacy policy periodically. We will notify you of material changes by
              posting the updated policy on our website and updating the "Last Updated" date.
            </p>

            <h2>10. Contact Us</h2>
            <p>
              For privacy questions or to exercise your rights, contact:
            </p>
            <p>
              <strong>Sequora Health Privacy Officer</strong><br />
              Email: privacy@sequorahealth.com<br />
              Phone: (555) 123-4567<br />
            </p>
            <p>
              To file a HIPAA complaint:
            </p>
            <p>
              <strong>Office for Civil Rights (OCR)</strong><br />
              U.S. Department of Health and Human Services<br />
              Website: <a href="https://www.hhs.gov/hipaa/filing-a-complaint" target="_blank" rel="noopener" className="text-blue-600 hover:underline">www.hhs.gov/hipaa/filing-a-complaint</a><br />
              Phone: 1-877-696-6775
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

