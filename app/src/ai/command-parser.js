import { aiProvider } from './providers/ai-provider.js';

/**
 * Parse raw user input into structured intents, entities, and proposed actions.
 * Logs the raw input and interpretation to the aiActions audit store.
 * 
 * @param {string} inputText - Raw natural language command
 * @returns {Promise<Object>} - Parsed result from the AI provider
 */
export async function parseCommand(inputText) {
  try {
    // Call the active AI provider
    const result = await aiProvider.processCommand(inputText);
    
    // Log to aiActions db (if available)
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
      actions: [{ type: result.suggestedWorkflow, description: result.explanation, safe: result.safeToExecute, data: result.entities }]
    };
  } catch (error) {
    console.error('[CommandParser] Error parsing command:', error);
    throw new Error('Failed to parse command. Please try again.');
  }
}
