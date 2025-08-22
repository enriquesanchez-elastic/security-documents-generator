/**
 * AI Request Handler
 * 
 * Handles AI request formatting, execution, retry logic, and response validation.
 * Extracted from ai_service.ts for better modularity and testability.
 */

import { OpenAI } from 'openai';
import Anthropic from '@anthropic-ai/sdk';
import { getConfig } from '../get_config';
import { aiResponseCache } from './cache_service';
import { sanitizeJSONResponse } from './validation_service';
import { withRetry, safeJsonParse } from './error_handling';
import { ChatCompletion } from 'openai/resources/index';
import type { Message } from '@anthropic-ai/sdk/resources/messages';

// Types and interfaces
export interface RequestOptions {
  temperature?: number;
  maxTokens?: number;
  model?: string;
  timeout?: number;
}

export interface RetryConfig {
  maxRetries: number;
  baseDelay: number;
  backoffMultiplier?: number;
}

export interface AIResponse {
  content: string;
  provider: 'openai' | 'claude';
  usage?: {
    inputTokens?: number;
    outputTokens?: number;
    totalTokens: number;
  };
  timestamp: number;
  cached?: boolean;
  metrics?: {
    requestTime: number;
    timestamp: number;
  };
}

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
}

export interface RequestStatistics {
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  averageResponseTime: number;
  totalTokensUsed: number;
}

/**
 * AI Request Handler class for managing AI API requests
 */
export class AIRequestHandler {
  private statistics: RequestStatistics = {
    totalRequests: 0,
    successfulRequests: 0,
    failedRequests: 0,
    averageResponseTime: 0,
    totalTokensUsed: 0,
  };

  private defaultRetryConfig: RetryConfig = {
    maxRetries: 3,
    baseDelay: 1000,
    backoffMultiplier: 2,
  };

  private defaultTimeout = 30000; // 30 seconds

  constructor(customConfig?: Partial<RetryConfig & { timeout: number }>) {
    if (customConfig) {
      this.defaultRetryConfig = { ...this.defaultRetryConfig, ...customConfig };
      if (customConfig.timeout) {
        this.defaultTimeout = customConfig.timeout;
      }
    }
  }

  /**
   * Execute OpenAI request with retry and caching
   */
  async executeOpenAIRequest(
    client: OpenAI,
    prompt: string,
    schema: any,
    options?: RequestOptions,
    cacheKey?: string
  ): Promise<AIResponse> {
    const startTime = Date.now();
    this.statistics.totalRequests++;

    try {
      // Check cache first
      if (cacheKey) {
        const cached = aiResponseCache.get(cacheKey);
        if (cached) {
          return {
            content: cached.data,
            provider: 'openai',
            cached: true,
            timestamp: cached.timestamp,
          };
        }
      }

      const request = formatOpenAIRequest(prompt, schema, options);
      const response: ChatCompletion = await client.chat.completions.create(request);

      const content = response?.choices?.[0]?.message?.content || '';
      const usage = response?.usage;

      const aiResponse: AIResponse = {
        content,
        provider: 'openai',
        usage: usage ? {
          inputTokens: usage.prompt_tokens,
          outputTokens: usage.completion_tokens,
          totalTokens: usage.total_tokens,
        } : undefined,
        timestamp: Date.now(),
        metrics: {
          requestTime: Date.now() - startTime,
          timestamp: Date.now(),
        },
      };

      // Update statistics
      this.statistics.successfulRequests++;
      this.statistics.totalTokensUsed += usage?.total_tokens || 0;
      this.updateAverageResponseTime(Date.now() - startTime);

      // Cache the response
      if (cacheKey) {
        aiResponseCache.set(cacheKey, {
          data: content,
          timestamp: Date.now(),
        });
      }

      return aiResponse;
    } catch (error) {
      this.statistics.failedRequests++;
      throw error;
    }
  }

  /**
   * Execute Claude request with retry and caching
   */
  async executeClaudeRequest(
    client: Anthropic,
    systemPrompt: string,
    userPrompt: string,
    options?: RequestOptions,
    cacheKey?: string
  ): Promise<AIResponse> {
    const startTime = Date.now();
    this.statistics.totalRequests++;

    try {
      // Check cache first
      if (cacheKey) {
        const cached = aiResponseCache.get(cacheKey);
        if (cached) {
          return {
            content: cached.data,
            provider: 'claude',
            cached: true,
            timestamp: cached.timestamp,
          };
        }
      }

      const request = formatClaudeRequest(systemPrompt, userPrompt, options);
      const response: Message = await client.messages.create(request);

      const content = response?.content?.[0];
      const textContent = content?.type === 'text' ? content.text : '';
      const usage = response?.usage;

      const aiResponse: AIResponse = {
        content: textContent,
        provider: 'claude',
        usage: usage ? {
          inputTokens: usage.input_tokens,
          outputTokens: usage.output_tokens,
          totalTokens: usage.input_tokens + usage.output_tokens,
        } : undefined,
        timestamp: Date.now(),
        metrics: {
          requestTime: Date.now() - startTime,
          timestamp: Date.now(),
        },
      };

      // Update statistics
      this.statistics.successfulRequests++;
      this.statistics.totalTokensUsed += (usage?.input_tokens || 0) + (usage?.output_tokens || 0);
      this.updateAverageResponseTime(Date.now() - startTime);

      // Cache the response
      if (cacheKey) {
        aiResponseCache.set(cacheKey, {
          data: textContent,
          timestamp: Date.now(),
        });
      }

      return aiResponse;
    } catch (error) {
      this.statistics.failedRequests++;
      throw error;
    }
  }

  /**
   * Get request statistics
   */
  getStatistics(): RequestStatistics {
    return { ...this.statistics };
  }

  /**
   * Get default retry configuration
   */
  getDefaultRetryConfig(): RetryConfig {
    return { ...this.defaultRetryConfig };
  }

  /**
   * Reset statistics
   */
  resetStatistics(): void {
    this.statistics = {
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      averageResponseTime: 0,
      totalTokensUsed: 0,
    };
  }

  /**
   * Update average response time
   */
  private updateAverageResponseTime(responseTime: number): void {
    const totalResponseTime = this.statistics.averageResponseTime * (this.statistics.successfulRequests - 1);
    this.statistics.averageResponseTime = (totalResponseTime + responseTime) / this.statistics.successfulRequests;
  }
}

/**
 * Format OpenAI request with proper schema and parameters
 */
export const formatOpenAIRequest = (
  prompt: string,
  schema: any,
  options?: RequestOptions
): any => {
  const config = getConfig();
  const modelName = options?.model || 
    (config.useAzureOpenAI && config.azureOpenAIDeployment 
      ? config.azureOpenAIDeployment 
      : 'gpt-4o');

  return {
    model: modelName,
    messages: [
      { role: 'user', content: prompt },
    ],
    response_format: schema ? {
      type: 'json_schema',
      json_schema: {
        name: 'security_response',
        schema,
        strict: true,
      },
    } : undefined,
    temperature: options?.temperature || 0.7,
    max_tokens: options?.maxTokens || 2000,
  };
};

/**
 * Format Claude request with proper structure and parameters
 */
export const formatClaudeRequest = (
  systemPrompt: string,
  userPrompt: string,
  options?: RequestOptions
): any => {
  const config = getConfig();
  const modelName = options?.model || config.claudeModel || 'claude-3-5-sonnet-20241022';

  return {
    model: modelName,
    system: systemPrompt,
    messages: [
      {
        role: 'user',
        content: userPrompt,
      },
    ],
    temperature: options?.temperature || 0.7,
    max_tokens: options?.maxTokens || 2000,
  };
};

/**
 * Handle retry logic with exponential backoff
 */
export const handleRetryLogic = async <T>(
  operation: () => Promise<T>,
  retryConfig: RetryConfig
): Promise<T> => {
  const { maxRetries, baseDelay, backoffMultiplier = 2 } = retryConfig;
  
  let lastError: Error;
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error as Error;
      
      if (attempt === maxRetries) {
        break; // Don't wait after the last attempt
      }
      
      const delay = baseDelay * Math.pow(backoffMultiplier, attempt);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  throw lastError!;
};

/**
 * Validate AI response structure and content
 */
export const validateResponse = (
  response: AIResponse,
  expectJson = false,
  schema?: any
): ValidationResult => {
  const errors: string[] = [];

  // Check for empty content
  if (!response.content || response.content.trim() === '') {
    errors.push('Response content is empty');
  }

  // Validate JSON format if expected
  if (expectJson && response.content) {
    try {
      const parsed = JSON.parse(response.content);
      
      // Basic schema validation if provided
      if (schema && schema.required) {
        const missing = schema.required.filter((field: string) => !(field in parsed));
        if (missing.length > 0) {
          errors.push(`Missing required fields: ${missing.join(', ')}`);
        }
      }
    } catch (parseError) {
      errors.push('Invalid JSON format');
    }
  }

  // Validate provider
  if (!['openai', 'claude'].includes(response.provider)) {
    errors.push('Invalid provider specified');
  }

  // Validate timestamp
  if (!response.timestamp || response.timestamp <= 0) {
    errors.push('Invalid timestamp');
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
};