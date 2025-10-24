import React from "npm:react@18.3.1";
import { Text, Section, Link } from "npm:@react-email/components@0.0.22";
import {
  EmailBaseTemplate,
  baseTextStyle,
  buttonStyle,
  headerTextStyle,
  buttonContainerStyle,
} from "./emailBase.jsx";

export interface CoachInviteEmailProps {
  inviteLink: string;
  orgName: string;
  senderName: string;
  collegeName?: string;
}

export const CoachInviteEmail = ({
  inviteLink,
  orgName,
  senderName,
  collegeName,
}: CoachInviteEmailProps) => {
  const previewText = `You've been invited to join ${
    collegeName || orgName
  } on UpNext`;
  const displayName = collegeName || orgName;

  return (
    <EmailBaseTemplate previewText={previewText}>
      <Section>
        <Section style={{ marginBottom: "48px" }}>
          <Text style={{ ...headerTextStyle, marginBottom: "24px" }}>
            You've been invited to join UpNext
          </Text>

          <Text style={baseTextStyle}>Hello,</Text>

          <Text style={baseTextStyle}>
            {senderName} has invited you to join {displayName} on UpNext,
            Collaborate with your staff to identify talent
          </Text>

          <Text style={baseTextStyle}>
            Access to the UpNext platform will allow you to:
          </Text>

          <ul
            style={{
              color: "#4A5568",
              fontSize: "16px",
              lineHeight: "26px",
              paddingLeft: "20px",
            }}
          >
            <li style={{ marginBottom: "8px" }}>
              Find transfer athletes in the portal who fit your team's needs
            </li>
            <li style={{ marginBottom: "8px" }}>
              Set up smart lists to receive notifications when eligible athletes
              enter the portal
            </li>
            <li style={{ marginBottom: "8px" }}>
              Collaborate with your coaching staff to identify talent
            </li>
          </ul>
        </Section>

        <Section style={{ marginTop: "20px" }}>
          <div style={buttonContainerStyle}>
            <Link href={inviteLink} style={buttonStyle}>
              Accept Invitation
            </Link>
          </div>
        </Section>

        <Section style={{ marginTop: "12px", marginBottom: "32px" }}>
          <Text
            style={{ ...baseTextStyle, fontSize: "14px", color: "#6B7280" }}
          >
            This invitation will expire in 7 days. If you have any questions,
            please reach out to {senderName}.
          </Text>

          <Text style={{ ...baseTextStyle, marginTop: "12px" }}>
            Welcome to the team!
          </Text>

          <Text style={{ ...baseTextStyle, marginTop: "24px" }}>
            - The UpNext Team
          </Text>
        </Section>
      </Section>
    </EmailBaseTemplate>
  );
};

export default CoachInviteEmail;
