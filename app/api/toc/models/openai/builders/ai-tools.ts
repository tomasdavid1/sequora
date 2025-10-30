/**
 * OpenAI function tools for AI response generation
 * These tools allow the AI to take actions like raising flags, counting confirmations, etc.
 */

export const AI_TOOLS = [
  {
    type: "function" as const,
    function: {
      name: "raise_flag",
      description: "Raise a flag when patient symptoms require attention",
      parameters: {
        type: "object",
        properties: {
          flagType: { type: "string", description: "Type of flag (symptom_escalation, respiratory, etc.)" },
          severity: { type: "string", enum: ["LOW", "MODERATE", "HIGH", "CRITICAL"], description: "Severity level" },
          rationale: { type: "string", description: "Brief explanation of why this flag was raised" }
        },
        required: ["flagType", "severity", "rationale"]
      }
    }
  },
  {
    type: "function" as const,
    function: {
      name: "ask_more",
      description: "Ask follow-up questions to gather more information",
      parameters: {
        type: "object",
        properties: {
          questions: { 
            type: "array", 
            items: { type: "string" },
            minItems: 1,
            maxItems: 3,
            description: "List of follow-up questions to ask the patient"
          }
        },
        required: ["questions"]
      }
    }
  },
  {
    type: "function" as const,
    function: {
      name: "log_checkin",
      description: "Log the check-in result when patient is doing well",
      parameters: {
        type: "object",
        properties: {
          result: { type: "string", enum: ["ASK_MORE", "FLAG", "CLOSE"], description: "Check-in result" },
          summary: { type: "string", description: "Brief summary of the check-in" }
        },
        required: ["result"]
      }
    }
  },
  {
    type: "function" as const,
    function: {
      name: "handoff_to_nurse",
      description: "Hand off to a nurse when immediate attention is needed (CRITICAL situations only)",
      parameters: {
        type: "object",
        properties: {
          reason: { type: "string", description: "Reason for handoff to nurse (be specific about symptoms)" },
          flagType: { type: "string", description: "Type of red flag (e.g., HF_CHEST_PAIN, HF_BREATHING_WORSE)" }
        },
        required: ["reason", "flagType"]
      }
    }
  },
  {
    type: "function" as const,
    function: {
      name: "count_wellness_confirmation",
      description: "ALWAYS call this after EVERY patient response to track wellness confirmations. Report whether patient's current response counts as a wellness confirmation.",
      parameters: {
        type: "object",
        properties: {
          isConfirmation: { 
            type: "boolean", 
            description: "Does this response count as a NEW wellness confirmation? True if patient specifically confirmed an area is normal (breathing, meds, no symptoms). False if vague ('I'm fine') or no new health info." 
          },
          areaConfirmed: {
            type: "string",
            description: "What specific health area was confirmed? (e.g., 'breathing', 'medications', 'no_new_symptoms'). Leave empty if not a confirmation."
          }
        },
        required: ["isConfirmation"]
      }
    }
  }
] as const;

