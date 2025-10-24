import React from "npm:react@18.3.1";
import {
  Text,
  Section,
  Link,
  Img,
  Column,
  Row,
} from "npm:@react-email/components@0.0.22";
import {
  EmailBaseTemplate,
  baseTextStyle,
  buttonStyle,
  headerTextStyle,
  buttonContainerStyle,
} from "./emailBase.jsx";
import { Athlete } from "../_schema.js";

export interface SmartListWithAthletes {
  title: string;
  id: string;
  athletes: ExtendedAthlete[];
}

export interface ExtendedAthlete extends Athlete {
  collegeData?: {
    name?: string;
  };
}

export const SmartListNotificationEmail = ({
  smartLists,
  coachName,
}: {
  smartLists: SmartListWithAthletes[];
  coachName: string;
}) => {
  const previewText = `Your daily digest of new additions to your UpNext smart lists.`;

  return (
    <EmailBaseTemplate previewText={previewText}>
      <Section>
        <Section style={{ marginBottom: "48px" }}>
          <Text style={baseTextStyle}>Hi {coachName || "Coach"},</Text>
          <Text style={baseTextStyle}>
            The following athletes who fit your smart list criteria have entered
            the portal in the last 24 hours:
          </Text>
        </Section>

        {smartLists.map((list) => (
          <React.Fragment key={list.id}>
            <Row
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "flex-start",
                alignContent: "center",
                marginBottom: "24px",
              }}
            >
              <Text
                style={{
                  ...headerTextStyle,
                  fontWeight: "bold",
                  fontSize: "18px",
                  marginLeft: "12px",
                  alignItems: "center",
                  alignContent: "center",
                }}
              >
                {list.title}
              </Text>
            </Row>

            {list.athletes.slice(0, 5).map((athlete, idx) => (
              <Row
                key={athlete.id}
                style={{
                  marginBottom: "16px",
                  borderBottom: idx < 4 ? "1px solid #e5e7eb" : "none",
                  paddingBottom: "16px",
                }}
              >
                <Column style={{ width: "120px", textAlign: "center" }}>
                  <Img
                    src={
                      athlete.photo_url ||
                      "https://lacunrquufokfuhhfzaa.supabase.co/storage/v1/object/public/assets/assets/avatar.png"
                    }
                    width="60"
                    height="60"
                    alt={`${athlete.first_name} ${athlete.last_name}`}
                    style={{
                      borderRadius: "50%",
                      margin: "0 auto",
                      objectPosition: "top",
                      objectFit: "cover",
                    }}
                  />
                </Column>
                <Column>
                  <Text
                    style={{
                      ...baseTextStyle,
                      fontWeight: "bold",
                      margin: "0 0 4px 0",
                    }}
                  >
                    {athlete.first_name} {athlete.last_name}
                  </Text>
                  <Text
                    style={{
                      ...baseTextStyle,
                      fontSize: "14px",
                      margin: "0 0 4px 0",
                      color: "#4b5563",
                      textTransform: "capitalize",
                    }}
                  >
                    {athlete.position ? athlete.position.toUpperCase() : ""}
                    {athlete.collegeData?.name
                      ? ` • ` + athlete.collegeData.name.toLowerCase()
                      : ""}
                    {athlete.grad_year
                      ? ` • ` + athlete.grad_year + " Grad"
                      : ""}
                  </Text>
                </Column>
              </Row>
            ))}

            {list.athletes.length > 5 && (
              <Text
                style={{
                  fontSize: "14px",
                  fontStyle: "italic",
                  color: "#6b7280",
                  marginTop: "-16px",
                  marginBottom: "36px",
                }}
              >
                +{list.athletes.length - 5} more athletes
              </Text>
            )}
          </React.Fragment>
        ))}
        <Section style={{ marginTop: "48px" }}>
          <div style={buttonContainerStyle}>
            <Link
              href="https://upnext.team/dashboard/lists"
              style={buttonStyle}
            >
              View All Athletes{" "}
              <span style={{ paddingLeft: "5px" }}>&rarr;</span>
            </Link>
          </div>
        </Section>
        <Section style={{ marginTop: "20px" }}>
          <Link
            href="https://upnext.team/dashboard/settings"
            style={{ color: "#1D4ED8" }}
          >
            To unsubscribe from these emails, edit your email preferences in
            your account settings
          </Link>
        </Section>
      </Section>
    </EmailBaseTemplate>
  );
};

export default SmartListNotificationEmail;
