import { supabase } from '../../services/supabase-client.js';
import { getCurrentBusinessId } from '../../services/mode-service.js';
import { validateIntent } from '../validators/intent-validator.js';

export class LLMProvider {
  getName() {
    return 'openai-structured';
  }

  async processCommand(text, dynamicContext = null) {
    if (!supabase) throw new Error("Supabase client not initialized.");
    
    const businessId = getCurrentBusinessId();
    if (!businessId) {
       throw new Error("Cannot use LLM without an active business workspace.");
    }

    // Default payload to dynamicContext, adding timestamp for temporal grounding
    const context = dynamicContext || {
       businessId,
       mode: 'production'
    };
    context.timestamp = new Date().toISOString();

    const { data, error } = await supabase.functions.invoke('parse-intent', {
      body: { command: text, business_id: businessId, context }
    });

    if (error) {
       console.error("[LLMProvider] Edge function error:", error);
       throw error;
    }

    // Validate structured output against context guarantees
    const validatedResult = validateIntent(data, context);
    return validatedResult;
  }
}
