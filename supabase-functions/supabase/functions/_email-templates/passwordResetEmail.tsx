import * as React from "https://esm.sh/react@18.3.1";
import {
  EmailBaseTemplate,
  headerTextStyle,
  baseTextStyle,
  buttonStyle,
  buttonContainerStyle,
} from "./emailBase.jsx";

interface PasswordResetEmailProps {
  resetLink: string;
  recipientName?: string;
}

export const PasswordResetEmail: React.FC<PasswordResetEmailProps> = ({
  resetLink,
  recipientName,
}) => {
  return (
    <EmailBaseTemplate previewText="Reset your UpNext password">
      <h1 style={headerTextStyle}>Reset Your Password</h1>
      <p style={baseTextStyle}>
        Hello{recipientName ? `, ${recipientName}` : ","}
      </p>
      <p style={baseTextStyle}>
        We received a request to reset your password for your UpNext account.
        Click the button below to create a new password:
      </p>
      <div style={buttonContainerStyle}>
        <a href={resetLink} style={buttonStyle}>
          Reset Password
        </a>
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
        This link will expire in 24 hours. If you didn't request this password
        reset, you can safely ignore this email.
      </p>
      <p style={baseTextStyle}>- The UpNext Team</p>
    </EmailBaseTemplate>
  );
};

export default PasswordResetEmail;
