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
      const { create } = await import('../db/ai-actions.js');
      await create({
        inputText,
        interpretedIntent: Array.isArray(result.intent) ? result.intent.join(', ') : result.intent,
        extractedEntities: result.entities,
        proposedActions: result.actions,
        executedActions: [], // Will be updated later in the pipeline
        confidenceScore: result.confidence,
        riskLevel: result.actions.some(a => !a.safe) ? 'high' : 'low'
      });
    } catch (e) {
      console.warn('[CommandParser] Could not log to aiActions store:', e);
    }
    
    return result;
  } catch (error) {
    console.error('[CommandParser] Error parsing command:', error);
    throw new Error('Failed to parse command. Please try again.');
  }
}
