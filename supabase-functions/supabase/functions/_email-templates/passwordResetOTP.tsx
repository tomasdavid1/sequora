import * as React from "https://esm.sh/react@18.3.1";
import {
  EmailBaseTemplate,
  headerTextStyle,
  baseTextStyle,
  buttonStyle,
  buttonContainerStyle,
} from "./emailBase.jsx";

interface PasswordResetOTPEmailProps {
  otpCode: string;
  recipientName?: string;
}

export const PasswordResetOTPEmail: React.FC<PasswordResetOTPEmailProps> = ({
  otpCode,
  recipientName,
}) => {
  return (
    <EmailBaseTemplate previewText="Your HealthX password reset code">
      <h1 style={headerTextStyle}>Reset Your Password</h1>
      <p style={baseTextStyle}>
        Hello{recipientName ? `, ${recipientName}` : ""},
      </p>
      <p style={baseTextStyle}>
        We received a request to reset your password for your HealthX Transition of Care account.
        Use the verification code below to proceed:
      </p>
      <div style={buttonContainerStyle}>
        <div
          style={{
            ...buttonStyle,
            fontSize: "32px",
            fontWeight: "bold",
            fontFamily: "Monaco, Courier, monospace",
            letterSpacing: "8px",
            cursor: "default",
            padding: "20px 24px",
          }}
        >
          {otpCode}
        </div>
      </div>
      <p
        style={{
          fontSize: "14px",
          lineHeight: "24px",
          color: "#6B7280",
          margin: "12px 0 32px 0",
          fontFamily: "Helvetica, Arial, sans-serif",
        }}
      >
        This code will expire in 10 minutes. If you didn't request this password
        reset, you can safely ignore this email.
      </p>
      <p style={baseTextStyle}>- The HealthX Care Team</p>
    </EmailBaseTemplate>
  );
};

export default PasswordResetOTPEmail;
