/**
 * @fileoverview Unified AI Provider Interface for EtaleHub
 *
 * Adapter layer that delegates NLP processing to whichever provider
 * is currently active. Defaults to LocalPatternProvider; can be swapped
 * at runtime to an LLM provider (or any provider with the same interface).
 *
 * Usage:
 *   import { aiProvider } from './providers/ai-provider.js';
 *   const result = await aiProvider.processCommand("I finished Mrs Smith's boiler");
 *   aiProvider.setProvider(new LLMProvider({ apiKey: '...' }));
 *
 * @module ai-provider
 */

import { LocalPatternProvider } from './local-pattern-provider.js';

/**
 * @class AIProvider
 * Adapter that wraps the active NLP provider and exposes a stable API.
 */
export class AIProvider {
  constructor() {
    /**
     * The currently active provider instance.
     * Must implement: async processCommand(text), getName()
     * @type {{ processCommand: (text: string) => Promise<Object>, getName: () => string }}
     * @private
     */
    this._provider = new LocalPatternProvider();
  }

  /**
   * Process a natural language command through the active provider.
   *
   * @param {string} inputText — raw user input
   * @returns {Promise<{
   *   intent: string|string[],
   *   entities: Object,
   *   confidence: number,
   *   rawInput: string,
   *   actions: Array<{type: string, description: string, safe: boolean, data: Object}>
   * }>}
   */
  async processCommand(inputText) {
    try {
      const result = await this._provider.processCommand(inputText);

      // If the provider returned an error (e.g. LLM not configured),
      // fall back to local pattern matching automatically
      if (result.error && this._provider.getName() !== 'local-pattern') {
        console.warn(
          `[AIProvider] Provider "${this._provider.getName()}" returned error. ` +
          'Falling back to local pattern matching.'
        );
        const fallback = new LocalPatternProvider();
        return await fallback.processCommand(inputText);
      }

      return result;
    } catch (err) {
      console.error('[AIProvider] Provider threw an error:', err);

      // Graceful fallback
      if (this._provider.getName() !== 'local-pattern') {
        console.warn('[AIProvider] Attempting fallback to local pattern matching.');
        const fallback = new LocalPatternProvider();
        return await fallback.processCommand(inputText);
      }

      // If even the local provider failed, return an empty result
      return {
        intent: 'error',
        entities: {},
        confidence: 0,
        rawInput: inputText || '',
        actions: [],
        error: err.message,
      };
    }
  }

  /**
   * Swap the underlying NLP provider at runtime.
   *
   * @param {Object} provider — must implement processCommand(text) and getName()
   * @throws {Error} if provider doesn't have the required methods
   */
  setProvider(provider) {
    if (!provider || typeof provider.processCommand !== 'function') {
      throw new Error(
        '[AIProvider] Provider must implement async processCommand(text)'
      );
    }
    if (typeof provider.getName !== 'function') {
      throw new Error('[AIProvider] Provider must implement getName()');
    }

    const previousName = this._provider.getName();
    this._provider = provider;
    console.info(
      `[AIProvider] Switched provider: ${previousName} → ${provider.getName()}`
    );
  }

  /**
   * Get the name of the currently active provider.
   * @returns {string}
   */
  getProvider() {
    return this._provider.getName();
  }
}

/**
 * Singleton instance — import this for standard usage.
 * @type {AIProvider}
 */
export const aiProvider = new AIProvider();

export default AIProvider;
