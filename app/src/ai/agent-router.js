/**
 * Agent Router
 * Receives the parsed command from the NLP provider and orchestrates the specialist agents.
 * 
 * 1. Office Manager evaluates the raw intent/entities
 * 2. It dispatches to specialist agents
 * 3. Results are aggregated
 * 4. Everything is passed through the Safety & Approval agent
 */

import { process as processCommand } from './agents/office-manager.js';
import { evaluate as evaluateSafety } from './agents/safety.js';

export async function routeCommand(parsedCommand) {
  try {
    // 1. Send to Office Manager for orchestration
    const officeResult = await processCommand(parsedCommand);
    
    // 2. Filter actions through Safety Agent
    const finalResult = await evaluateSafety(officeResult);
    
    // 3. Construct summary
    let summary = "I've handled that for you.";
    if (finalResult.needsApproval && finalResult.needsApproval.length > 0) {
      summary = "I've handled that for you, but there's a message that needs your approval before sending.";
    }
    
    return {
      executed: finalResult.executed || [],
      needsApproval: finalResult.needsApproval || [],
      summary
    };
  } catch (error) {
    console.error('[AgentRouter] Error processing command:', error);
    return {
      executed: [],
      needsApproval: [],
      summary: "Sorry, something went wrong while processing that command.",
      error: error.message
    };
  }
}
