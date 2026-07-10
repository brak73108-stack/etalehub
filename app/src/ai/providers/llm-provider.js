import { supabase } from '../../services/supabase-client.js';
import { getCurrentBusinessId } from '../../services/mode-service.js';
import { validateIntent } from '../validators/intent-validator.js';

export class LLMProvider {
  getName() {
    return 'openai-structured';
  }

  async processCommand(text) {
    if (!supabase) throw new Error("Supabase client not initialized.");
    
    const businessId = getCurrentBusinessId();
    if (!businessId) {
       throw new Error("Cannot use LLM without an active business workspace.");
    }

    // Pre-retrieval: Retrieve minimal context here if needed (e.g., top customers)
    const context = {
       businessId,
       mode: 'production',
       timestamp: new Date().toISOString()
    };

    const { data, error } = await supabase.functions.invoke('parse-intent', {
      body: { command: text, business_id: businessId, context }
    });

    if (error) {
       console.error("[LLMProvider] Edge function error:", error);
       throw error;
    }

    // Validate structured output
    const validatedResult = validateIntent(data);
    return validatedResult;
  }
}
