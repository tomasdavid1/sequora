import {
  Body,
  Container,
  Head,
  Html,
  Link,
  Preview,
  Text,
  Img,
  Section,
  Row,
  Column,
} from "https://esm.sh/@react-email/components@0.0.22";
import * as React from "https://esm.sh/react@18.3.1";

export const headerTextStyle = {
  fontSize: "20px",
  lineHeight: "33.6px",
  fontFamily: "Helvetica, Arial, sans-serif",
  margin: "0",
  padding: "0",
  color: "#000000",
};

export const baseTextStyle = {
  fontSize: "16px",
  lineHeight: "24px",
  margin: "24px 0 0 0",
  fontFamily: "Helvetica, Arial, sans-serif",
  color: "#333333",
  fontWeight: "normal",
};

export const buttonStyle = {
  backgroundColor: "#059669",
  color: "#FFFFFF",
  fontSize: "16px",
  fontWeight: "semibold",
  textDecoration: "none",
  borderRadius: "10px",
  lineHeight: "20px",
  display: "inline-block",
  whiteSpace: "nowrap",
  padding: "18px 36px",
  border: "none",
  width: "100%",
};

export const buttonContainerStyle = {
  margin: "24px 0",
  justifyContent: "center",
  display: "flex",
  alignItems: "center",
  width: "100%",
  maxWidth: "700px",
  textAlign: "center" as React.CSSProperties["textAlign"],
};

export const EmailBaseTemplate = ({
  children,
  previewText,
}: {
  children: React.ReactNode;
  previewText: string;
}) => {
  const currentYear = new Date().getFullYear();

  return (
    <Html>
      <Head />

      <Preview>{previewText}</Preview>
      <Body
        style={{
          backgroundColor: "#FFF",
          margin: "0",
          padding: "0",
          borderRadius: "10px",
        }}
      >
        <Container
          style={{
            backgroundColor: "#FFF",
            width: "100%",
            maxWidth: "700px",
            margin: "0 auto",
            padding: "0",
            borderRadius: "10px",
          }}
        >
          <Section
            style={{
              margin: "auto",
              width: "100%",
              backgroundColor: "#FFF",
            }}
          >
            {/* Logo Row */}
            <Row style={{ width: "100%" }}>
              <Column
                style={{
                  width: "100%",
                  textAlign: "center",
                  marginBottom: "24px",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "center",
                    alignItems: "center",
                    width: "100%",
                    height: "90px",
                    backgroundColor: "#FFF",
                    textAlign: "center",
                    paddingBottom: "32px",
                    paddingTop: "32px",
                  }}
                >
                  <Text style={{
                    fontSize: "32px",
                    fontWeight: "bold",
                    color: "#059669",
                    margin: 0,
                  }}>
                    HealthX
                  </Text>
                </div>
              </Column>
            </Row>

            {/* Main Content Card */}
            <Section
              style={{
                backgroundColor: "#ffffff",
                overflow: "hidden",
              }}
            >
              <Section style={{ padding: "32px" }}>{children}</Section>
            </Section>

            {/* Footer Card */}
            <Section
              style={{
                backgroundColor: "#F7F9FC",
                padding: "32px",
                textAlign: "center",
                width: "100%",
              }}
            >
              <Text
                style={{
                  fontSize: "14px",
                  lineHeight: "16.8px",
                  margin: "auto",
                  color: "#666666",
                  fontWeight: "normal",
                  maxWidth: "500px",
                  textAlign: "center",
                }}
              >
                HealthX Transition of Care platform helps patients manage their
                post-discharge care with AI-powered check-ins, medication tracking,
                and personalized support for a smooth recovery.
              </Text>

              <Text
                style={{
                  fontSize: "14px",
                  lineHeight: "16.8px",
                  margin: "24px 0 0 0",
                  color: "#666666",
                  fontWeight: "normal",
                  textAlign: "center",
                }}
              >
                Questions? Contact{" "}
                <Link
                  href="mailto:support@healthx.app"
                  style={{ color: "#059669" }}
                >
                  support@healthx.app
                </Link>
              </Text>
            </Section>

            {/* Copyright Footer */}
            <Text
              style={{
                color: "#6b7280",
                fontSize: "12px",
                lineHeight: "16px",
                textAlign: "center",
                margin: "16px 0 0 0",
              }}
            >
              © {currentYear} HealthX. All rights reserved.
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
};

export default EmailBaseTemplate;
