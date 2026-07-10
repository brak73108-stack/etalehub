import { LocalPatternProvider } from './local-pattern-provider.js';
import { LLMProvider } from './llm-provider.js';
import { isDemoMode } from '../../services/mode-service.js';

const localProvider = new LocalPatternProvider();
const llmProvider = new LLMProvider();

class AIProviderFactory {
  async processCommand(text, dynamicContext = null) {
    const enableLlm = import.meta.env.VITE_ENABLE_LLM === 'true';

    // 1. If in Demo Mode, always use Local Pattern
    if (isDemoMode()) {
      console.log('[AIProvider] Demo Mode active. Using local pattern provider.');
      return await localProvider.processCommand(text);
    }

    // 2. If VITE_ENABLE_LLM is false, use Local Pattern
    if (!enableLlm) {
      console.log('[AIProvider] LLM disabled. Using local pattern provider.');
      return await localProvider.processCommand(text);
    }

    // 3. Attempt LLM with fallback
    try {
      console.log('[AIProvider] Routing to LLM Edge Function...');
      return await llmProvider.processCommand(text, dynamicContext);
    } catch (e) {
      console.warn('[AIProvider] LLM Provider failed, falling back to local pattern provider:', e);
      return await localProvider.processCommand(text);
    }
  }
}

export const aiProvider = new AIProviderFactory();
