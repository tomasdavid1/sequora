/**
 * Centralized OpenAI API Wrapper
 * 
 * Provides a single, robust interface for all OpenAI calls with:
 * - Automatic retry logic with exponential backoff
 * - Configurable validation (text content, JSON, tool calls)
 * - Fallback strategies for graceful degradation
 * - Consistent error handling and logging
 * 
 * Usage:
 * ```typescript
 * const result = await callOpenAI({
 *   model: 'gpt-4',
 *   messages: [...],
 *   validation: { requireTextContent: true },
 *   retry: { maxAttempts: 3 }
 * });
 * ```
 */

import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// ============================================================================
// Types
// ============================================================================

export interface OpenAICallParams {
  model: string;
  messages: Array<{role: string; content: string}>;
  tools?: any[];
  tool_choice?: string;
  temperature?: number;
  max_tokens?: number;
  response_format?: { type: 'text' | 'json_object' };
}

export interface ValidationOptions {
  /**
   * If true, throws error if response has no text content.
   * Use for patient-facing messages (response generation, initial check-ins).
   */
  requireTextContent?: boolean;
  
  /**
   * If true, validates that response is valid JSON.
   * Use for parsing operations.
   */
  requireValidJson?: boolean;
  
  /**
   * If true, allows tool calls but validates they have proper structure.
   * Use for operations that use function calling.
   */
  allowToolCalls?: boolean;
}

export interface RetryOptions {
  /**
   * Maximum number of retry attempts (total calls = maxAttempts + original)
   * Default: 2 (3 total attempts)
   */
  maxAttempts?: number;
  
  /**
   * Base delay in milliseconds before retry
   * Will be multiplied by attempt number for exponential backoff
   * Default: 1000ms
   */
  baseDelayMs?: number;
  
  /**
   * If true and all retries fail, attempts fallback without tools
   * Only applies when requireTextContent is true
   * Default: true
   */
  enableFallback?: boolean;
}

export interface OpenAICallOptions {
  /** The parameters to pass to OpenAI API */
  params: OpenAICallParams;
  
  /** Validation rules for the response */
  validation?: ValidationOptions;
  
  /** Retry configuration */
  retry?: RetryOptions;
  
  /** Optional label for logging (e.g., 'Response Generation', 'Parse', 'Summary') */
  operationLabel?: string;
}

export interface OpenAICallResult {
  /** The completion response from OpenAI */
  completion: OpenAI.Chat.Completions.ChatCompletion;
  
  /** Extracted text content (if any) */
  textContent: string | null;
  
  /** Extracted tool calls (if any) */
  toolCalls: Array<{name: string; parameters: any}>;
  
  /** Whether fallback mode was used (no tools) */
  usedFallback: boolean;
  
  /** Number of retry attempts made */
  retryAttempts: number;
}

// ============================================================================
// Main Function
// ============================================================================

/**
 * Centralized OpenAI call with retry logic and validation
 */
export async function callOpenAI(options: OpenAICallOptions): Promise<OpenAICallResult> {
  const {
    params,
    validation = {},
    retry = {},
    operationLabel = 'OpenAI Call'
  } = options;
  
  const {
    requireTextContent = false,
    requireValidJson = false,
    allowToolCalls = true
  } = validation;
  
  const {
    maxAttempts = 2,
    baseDelayMs = 1000,
    enableFallback = true
  } = retry;
  
  console.log(`🚀 [${operationLabel}] Starting OpenAI call`);
  
  // Try with retry logic
  try {
    const result = await callWithRetry(
      params,
      {
        requireTextContent,
        requireValidJson,
        allowToolCalls
      },
      maxAttempts,
      baseDelayMs,
      operationLabel
    );
    
    return result;
    
  } catch (retryError) {
    // If all retries failed and we need text content, try fallback
    if (requireTextContent && enableFallback && params.tools) {
      console.warn(`⚠️ [${operationLabel}] All retries exhausted. Attempting fallback without tools...`);
      
      try {
        const fallbackParams = { ...params, tools: undefined, tool_choice: undefined };
        const fallbackResult = await callWithRetry(
          fallbackParams,
          { requireTextContent: true, requireValidJson: false, allowToolCalls: false },
          0, // No retries for fallback
          baseDelayMs,
          `${operationLabel} (Fallback)`
        );
        
        console.log(`✅ [${operationLabel}] Fallback successful`);
        return { ...fallbackResult, usedFallback: true };
        
      } catch (fallbackError) {
        console.error(`❌ [${operationLabel}] Fallback also failed:`, fallbackError);
        throw new Error(`${operationLabel} failed even with fallback strategy`);
      }
    }
    
    // No fallback available or not needed
    throw retryError;
  }
}

// ============================================================================
// Internal Retry Logic
// ============================================================================

async function callWithRetry(
  params: OpenAICallParams,
  validation: Required<ValidationOptions>,
  maxAttempts: number,
  baseDelayMs: number,
  operationLabel: string,
  attemptNumber: number = 0
): Promise<OpenAICallResult> {
  const totalAttempts = maxAttempts + 1;
  
  try {
    console.log(`🔄 [${operationLabel}] Attempt ${attemptNumber + 1}/${totalAttempts}`);
    
    // Make the API call
    const completion = await openai.chat.completions.create(params as any);
    const message = completion.choices[0]?.message;
    
    if (!message) {
      throw new Error('OpenAI returned no message');
    }
    
    // Extract content
    const textContent = message.content || null;
    const toolCalls = extractToolCalls(message);
    
    // Validate response
    const validationError = validateResponse(
      { textContent, toolCalls, message },
      validation,
      operationLabel
    );
    
    if (validationError && attemptNumber < maxAttempts) {
      console.warn(`⚠️ [${operationLabel}] ${validationError} Retrying with enhanced prompt...`);
      
      // Add explicit instruction and retry
      const enhancedParams = enhanceParamsForRetry(params, validation, attemptNumber);
      await delay(baseDelayMs * (attemptNumber + 1));
      
      return callWithRetry(
        enhancedParams,
        validation,
        maxAttempts,
        baseDelayMs,
        operationLabel,
        attemptNumber + 1
      );
    }
    
    if (validationError) {
      throw new Error(validationError);
    }
    
    // Success!
    console.log(`✅ [${operationLabel}] Call successful (attempt ${attemptNumber + 1})`);
    
    return {
      completion,
      textContent,
      toolCalls,
      usedFallback: false,
      retryAttempts: attemptNumber
    };
    
  } catch (error) {
    // If it's our validation error or we've exhausted attempts, throw
    if (error instanceof Error && 
        (error.message.includes('validation failed') || 
         error.message.includes('OpenAI returned'))) {
      if (attemptNumber >= maxAttempts) {
        throw error;
      }
    }
    
    // For API errors, retry if we haven't exhausted attempts
    if (attemptNumber < maxAttempts) {
      console.warn(`⚠️ [${operationLabel}] API error on attempt ${attemptNumber + 1}. Retrying...`, error);
      await delay(baseDelayMs * (attemptNumber + 1));
      return callWithRetry(params, validation, maxAttempts, baseDelayMs, operationLabel, attemptNumber + 1);
    }
    
    // All retries exhausted
    throw error;
  }
}

// ============================================================================
// Helper Functions
// ============================================================================

function extractToolCalls(message: any): Array<{name: string; parameters: any}> {
  if (!message.tool_calls || !Array.isArray(message.tool_calls)) {
    return [];
  }
  
  return message.tool_calls
    .map((toolCall: any) => {
      if (toolCall.type === 'function') {
        try {
          return {
            name: toolCall.function.name,
            parameters: JSON.parse(toolCall.function.arguments)
          };
        } catch {
          console.warn('⚠️ Failed to parse tool call arguments:', toolCall.function.arguments);
          return null;
        }
      }
      return null;
    })
    .filter(Boolean) as Array<{name: string; parameters: any}>;
}

function validateResponse(
  response: { textContent: string | null; toolCalls: any[]; message: any },
  validation: Required<ValidationOptions>,
  operationLabel: string
): string | null {
  const { textContent, toolCalls, message } = response;
  
  // Check text content requirement
  if (validation.requireTextContent && !textContent) {
    if (toolCalls.length > 0) {
      return `Validation failed: Text content required but only tool calls returned`;
    }
    return `Validation failed: Text content required but response was empty`;
  }
  
  // Check JSON requirement
  if (validation.requireValidJson && textContent) {
    try {
      JSON.parse(textContent);
    } catch {
      return `Validation failed: Valid JSON required but response is not valid JSON`;
    }
  }
  
  // Check tool calls allowance
  if (!validation.allowToolCalls && toolCalls.length > 0) {
    return `Validation failed: Tool calls not allowed but ${toolCalls.length} tool call(s) returned`;
  }
  
  return null; // All validations passed
}

function enhanceParamsForRetry(
  params: OpenAICallParams,
  validation: Required<ValidationOptions>,
  attemptNumber: number
): OpenAICallParams {
  // Build reminder message based on what failed
  let reminder = '';
  
  if (validation.requireTextContent) {
    reminder = '⚠️ CRITICAL: You MUST include a text response. Never return tool calls alone without text content for the user to see.';
  } else if (validation.requireValidJson) {
    reminder = '⚠️ CRITICAL: You MUST return valid JSON format. Ensure your response is properly formatted JSON.';
  }
  
  if (!reminder) {
    return params; // No enhancement needed
  }
  
  // Insert reminder before the last user message
  const enhancedMessages = [
    ...params.messages.slice(0, -1),
    {
      role: 'system' as const,
      content: reminder
    },
    params.messages[params.messages.length - 1]
  ];
  
  return { ...params, messages: enhancedMessages };
}

function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// ============================================================================
// Exports
// ============================================================================

export default callOpenAI;

