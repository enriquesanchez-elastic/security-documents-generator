/**
 * Tests for AI Client Manager
 * 
 * TDD Phase: RED - These tests will fail initially until we extract the module
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock the configuration
vi.mock('../../src/get_config', () => ({
  getConfig: vi.fn(() => ({
    useAI: true,
    openaiApiKey: 'sk-test-openai-key-12345678901234567890',
    claudeApiKey: 'claude-api-key-test-1234567890',
    useAzureOpenAI: false,
    useClaudeAI: false,
  })),
}));

// Mock OpenAI
vi.mock('openai', () => ({
  OpenAI: vi.fn().mockImplementation(() => ({
    chat: {
      completions: {
        create: vi.fn().mockResolvedValue({
          choices: [{ message: { content: 'test response' } }]
        })
      }
    }
  }))
}));

// Mock Anthropic
vi.mock('@anthropic-ai/sdk', () => ({
  default: vi.fn().mockImplementation(() => ({
    messages: {
      create: vi.fn().mockResolvedValue({
        content: [{ text: 'test response' }]
      })
    }
  }))
}));

import {
  AIClientManager,
  initializeAIClients,
  getOpenAIClient,
  getClaudeClient,
  switchProvider,
  validateClientConfiguration,
} from '../../src/utils/ai_client_manager';

describe('AI Client Manager - TDD Red Phase', () => {
  let clientManager: AIClientManager;

  beforeEach(() => {
    vi.clearAllMocks();
    // These will fail until we create the actual implementation
    clientManager = new AIClientManager();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Client Initialization', () => {
    it('should initialize OpenAI client with valid API key', () => {
      // Use a valid OpenAI API key format for testing
      const client = clientManager.initializeOpenAI('sk-test-api-key-12345678901234567890');
      
      expect(client).toBeDefined();
      expect(clientManager.getOpenAIClient()).toBe(client);
    });

    it('should initialize Claude client with valid API key', () => {
      // This test will fail initially
      const client = clientManager.initializeClaude('claude-api-key-test-1234567890');
      
      expect(client).toBeDefined();
      expect(clientManager.getClaudeClient()).toBe(client);
    });

    it('should throw error for missing OpenAI API key', () => {
      // Test error handling
      expect(() => {
        clientManager.initializeOpenAI('');
      }).toThrow('OpenAI API key is required');
    });

    it('should throw error for missing Claude API key', () => {
      // Test error handling  
      expect(() => {
        clientManager.initializeClaude('');
      }).toThrow('Claude API key is required');
    });

    it('should handle invalid API key format', () => {
      expect(() => {
        clientManager.initializeOpenAI('invalid-key');
      }).toThrow('Invalid OpenAI API key format');
    });
  });

  describe('Configuration Validation', () => {
    it('should validate configuration before initialization', () => {
      const config = {
        useAI: true,
        openaiApiKey: 'test-key',
        claudeApiKey: 'test-key',
        useAzureOpenAI: false,
        useClaudeAI: false,
      };

      // This will fail until we implement validation
      const result = validateClientConfiguration(config);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should detect missing API keys in configuration', () => {
      const config = {
        useAI: true,
        openaiApiKey: '',
        claudeApiKey: '',
        useAzureOpenAI: false,
        useClaudeAI: false,
      };

      const result = validateClientConfiguration(config);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('OpenAI API key is required when useAI is true');
    });

    it('should validate Azure OpenAI specific configuration', () => {
      const config = {
        useAI: true,
        useAzureOpenAI: true,
        azureOpenAIEndpoint: '',
        azureOpenAIApiKey: 'test-key',
        azureOpenAIApiVersion: '2023-05-15',
      };

      const result = validateClientConfiguration(config);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Azure OpenAI endpoint is required');
    });
  });

  describe('Provider Management', () => {
    it('should switch between OpenAI and Claude providers', () => {
      // Initialize both clients
      clientManager.initializeOpenAI('sk-test-openai-key-12345678901234567890');
      clientManager.initializeClaude('claude-api-key-test-1234567890');

      // Switch to OpenAI
      clientManager.switchProvider('openai');
      expect(clientManager.getCurrentProvider()).toBe('openai');
      expect(clientManager.getActiveClient()).toBe(clientManager.getOpenAIClient());

      // Switch to Claude
      clientManager.switchProvider('claude');
      expect(clientManager.getCurrentProvider()).toBe('claude');
      expect(clientManager.getActiveClient()).toBe(clientManager.getClaudeClient());
    });

    it('should throw error when switching to uninitialized provider', () => {
      // Only initialize OpenAI
      clientManager.initializeOpenAI('sk-test-openai-key-12345678901234567890');

      // Try to switch to uninitialized Claude
      expect(() => {
        clientManager.switchProvider('claude');
      }).toThrow('Claude client is not initialized');
    });

    it('should return current active provider', () => {
      clientManager.initializeOpenAI('sk-test-openai-key-12345678901234567890');
      clientManager.switchProvider('openai');
      
      expect(clientManager.getCurrentProvider()).toBe('openai');
      expect(clientManager.isProviderAvailable('openai')).toBe(true);
      expect(clientManager.isProviderAvailable('claude')).toBe(false);
    });
  });

  describe('Client Lifecycle Management', () => {
    it('should handle client cleanup on shutdown', () => {
      clientManager.initializeOpenAI('sk-test-openai-key-12345678901234567890');
      clientManager.initializeClaude('claude-api-key-test-1234567890');

      // Cleanup should reset clients
      clientManager.cleanup();
      
      expect(clientManager.getOpenAIClient()).toBeNull();
      expect(clientManager.getClaudeClient()).toBeNull();
      expect(clientManager.getCurrentProvider()).toBeNull();
    });

    it('should reinitialize clients after cleanup', () => {
      // Initialize, cleanup, then reinitialize
      clientManager.initializeOpenAI('sk-test-openai-key-12345678901234567890');
      clientManager.cleanup();
      
      expect(clientManager.getOpenAIClient()).toBeNull();
      
      // Reinitialize should work
      clientManager.initializeOpenAI('sk-test-openai-key-12345678901234567890');
      expect(clientManager.getOpenAIClient()).toBeDefined();
    });
  });

  describe('Error Handling', () => {
    it('should handle network errors during client creation', async () => {
      // Mock network error
      const { OpenAI } = await import('openai');
      const MockedOpenAI = vi.mocked(OpenAI);
      MockedOpenAI.mockImplementationOnce(() => {
        throw new Error('Network error');
      });

      expect(() => {
        clientManager.initializeOpenAI('sk-test-api-key-12345678901234567890');
      }).toThrow('Failed to initialize OpenAI client: Network error');
    });

    it('should handle authentication errors', async () => {
      // Mock auth error
      const { OpenAI } = await import('openai');
      const MockedOpenAI = vi.mocked(OpenAI);
      MockedOpenAI.mockImplementationOnce(() => {
        throw new Error('Authentication failed');
      });

      expect(() => {
        clientManager.initializeOpenAI('sk-test-api-key-12345678901234567890');
      }).toThrow('Failed to initialize OpenAI client: Authentication failed');
    });
  });
});

describe('AI Client Manager - Static Functions', () => {
  describe('initializeAIClients', () => {
    it('should initialize clients based on configuration', () => {
      // This static function should read config and initialize appropriate clients
      const result = initializeAIClients();
      
      expect(result).toBeDefined();
      expect(result.success).toBe(true);
      expect(result.activeProvider).toBe('openai'); // Based on mocked config
    });
  });

  describe('Client Getters', () => {
    it('should return initialized OpenAI client', () => {
      initializeAIClients();
      const client = getOpenAIClient();
      
      expect(client).toBeDefined();
    });

    it('should return null for uninitialized Claude client', () => {
      const client = getClaudeClient();
      
      expect(client).toBeNull();
    });
  });

  describe('Provider Switching', () => {
    it('should switch active provider globally', () => {
      initializeAIClients();
      
      const result = switchProvider('openai');
      expect(result.success).toBe(true);
      expect(result.activeProvider).toBe('openai');
    });

    it('should handle switching to unavailable provider', () => {
      const result = switchProvider('claude');
      expect(result.success).toBe(false);
      expect(result.error).toContain('Claude client is not available');
    });
  });
});