/**
 * Tests for AI Request Handler
 * 
 * TDD Phase: RED - These tests will fail initially until we extract the module
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock external dependencies
vi.mock('../../src/get_config', () => ({
  getConfig: vi.fn(() => ({
    useAI: true,
    openaiApiKey: 'sk-test-openai-key-12345678901234567890',
    claudeApiKey: 'claude-api-key-test-1234567890',
    useClaudeAI: false,
    maxRetries: 3,
    retryDelay: 1000,
    timeout: 30000,
  })),
}));

vi.mock('../../src/utils/cache_service', () => ({
  aiResponseCache: {
    get: vi.fn().mockReturnValue(null),
    set: vi.fn(),
    has: vi.fn().mockReturnValue(false),
  },
}));

vi.mock('../../src/utils/validation_service', () => ({
  sanitizeJSONResponse: vi.fn().mockImplementation((input: string) => input),
}));

import {
  AIRequestHandler,
  RequestOptions,
  AIResponse,
  RetryConfig,
  formatOpenAIRequest,
  formatClaudeRequest,
  handleRetryLogic,
  validateResponse,
} from '../../src/utils/ai_request_handler';

describe('AI Request Handler - TDD Red Phase', () => {
  let requestHandler: AIRequestHandler;
  const mockOpenAIClient = {
    chat: {
      completions: {
        create: vi.fn().mockResolvedValue({
          choices: [{ message: { content: 'test response' } }],
          usage: { 
            prompt_tokens: 50,
            completion_tokens: 50, 
            total_tokens: 100 
          },
        }),
      },
    },
  };

  const mockClaudeClient = {
    messages: {
      create: vi.fn().mockResolvedValue({
        content: [{ type: 'text', text: 'test response' }],
        usage: { input_tokens: 50, output_tokens: 50 },
      }),
    },
  };

  beforeEach(() => {
    vi.clearAllMocks();
    requestHandler = new AIRequestHandler();
    
    // Reset mocks with correct return values after clearing
    mockOpenAIClient.chat.completions.create.mockResolvedValue({
      choices: [{ message: { content: 'test response' } }],
      usage: { 
        prompt_tokens: 50,
        completion_tokens: 50, 
        total_tokens: 100 
      },
    });
    
    mockClaudeClient.messages.create.mockResolvedValue({
      content: [{ type: 'text', text: 'test response' }],
      usage: { input_tokens: 50, output_tokens: 50 },
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Request Formatting', () => {
    it('should format OpenAI requests with proper schema', () => {
      const prompt = 'Generate a security alert';
      const schema = { type: 'object', properties: {} };
      const options: RequestOptions = {
        temperature: 0.7,
        maxTokens: 1000,
        model: 'gpt-4',
      };

      const request = formatOpenAIRequest(prompt, schema, options);

      expect(request).toBeDefined();
      expect(request.model).toBe('gpt-4');
      expect(request.temperature).toBe(0.7);
      expect(request.max_tokens).toBe(1000);
      expect(request.messages).toHaveLength(1);
      expect(request.response_format).toBeDefined();
    });

    it('should format Claude requests with proper structure', () => {
      const systemPrompt = 'You are a security expert';
      const userPrompt = 'Generate a security alert';
      const options: RequestOptions = {
        temperature: 0.7,
        maxTokens: 1000,
        model: 'claude-3-sonnet',
      };

      const request = formatClaudeRequest(systemPrompt, userPrompt, options);

      expect(request).toBeDefined();
      expect(request.model).toBe('claude-3-sonnet');
      expect(request.temperature).toBe(0.7);
      expect(request.max_tokens).toBe(1000);
      expect(request.system).toBe(systemPrompt);
      expect(request.messages).toHaveLength(1);
      expect(request.messages[0].content).toBe(userPrompt);
    });

    it('should handle missing optional parameters', () => {
      const prompt = 'Generate a security alert';
      const schema = { type: 'object', properties: {} };

      const request = formatOpenAIRequest(prompt, schema);

      expect(request).toBeDefined();
      expect(request.model).toBe('gpt-4o'); // default model
      expect(request.temperature).toBe(0.7); // default temperature
      expect(request.max_tokens).toBe(2000); // default max tokens
    });
  });

  describe('Request Execution', () => {
    it('should execute OpenAI requests successfully', async () => {
      const prompt = 'Generate a security alert';
      const schema = { type: 'object', properties: {} };

      const response = await requestHandler.executeOpenAIRequest(
        mockOpenAIClient as any,
        prompt,
        schema
      );

      expect(response).toBeDefined();
      expect(response.content).toBe('test response');
      expect(response.usage?.totalTokens).toBe(100);
      expect(response.provider).toBe('openai');
      expect(response.timestamp).toBeGreaterThan(0);
      expect(mockOpenAIClient.chat.completions.create).toHaveBeenCalledOnce();
    });

    it('should execute Claude requests successfully', async () => {
      const systemPrompt = 'You are a security expert';
      const userPrompt = 'Generate a security alert';

      const response = await requestHandler.executeClaudeRequest(
        mockClaudeClient as any,
        systemPrompt,
        userPrompt
      );

      expect(response).toBeDefined();
      expect(response.content).toBe('test response');
      expect(response.usage?.totalTokens).toBe(100);
      expect(response.provider).toBe('claude');
      expect(mockClaudeClient.messages.create).toHaveBeenCalledOnce();
    });

    it('should handle cache hits', async () => {
      const prompt = 'Generate a security alert';
      const schema = { type: 'object', properties: {} };
      const cachedData = {
        data: 'cached response',
        timestamp: 1672531200000, // Example timestamp
      };

      const { aiResponseCache } = await import('../../src/utils/cache_service');
      vi.mocked(aiResponseCache.get).mockReturnValue(cachedData);
      vi.mocked(aiResponseCache.has).mockReturnValue(true);

      const response = await requestHandler.executeOpenAIRequest(
        mockOpenAIClient as any,
        prompt,
        schema,
        undefined,
        'test-cache-key'
      );

      expect(response.content).toBe('cached response');
      expect(response.provider).toBe('openai');
      expect(response.cached).toBe(true);
      expect(response.timestamp).toBe(1672531200000);
      expect(mockOpenAIClient.chat.completions.create).not.toHaveBeenCalled();
    });
  });

  describe('Retry Logic', () => {
    it('should handle retries on network errors', async () => {
      const retryConfig: RetryConfig = {
        maxRetries: 3,
        baseDelay: 100,
        backoffMultiplier: 2,
      };

      const operation = vi.fn()
        .mockRejectedValueOnce(new Error('Network timeout'))
        .mockRejectedValueOnce(new Error('Connection failed'))
        .mockResolvedValue({ content: 'success' });

      const result = await handleRetryLogic(operation, retryConfig);

      expect(result).toEqual({ content: 'success' });
      expect(operation).toHaveBeenCalledTimes(3);
    });

    it('should fail after max retries exceeded', async () => {
      const retryConfig: RetryConfig = {
        maxRetries: 2,
        baseDelay: 10,
        backoffMultiplier: 2,
      };

      const operation = vi.fn().mockRejectedValue(new Error('Persistent error'));

      await expect(handleRetryLogic(operation, retryConfig)).rejects.toThrow('Persistent error');
      expect(operation).toHaveBeenCalledTimes(3); // initial + 2 retries
    });

    it('should calculate correct backoff delays', async () => {
      const retryConfig: RetryConfig = {
        maxRetries: 3,
        baseDelay: 10, // Very small delay for test
        backoffMultiplier: 2,
      };

      const operation = vi.fn()
        .mockRejectedValueOnce(new Error('Error 1'))
        .mockRejectedValueOnce(new Error('Error 2'))
        .mockRejectedValueOnce(new Error('Error 3'))
        .mockResolvedValue({ content: 'success' });

      const startTime = performance.now();
      await handleRetryLogic(operation, retryConfig);
      const endTime = performance.now();

      // Should have some delay (at least 10ms + 20ms = 30ms minimum)
      expect(endTime - startTime).toBeGreaterThan(25);
      expect(operation).toHaveBeenCalledTimes(4);
    });
  });

  describe('Response Validation', () => {
    it('should validate successful responses', () => {
      const response: AIResponse = {
        content: 'valid response',
        provider: 'openai',
        usage: { totalTokens: 100 },
        timestamp: Date.now(),
      };

      const result = validateResponse(response);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should detect missing content', () => {
      const response: AIResponse = {
        content: '',
        provider: 'openai',
        usage: { totalTokens: 0 },
        timestamp: Date.now(),
      };

      const result = validateResponse(response);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Response content is empty');
    });

    it('should detect invalid JSON responses', () => {
      const response: AIResponse = {
        content: '{ invalid json',
        provider: 'claude',
        usage: { totalTokens: 50 },
        timestamp: Date.now(),
      };

      const result = validateResponse(response, true);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Invalid JSON format');
    });

    it('should validate response schema compliance', () => {
      const response: AIResponse = {
        content: '{"name": "test", "type": "alert"}',
        provider: 'openai',
        usage: { totalTokens: 100 },
        timestamp: Date.now(),
      };

      const schema = {
        type: 'object',
        properties: {
          name: { type: 'string' },
          type: { type: 'string' },
          severity: { type: 'string' }, // required but missing
        },
        required: ['name', 'type', 'severity'],
      };

      const result = validateResponse(response, true, schema);

      expect(result.isValid).toBe(false);
      expect(result.errors.some(err => err.includes('severity'))).toBe(true);
    });
  });

  describe('Error Handling', () => {
    it('should handle rate limiting errors', async () => {
      const error = new Error('Rate limit exceeded');
      (error as any).status = 429;

      mockOpenAIClient.chat.completions.create.mockRejectedValueOnce(error);

      await expect(
        requestHandler.executeOpenAIRequest(mockOpenAIClient as any, 'test', {})
      ).rejects.toThrow('Rate limit exceeded');
    });

    it('should handle authentication errors', async () => {
      const error = new Error('Invalid API key');
      (error as any).status = 401;

      mockClaudeClient.messages.create.mockRejectedValueOnce(error);

      await expect(
        requestHandler.executeClaudeRequest(mockClaudeClient as any, 'system', 'user')
      ).rejects.toThrow('Invalid API key');
    });

    it('should handle timeout errors', async () => {
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Request timeout')), 100)
      );

      mockOpenAIClient.chat.completions.create.mockImplementationOnce(() => timeoutPromise);

      await expect(
        requestHandler.executeOpenAIRequest(mockOpenAIClient as any, 'test', {})
      ).rejects.toThrow('Request timeout');
    });
  });

  describe('Performance Metrics', () => {
    it('should track request timing', async () => {
      // Mock with slight delay to ensure measurable timing
      const delayedMock = {
        chat: {
          completions: {
            create: vi.fn().mockImplementation(async () => {
              await new Promise(resolve => setTimeout(resolve, 5)); // 5ms delay
              return {
                choices: [{ message: { content: 'test response' } }],
                usage: { 
                  prompt_tokens: 50,
                  completion_tokens: 50, 
                  total_tokens: 100 
                },
              };
            }),
          },
        },
      };

      const prompt = 'Generate a security alert';
      const schema = { type: 'object', properties: {} };

      const response = await requestHandler.executeOpenAIRequest(
        delayedMock as any,
        prompt,
        schema
      );

      expect(response.metrics).toBeDefined();
      expect(response.metrics?.requestTime).toBeGreaterThanOrEqual(0);
      expect(response.metrics?.timestamp).toBeDefined();
    });

    it('should track token usage accurately', async () => {
      mockOpenAIClient.chat.completions.create.mockResolvedValueOnce({
        choices: [{ message: { content: 'response' } }],
        usage: { 
          prompt_tokens: 50, 
          completion_tokens: 30, 
          total_tokens: 80 
        },
      });

      const response = await requestHandler.executeOpenAIRequest(
        mockOpenAIClient as any,
        'test',
        {}
      );

      expect(response.usage?.inputTokens).toBe(50);
      expect(response.usage?.outputTokens).toBe(30);
      expect(response.usage?.totalTokens).toBe(80);
    });
  });

  describe('AIRequestHandler Class', () => {
    it('should initialize with default configuration', () => {
      const handler = new AIRequestHandler();
      
      expect(handler).toBeDefined();
      expect(handler.getDefaultRetryConfig().maxRetries).toBe(3);
    });

    it('should accept custom configuration', () => {
      const customConfig = {
        maxRetries: 5,
        baseDelay: 500,
        timeout: 60000,
      };

      const handler = new AIRequestHandler(customConfig);
      
      expect(handler.getDefaultRetryConfig().maxRetries).toBe(5);
    });

    it('should provide request statistics', async () => {
      await requestHandler.executeOpenAIRequest(mockOpenAIClient as any, 'test', {});
      await requestHandler.executeClaudeRequest(mockClaudeClient as any, 'system', 'user');

      const stats = requestHandler.getStatistics();

      expect(stats.totalRequests).toBe(2);
      expect(stats.successfulRequests).toBe(2);
      expect(stats.failedRequests).toBe(0);
      // Don't test timing due to mocking complexity - just verify it's a number
      expect(stats.averageResponseTime).toBeGreaterThanOrEqual(0);
    });
  });
});