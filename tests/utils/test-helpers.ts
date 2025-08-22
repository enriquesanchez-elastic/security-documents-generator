/**
 * Test utilities and helper functions
 */

import { vi } from 'vitest';
import { faker } from '@faker-js/faker';

// Mock data factories
export class TestDataFactory {
  static createMockAlert(overrides = {}) {
    // Set deterministic seed for consistent tests
    faker.seed(12345);
    
    return {
      'kibana.alert.rule.name': 'Test Security Alert',
      'kibana.alert.rule.uuid': faker.string.uuid(),
      'kibana.alert.start': new Date().toISOString(),
      'kibana.alert.last_detected': new Date().toISOString(),
      'kibana.alert.status': 'active',
      'kibana.alert.severity': 'high',
      'kibana.space_ids': ['default'],
      'host.name': 'test-host.local',
      'user.name': 'test-user',
      'event.action': 'process_creation',
      'event.outcome': 'success',
      'process.pid': 1234,
      'process.name': 'test-process.exe',
      'source.ip': '192.168.1.100',
      'destination.ip': '192.168.1.200',
      '@timestamp': new Date().toISOString(),
      ...overrides,
    };
  }

  static createMockConfig(overrides = {}) {
    return {
      elastic: {
        node: 'http://localhost:9200',
        username: 'elastic',
        password: 'changeme',
        tls: {
          ca: null,
          rejectUnauthorized: false,
        },
      },
      kibana: {
        host: 'http://localhost:5601',
        username: 'elastic',
        password: 'changeme',
      },
      useAI: false,
      openaiApiKey: null,
      useAzureOpenAI: false,
      useClaudeAI: false,
      claudeApiKey: null,
      mitre: {
        enabled: false,
      },
      ...overrides,
    };
  }

  static createMockTimestampConfig(overrides = {}) {
    return {
      businessHours: true,
      startTime: '09:00',
      endTime: '17:00',
      timezone: 'UTC',
      weekendsOnly: false,
      dateRange: {
        start: new Date('2024-01-01'),
        end: new Date('2024-12-31'),
      },
      ...overrides,
    };
  }

  static createMockCacheValue(overrides = {}) {
    return {
      data: { test: 'data' },
      timestamp: Date.now(),
      ...overrides,
    };
  }

  static createMockMLJob(overrides = {}) {
    return {
      job_id: faker.string.alphanumeric(10),
      job_type: 'anomaly_detector',
      analysis_config: {
        bucket_span: '15m',
        detectors: [
          {
            function: 'high_count',
            by_field_name: 'user.name',
          },
        ],
      },
      data_description: {
        time_field: '@timestamp',
        time_format: 'epoch_ms',
      },
      ...overrides,
    };
  }
}

// Custom matchers
export const customMatchers = {
  toBeValidISODate: (received: string) => {
    const pass = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(received);
    if (pass) {
      return {
        message: () => `expected ${received} not to be a valid ISO date`,
        pass: true,
      };
    } else {
      return {
        message: () => `expected ${received} to be a valid ISO date`,
        pass: false,
      };
    }
  },

  toBeValidAlert: (received: any) => {
    const requiredFields = [
      'kibana.alert.rule.name',
      'host.name',
      'user.name',
      '@timestamp',
    ];
    
    const missingFields = requiredFields.filter(field => !(field in received));
    const pass = missingFields.length === 0;

    if (pass) {
      return {
        message: () => `expected alert to be missing required fields`,
        pass: true,
      };
    } else {
      return {
        message: () => `expected alert to have required fields, missing: ${missingFields.join(', ')}`,
        pass: false,
      };
    }
  },

  toBeValidECSCompliant: (received: any) => {
    // Basic ECS compliance check
    const hasTimestamp = '@timestamp' in received;
    const hasValidTimestamp = hasTimestamp && typeof received['@timestamp'] === 'string';
    const pass = hasValidTimestamp;

    return {
      message: () => pass ? 
        `expected object not to be ECS compliant` : 
        `expected object to be ECS compliant (missing or invalid @timestamp)`,
      pass,
    };
  },
};

// Mock implementations
export class MockElasticsearchClient {
  indices = {
    create: vi.fn().mockResolvedValue({ acknowledged: true }),
    delete: vi.fn().mockResolvedValue({ acknowledged: true }),
    exists: vi.fn().mockResolvedValue(true),
    putMapping: vi.fn().mockResolvedValue({ acknowledged: true }),
    getMapping: vi.fn().mockResolvedValue({}),
  };

  bulk = vi.fn().mockResolvedValue({
    took: 5,
    errors: false,
    items: [],
  });

  search = vi.fn().mockResolvedValue({
    hits: {
      total: { value: 0 },
      hits: [],
    },
    took: 5,
    timed_out: false,
  });

  info = vi.fn().mockResolvedValue({
    version: { number: '8.12.0' },
    cluster_name: 'test-cluster',
  });

  cat = {
    count: vi.fn().mockResolvedValue([{ count: '0' }]),
  };
}

export class MockAIService {
  generateAlert = vi.fn().mockResolvedValue(TestDataFactory.createMockAlert());
  
  generateBatchAlerts = vi.fn().mockResolvedValue({
    alerts: [TestDataFactory.createMockAlert()],
    errors: [],
  });

  generateMITREAlert = vi.fn().mockResolvedValue({
    ...TestDataFactory.createMockAlert(),
    'threat.technique.id': ['T1055'],
    'threat.technique.name': ['Process Injection'],
    'threat.tactic.id': ['TA0005'],
    'threat.tactic.name': ['Defense Evasion'],
  });
}

// Test utilities
export const waitFor = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export const expectToThrow = async (fn: () => Promise<any>, errorMessage?: string) => {
  try {
    await fn();
    throw new Error('Expected function to throw');
  } catch (error) {
    if (errorMessage && !error.message.includes(errorMessage)) {
      throw new Error(`Expected error message to contain "${errorMessage}", got "${error.message}"`);
    }
    return error;
  }
};

export const createSpyConsole = () => {
  const originalConsole = console;
  const spyConsole = {
    log: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
    debug: vi.fn(),
  };
  
  beforeEach(() => {
    global.console = { ...originalConsole, ...spyConsole };
  });

  afterEach(() => {
    global.console = originalConsole;
  });

  return spyConsole;
};

// Performance testing utilities
export const measureExecutionTime = async <T>(fn: () => Promise<T>): Promise<{ result: T; executionTime: number }> => {
  const start = performance.now();
  const result = await fn();
  const executionTime = performance.now() - start;
  return { result, executionTime };
};

export const expectPerformance = (executionTime: number, maxTime: number) => {
  if (executionTime > maxTime) {
    throw new Error(`Execution time ${executionTime}ms exceeded maximum ${maxTime}ms`);
  }
};

// Memory testing utilities
export const getMemoryUsage = () => {
  if (typeof process !== 'undefined' && process.memoryUsage) {
    return process.memoryUsage();
  }
  return null;
};

export const expectMemoryUsage = (usage: any, maxHeapUsed: number) => {
  if (usage && usage.heapUsed > maxHeapUsed) {
    throw new Error(`Heap usage ${usage.heapUsed} exceeded maximum ${maxHeapUsed}`);
  }
};