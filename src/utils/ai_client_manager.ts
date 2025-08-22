/**
 * AI Client Manager
 * 
 * Handles AI client initialization, configuration, and lifecycle management.
 * Extracted from ai_service.ts for better modularity and testability.
 */

import { OpenAI } from 'openai';
import Anthropic from '@anthropic-ai/sdk';
import { getConfig } from '../get_config';
import { AIInitializationError, validateConfiguration } from './error_handling';

// Configuration validation result
export interface ValidationResult {
  isValid: boolean;
  errors: string[];
}

// Provider types
export type AIProvider = 'openai' | 'claude' | null;

// Client initialization result
export interface ClientInitResult {
  success: boolean;
  activeProvider?: AIProvider;
  error?: string;
}

/**
 * AI Client Manager class for handling multiple AI providers
 */
export class AIClientManager {
  private openaiClient: OpenAI | null = null;
  private claudeClient: Anthropic | null = null;
  private currentProvider: AIProvider = null;

  /**
   * Validate OpenAI API key format
   */
  private validateOpenAIApiKey(apiKey: string): void {
    if (!apiKey || apiKey.trim() === '') {
      throw new Error('OpenAI API key is required');
    }

    // Basic API key format validation
    if (apiKey.length < 10 || !apiKey.startsWith('sk-')) {
      throw new Error('Invalid OpenAI API key format');
    }
  }

  /**
   * Validate Claude API key format
   */
  private validateClaudeApiKey(apiKey: string): void {
    if (!apiKey || apiKey.trim() === '') {
      throw new Error('Claude API key is required');
    }

    // Basic validation - Claude API keys should be substantial length
    if (apiKey.length < 10) {
      throw new Error('Invalid Claude API key format');
    }
  }

  /**
   * Initialize OpenAI client with API key validation
   */
  initializeOpenAI(apiKey: string, azureConfig?: {
    endpoint: string;
    deployment: string;
    apiVersion?: string;
  }): OpenAI {
    // Validate API key
    this.validateOpenAIApiKey(apiKey);

    try {
      if (azureConfig) {
        // Azure OpenAI initialization
        this.openaiClient = new OpenAI({
          apiKey,
          baseURL: `${azureConfig.endpoint.replace(/\/$/, '')}/openai/deployments/${azureConfig.deployment}`,
          defaultQuery: {
            'api-version': azureConfig.apiVersion || '2024-08-01-preview',
          },
          defaultHeaders: {
            'api-key': apiKey,
            'Content-Type': 'application/json',
          },
        });
      } else {
        // Standard OpenAI initialization
        this.openaiClient = new OpenAI({
          apiKey,
        });
      }

      console.log('✅ OpenAI client initialized successfully');
      return this.openaiClient;
    } catch (error) {
      console.error('❌ Failed to initialize OpenAI client:', error);
      throw new Error(`Failed to initialize OpenAI client: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Initialize Claude client with API key validation
   */
  initializeClaude(apiKey: string): Anthropic {
    // Validate API key
    this.validateClaudeApiKey(apiKey);

    try {
      this.claudeClient = new Anthropic({
        apiKey,
      });

      console.log('✅ Claude client initialized successfully');
      return this.claudeClient;
    } catch (error) {
      console.error('❌ Failed to initialize Claude client:', error);
      throw new Error(`Failed to initialize Claude client: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Switch active provider
   */
  switchProvider(provider: 'openai' | 'claude'): void {
    if (provider === 'openai' && !this.openaiClient) {
      throw new Error('OpenAI client is not initialized');
    }
    if (provider === 'claude' && !this.claudeClient) {
      throw new Error('Claude client is not initialized');
    }

    this.currentProvider = provider;
  }

  /**
   * Get current active provider
   */
  getCurrentProvider(): AIProvider {
    return this.currentProvider;
  }

  /**
   * Check if provider is available
   */
  isProviderAvailable(provider: 'openai' | 'claude'): boolean {
    return provider === 'openai' ? this.openaiClient !== null : this.claudeClient !== null;
  }

  /**
   * Get active client based on current provider
   */
  getActiveClient(): OpenAI | Anthropic | null {
    if (this.currentProvider === 'openai') {
      return this.openaiClient;
    }
    if (this.currentProvider === 'claude') {
      return this.claudeClient;
    }
    return null;
  }

  /**
   * Get OpenAI client
   */
  getOpenAIClient(): OpenAI | null {
    return this.openaiClient;
  }

  /**
   * Get Claude client
   */
  getClaudeClient(): Anthropic | null {
    return this.claudeClient;
  }

  /**
   * Cleanup clients
   */
  cleanup(): void {
    this.openaiClient = null;
    this.claudeClient = null;
    this.currentProvider = null;
  }
}

// Global clients (for backward compatibility with existing code)
let globalOpenai: OpenAI | null = null;
let globalClaude: Anthropic | null = null;
let globalClientManager: AIClientManager | null = null;

/**
 * Validate client configuration
 */
export const validateClientConfiguration = (config: any): ValidationResult => {
  const errors: string[] = [];

  if (!config.useAI) {
    return { isValid: true, errors: [] }; // AI not enabled, no validation needed
  }

  // Check for API keys when AI is enabled
  if (!config.useClaudeAI && !config.openaiApiKey && !config.azureOpenAIApiKey) {
    errors.push('OpenAI API key is required when useAI is true');
  }

  if (config.useClaudeAI && !config.claudeApiKey) {
    errors.push('Claude API key is required when useClaudeAI is true');
  }

  // Azure OpenAI specific validation
  if (config.useAzureOpenAI) {
    if (!config.azureOpenAIEndpoint) {
      errors.push('Azure OpenAI endpoint is required');
    }
    if (!config.azureOpenAIDeployment) {
      errors.push('Azure OpenAI deployment is required');
    }
    if (!config.azureOpenAIApiKey) {
      errors.push('Azure OpenAI API key is required');
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
};

/**
 * Initialize AI clients based on configuration
 */
export const initializeAIClients = (): ClientInitResult => {
  try {
    const config = getConfig();
    
    // Validate configuration first
    const validation = validateClientConfiguration(config);
    if (!validation.isValid) {
      return {
        success: false,
        error: `Configuration validation failed: ${validation.errors.join(', ')}`,
      };
    }

    // Also use existing validation
    validateConfiguration(config);

    // Create global client manager if not exists
    if (!globalClientManager) {
      globalClientManager = new AIClientManager();
    }

    // Initialize Claude if enabled
    if (config.useClaudeAI && config.claudeApiKey) {
      globalClaude = globalClientManager.initializeClaude(config.claudeApiKey);
      globalClientManager.switchProvider('claude');
      return { success: true, activeProvider: 'claude' };
    }

    // Initialize OpenAI
    if (config.useAzureOpenAI) {
      if (!config.azureOpenAIEndpoint || !config.azureOpenAIDeployment) {
        return {
          success: false,
          error: 'Azure OpenAI configuration is incomplete',
        };
      }

      globalOpenai = globalClientManager.initializeOpenAI(
        config.azureOpenAIApiKey,
        {
          endpoint: config.azureOpenAIEndpoint,
          deployment: config.azureOpenAIDeployment,
          apiVersion: config.azureOpenAIApiVersion,
        }
      );
    } else if (config.openaiApiKey) {
      globalOpenai = globalClientManager.initializeOpenAI(config.openaiApiKey);
    }

    if (globalOpenai) {
      globalClientManager.switchProvider('openai');
      return { success: true, activeProvider: 'openai' };
    }

    return {
      success: false,
      error: 'No AI provider could be initialized',
    };

  } catch (error) {
    return {
      success: false,
      error: `Failed to initialize AI clients: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
};

/**
 * Get OpenAI client (global)
 */
export const getOpenAIClient = (): OpenAI | null => {
  return globalOpenai;
};

/**
 * Get Claude client (global)
 */
export const getClaudeClient = (): Anthropic | null => {
  return globalClaude;
};

/**
 * Switch active provider (global)
 */
export const switchProvider = (provider: 'openai' | 'claude'): ClientInitResult => {
  if (!globalClientManager) {
    return {
      success: false,
      error: 'Client manager is not initialized',
    };
  }

  try {
    if (provider === 'openai' && !globalOpenai) {
      return {
        success: false,
        error: 'OpenAI client is not available',
      };
    }

    if (provider === 'claude' && !globalClaude) {
      return {
        success: false,
        error: 'Claude client is not available',
      };
    }

    globalClientManager.switchProvider(provider);
    return {
      success: true,
      activeProvider: provider,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
};

/**
 * Cleanup all clients
 */
export const cleanupAIClients = (): void => {
  if (globalClientManager) {
    globalClientManager.cleanup();
  }
  globalOpenai = null;
  globalClaude = null;
  globalClientManager = null;
};