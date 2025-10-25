// @deno-types="npm:@types/react@18.3.1"
// Updated: 2025-10-24 - Sequora rebrand
import React from "npm:react@18.3.1";
import {
  EmailBaseTemplate,
  headerTextStyle,
  baseTextStyle,
} from "./emailBase.tsx";

interface PasswordResetOTPEmailProps {
  otpCode: string;
  recipientName?: string;
}

export const PasswordResetOTPEmail: React.FC<PasswordResetOTPEmailProps> = ({
  otpCode,
  recipientName,
}) => {
  return (
    <EmailBaseTemplate previewText="Your Sequora password reset code">
      <h1 style={headerTextStyle}>Reset Your Password</h1>
      <p style={baseTextStyle}>
        Hello{recipientName ? `, ${recipientName}` : ""},
      </p>
      <p style={baseTextStyle}>
        We received a request to reset your password for your Sequora account.
        Use the verification code below to proceed:
      </p>
      <div
        style={{
          margin: "24px 0",
          textAlign: "center",
          width: "100%",
        }}
      >
        <div
          style={{
            backgroundColor: "#059669",
            color: "#FFFFFF",
            fontSize: "32px",
            fontWeight: "bold",
            fontFamily: "Monaco, Courier, monospace",
            letterSpacing: "8px",
            cursor: "default",
            padding: "20px 24px",
            borderRadius: "10px",
            display: "inline-block",
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
      <p style={baseTextStyle}>- The Sequora Team</p>
    </EmailBaseTemplate>
  );
};

export default PasswordResetOTPEmail;
