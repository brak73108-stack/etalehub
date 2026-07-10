/**
 * @fileoverview LLM Provider Placeholder for EtaleHub AI
 *
 * Stub implementation with the same interface as LocalPatternProvider.
 * Replace this file's internals with real API calls to OpenAI, Anthropic,
 * or a self-hosted model when ready.
 *
 * NOT used by default — the AIProvider adapter starts with LocalPatternProvider.
 *
 * @module llm-provider-placeholder
 */

/**
 * @class LLMProvider
 * Placeholder for a future LLM-backed NLP provider.
 *
 * Same interface as LocalPatternProvider so it can be swapped in
 * via `aiProvider.setProvider(new LLMProvider({ apiKey }))`.
 */
export class LLMProvider {
  /**
   * @param {Object} [config]
   * @param {string} [config.apiKey]     — API key for the LLM service
   * @param {string} [config.model]      — Model identifier (e.g. 'gpt-4', 'claude-3')
   * @param {string} [config.endpoint]   — Custom API endpoint URL
   * @param {number} [config.maxTokens]  — Maximum response tokens
   */
  constructor(config = {}) {
    /** @type {string} */
    this.name = 'llm';
    /** @type {string} */
    this.version = '0.1.0-placeholder';

    // Store config for when the integration is built
    this._config = {
      apiKey: config.apiKey || null,
      model: config.model || 'gpt-4',
      endpoint: config.endpoint || 'https://api.openai.com/v1/chat/completions',
      maxTokens: config.maxTokens || 1024,
    };
  }

  /**
   * Process a raw text command via the LLM.
   *
   * Currently returns an error result — replace internals with real API
   * call when the integration is ready.
   *
   * @param {string} inputText — raw user input
   * @returns {Promise<{
   *   intent: string|string[],
   *   entities: Object,
   *   confidence: number,
   *   rawInput: string,
   *   actions: Array,
   *   error: string
   * }>}
   */
  async processCommand(inputText) {
    // ──────────────────────────────────────────────────────────────────
    // TODO: Replace this stub with a real LLM API call.
    //
    // The implementation should:
    //   1. Build a system prompt describing EtaleHub intents + entities
    //   2. Send the user's input as the user message
    //   3. Parse the structured JSON response
    //   4. Map it to the standard { intent, entities, confidence, actions }
    //
    // Example (OpenAI):
    //
    //   const response = await fetch(this._config.endpoint, {
    //     method: 'POST',
    //     headers: {
    //       'Content-Type': 'application/json',
    //       'Authorization': `Bearer ${this._config.apiKey}`,
    //     },
    //     body: JSON.stringify({
    //       model: this._config.model,
    //       max_tokens: this._config.maxTokens,
    //       messages: [
    //         { role: 'system', content: ETALEHUB_SYSTEM_PROMPT },
    //         { role: 'user', content: inputText },
    //       ],
    //       response_format: { type: 'json_object' },
    //     }),
    //   });
    //
    //   const data = await response.json();
    //   const parsed = JSON.parse(data.choices[0].message.content);
    //
    //   return {
    //     intent: parsed.intent,
    //     entities: parsed.entities,
    //     confidence: parsed.confidence || 0.95,
    //     rawInput: inputText,
    //     actions: buildActionsFromLLMResponse(parsed),
    //   };
    //
    // ──────────────────────────────────────────────────────────────────

    console.warn(
      '[EtaleHub AI] LLM provider is not yet configured. Falling back is recommended.'
    );

    return {
      intent: 'error',
      entities: {},
      confidence: 0,
      rawInput: inputText || '',
      actions: [],
      error: 'LLM integration not yet configured. Using local pattern matching.',
    };
  }

  /**
   * Returns the name of this provider.
   * @returns {string}
   */
  getName() {
    return this.name;
  }

  /**
   * Check if the provider is properly configured.
   * @returns {boolean}
   */
  isConfigured() {
    return !!(this._config.apiKey && this._config.endpoint);
  }
}

// ──────────────────────────────────────────────────────────────────────────────
// System prompt template (for reference when implementing)
// ──────────────────────────────────────────────────────────────────────────────
//
// const ETALEHUB_SYSTEM_PROMPT = `
// You are the AI assistant for EtaleHub, a SaaS platform for plumbing and
// heating businesses. Parse the user's command and return a JSON object with:
//
// {
//   "intent": string or array of strings,
//   "entities": {
//     "customer": string or null,
//     "amount": number or null,
//     "paymentMethod": "card"|"cash"|"bank_transfer"|"cheque" or null,
//     "date": { "label": string, "date": "YYYY-MM-DD" } or null,
//     "jobType": string or null,
//     "serviceType": string or null
//   },
//   "confidence": number between 0 and 1
// }
//
// Valid intents: complete_job, create_invoice, record_payment, book_appointment,
// create_reminder, check_payments, query_customer, add_customer, create_quote,
// send_message, daily_briefing, job_status
//
// For compound commands with multiple sentences, return an array of intents
// and merge entities across sentences (resolve pronouns).
// `;

export default LLMProvider;
