import { aiProvider } from './providers/ai-provider.js';
import { buildLLMContext } from './context/context-builder.js';

/**
 * Parse raw user input into structured intents, entities, and proposed actions.
 * Logs the raw input and interpretation to the aiActions audit store.
 * 
 * @param {string} inputText - Raw natural language command
 * @returns {Promise<Object>} - Parsed result from the AI provider
 */
export async function parseCommand(inputPayload) {
  try {
    let inputText = inputPayload;
    let clarificationMerge = null;
    
    if (typeof inputPayload === 'object' && inputPayload.isClarification) {
      inputText = inputPayload.originalCommand;
      clarificationMerge = inputPayload;
    }

    // 1. Build Dynamic Context
    const dynamicContext = await buildLLMContext(inputText);

    // 2. Call the active AI provider with context
    // If it's a clarification, we append the clarification answer to the original text for the LLM context.
    const textToSend = clarificationMerge 
      ? `Original command: "${inputText}". User clarified missing info with: "${clarificationMerge.answer}"` 
      : inputText;

    const result = await aiProvider.processCommand(textToSend, dynamicContext);
    
    // If we have a pending clarification, try to preserve original intent if the LLM lost it
    if (clarificationMerge && !result.intents.includes(clarificationMerge.intent)) {
      result.intents.unshift(clarificationMerge.intent);
    }
    
    // 3. Log to aiActions db (if available)
    try {
      const { create } = await import('../services/data/ai-actions-service.js');
      await create({
        inputText,
        interpretedIntent: result.intents.join(', '),
        extractedEntities: result.entities,
        proposedActions: [{ type: result.suggestedWorkflow, description: result.explanation, safe: result.safeToExecute }],
        executedActions: [],
        confidenceScore: result.confidence,
        riskLevel: result.riskLevel
      });
    } catch (e) {
      console.warn('[CommandParser] Could not log to aiActions store:', e);
    }
    
    // Provide backwards compatibility structure for the agent-router
    return {
      originalText: inputText,
      intent: result.intents,
      entities: result.entities,
      confidence: result.confidence,
      riskLevel: result.riskLevel,
      requiresApproval: result.requiresApproval,
      missingInformation: result.missingInformation,
      options: result.options,
      safeToExecute: result.safeToExecute,
      userConfirmationRequired: result.userConfirmationRequired,
      explanation: result.explanation,
      actions: [{ type: result.suggestedWorkflow, description: result.explanation, safe: result.safeToExecute, data: result.entities }]
    };
  } catch (error) {
    console.error('[CommandParser] Error parsing command:', error);
    throw new Error('Failed to parse command. Please try again.');
  }
}
