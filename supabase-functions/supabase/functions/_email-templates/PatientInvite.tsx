// @deno-types="npm:@types/react@18.3.1"
import React from "npm:react@18.3.1";
import {
  Text,
  Link,
} from "npm:@react-email/components@0.0.25";
import {
  EmailBaseTemplate,
  headerTextStyle,
  baseTextStyle,
  buttonStyle,
  buttonContainerStyle,
} from "./emailBase.tsx";

interface PatientInviteEmailProps {
  patientName: string;
  hospitalName?: string;
  dischargeDate: string;
  condition: string;
  inviteLink: string;
}

export const PatientInviteEmail = ({
  patientName,
  hospitalName = "your hospital",
  dischargeDate,
  condition,
  inviteLink,
}: PatientInviteEmailProps) => {
  const conditionNames: Record<string, string> = {
    'HF': 'Heart Failure',
    'COPD': 'COPD',
    'AMI': 'Heart Attack',
    'PNA': 'Pneumonia',
    'OTHER': 'your condition'
  };

  const conditionName = conditionNames[condition] || condition;

  return (
    <EmailBaseTemplate previewText={`Welcome to your post-discharge care program`}>
      <Text style={headerTextStyle}>
        Welcome to Your Care Journey, {patientName}!
      </Text>

      <Text style={baseTextStyle}>
        You were recently discharged from {hospitalName} for {conditionName}. 
        We're here to support your recovery every step of the way.
      </Text>

      <Text style={baseTextStyle}>
        <strong>What is Sequora?</strong>
        <br />
        Sequora is your personal post-discharge care coordinator. We'll:
      </Text>

      <ul style={{ ...baseTextStyle, marginTop: '8px', paddingLeft: '20px' }}>
        <li>Check in with you regularly about how you're feeling</li>
        <li>Help you track your medications and symptoms</li>
        <li>Connect you with your care team if needed</li>
        <li>Answer questions about your recovery</li>
      </ul>

      <Text style={baseTextStyle}>
        <strong>Get Started Today</strong>
        <br />
        Create your account to access your personalized dashboard, view your care plan, 
        and communicate with your care team.
      </Text>

      <div style={buttonContainerStyle}>
        <Link href={inviteLink} style={buttonStyle}>
          Create My Account
        </Link>
      </div>

      <Text
        style={{
          ...baseTextStyle,
          fontSize: "14px",
          color: "#666666",
          marginTop: "32px",
        }}
      >
        This invitation link will expire in 7 days. If you need a new link, 
        please contact your care coordinator.
      </Text>

      <Text
        style={{
          ...baseTextStyle,
          fontSize: "14px",
          color: "#666666",
          marginTop: "16px",
        }}
      >
        <strong>Need Help?</strong>
        <br />
        If you have questions or need assistance, reply to this email or 
        call your care team at the number provided during discharge.
      </Text>
    </EmailBaseTemplate>
  );
};

export default PatientInviteEmail;

