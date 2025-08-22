/**
 * Global test setup for Vitest
 * Configure mocks, test environment, and global utilities
 */

import { vi, beforeEach, afterEach } from 'vitest';

// Mock console methods to reduce noise in tests
global.console = {
  ...console,
  log: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
  info: vi.fn(),
  debug: vi.fn(),
};

// Mock external dependencies globally
vi.mock('@elastic/elasticsearch', () => ({
  Client: vi.fn(() => ({
    indices: {
      create: vi.fn().mockResolvedValue({ acknowledged: true }),
      delete: vi.fn().mockResolvedValue({ acknowledged: true }),
      exists: vi.fn().mockResolvedValue(true),
      putMapping: vi.fn().mockResolvedValue({ acknowledged: true }),
    },
    bulk: vi.fn().mockResolvedValue({ 
      took: 5,
      errors: false,
      items: []
    }),
    search: vi.fn().mockResolvedValue({
      hits: { total: { value: 0 }, hits: [] }
    }),
    info: vi.fn().mockResolvedValue({
      version: { number: '8.12.0' }
    }),
  })),
}));

vi.mock('openai', () => ({
  OpenAI: vi.fn(() => ({
    chat: {
      completions: {
        create: vi.fn().mockResolvedValue({
          choices: [{ 
            message: { 
              content: JSON.stringify({ 
                alert_name: 'Test Alert',
                description: 'Test Description'
              })
            }
          }]
        })
      }
    }
  }))
}));

vi.mock('@anthropic-ai/sdk', () => ({
  default: vi.fn(() => ({
    messages: {
      create: vi.fn().mockResolvedValue({
        content: [{ 
          text: JSON.stringify({ 
            alert_name: 'Test Alert',
            description: 'Test Description'
          })
        }]
      })
    }
  }))
}));

// Mock filesystem operations
vi.mock('fs', async () => {
  const actual = await vi.importActual('fs');
  return {
    ...actual,
    readFileSync: vi.fn().mockReturnValue('{}'),
    writeFileSync: vi.fn(),
    existsSync: vi.fn().mockReturnValue(true),
  };
});

// Setup and teardown for each test
beforeEach(() => {
  // Reset all mocks before each test
  vi.clearAllMocks();
  
  // Mock Date.now() for consistent timestamps
  const mockDate = new Date('2024-01-15T10:30:00.000Z');
  vi.setSystemTime(mockDate);
});

afterEach(() => {
  // Clean up after each test
  vi.restoreAllMocks();
  vi.useRealTimers();
});

// Global test utilities
export const createMockAlert = (overrides = {}) => ({
  'kibana.alert.rule.name': 'Test Alert',
  'kibana.alert.start': '2024-01-15T10:30:00.000Z',
  'host.name': 'test-host',
  'user.name': 'test-user',
  'event.action': 'test-action',
  'event.outcome': 'success',
  '@timestamp': '2024-01-15T10:30:00.000Z',
  ...overrides,
});

export const createMockConfig = (overrides = {}) => ({
  elastic: {
    node: 'http://localhost:9200',
    username: 'elastic',
    password: 'changeme',
  },
  kibana: {
    host: 'http://localhost:5601',
    username: 'elastic',
    password: 'changeme',
  },
  useAI: false,
  ...overrides,
});

export const mockElasticsearchResponse = (hits = [], total = 0) => ({
  hits: {
    total: { value: total },
    hits: hits.map(hit => ({ _source: hit })),
  },
  took: 5,
  timed_out: false,
});