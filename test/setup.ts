import { vi } from 'vitest';
import path from 'path';

// Mock process.env for tests
process.env.NODE_ENV = 'test';

// Mock fs module for configuration reading
vi.mock('fs', () => ({
  readFileSync: vi.fn((filePath: string) => {
    if (filePath.includes('alertMappings.json')) {
      return JSON.stringify({
        properties: {
          'host.name': { type: 'keyword' },
          'user.name': { type: 'keyword' },
          'kibana.alert.severity': { type: 'keyword' },
          'kibana.alert.risk_score': { type: 'integer' },
        }
      });
    }
    if (filePath.includes('config.json')) {
      return JSON.stringify({
        elastic: { node: 'http://localhost:9200', apiKey: 'test-key' },
        kibana: { node: 'http://localhost:5601', apiKey: 'test-key' },
        useAI: false, // Disable AI in tests by default
        openaiApiKey: 'test-key',
      });
    }
    return '{}';
  }),
  existsSync: vi.fn(() => true),
  writeFileSync: vi.fn(),
}));

// Mock config path and getConfig
vi.mock('../src/get_config.js', () => ({
  getConfig: vi.fn(() => ({
    elastic: {
      node: 'http://localhost:9200',
      apiKey: 'test-api-key',
    },
    kibana: {
      node: 'http://localhost:5601',
      apiKey: 'test-kibana-key',
    },
    useAI: false, // Disable AI calls in tests
    openaiApiKey: 'test-openai-key',
    useClaudeAI: false,
    claudeApiKey: 'test-claude-key',
    claudeModel: 'claude-3-5-sonnet-20241022',
    useAzureOpenAI: false,
    azureOpenAIApiKey: '',
    azureOpenAIEndpoint: '',
    azureOpenAIDeployment: '',
    azureOpenAIApiVersion: '2023-05-15',
    mitre: {
      enableAttackChains: true,
      maxTechniquesPerAlert: 2,
      chainProbability: 0.15,
      maxChainLength: 3,
    },
  })),
  configPath: '/tmp/test-config.json',
}));

// Mock path resolution for mappings
const originalResolve = path.resolve;
vi.mocked(path).resolve = vi.fn((base: string, ...paths: string[]) => {
  const joined = paths.join('/');
  if (joined.includes('mappings')) {
    return '/mock/mappings/path';
  }
  return originalResolve(base, ...paths);
});

// Mock error handling utilities
vi.mock('../src/utils/error_handling.js', () => ({
  AIInitializationError: class extends Error {
    constructor(message: string, context?: any) {
      super(message);
      this.name = 'AIInitializationError';
    }
  },
  validateConfiguration: vi.fn(),
  withRetry: vi.fn((fn) => fn()),
  handleAIError: vi.fn(),
  safeJsonParse: vi.fn((str: string) => {
    try {
      return JSON.parse(str);
    } catch {
      return {};
    }
  }),
}));

// Mock validation service with proper validation logic
vi.mock('../src/utils/validation_service.js', () => ({
  validateAndSanitizeAlert: vi.fn((alert, hostName, userName, space, timestampConfig) => {
    const sanitized = { ...alert };
    
    // Sanitize XSS and dangerous content
    Object.keys(sanitized).forEach(key => {
      if (typeof sanitized[key] === 'string') {
        // Remove script tags and dangerous content
        sanitized[key] = sanitized[key]
          .replace(/<script[^>]*>.*?<\/script>/gi, '')
          .replace(/<iframe[^>]*>.*?<\/iframe>/gi, '')
          .replace(/javascript:/gi, '')
          .replace(/on\w+="[^"]*"/gi, '');
      }
    });
    
    // Remove dangerous fields
    ['__proto__', 'constructor', 'eval', 'function', 'script'].forEach(field => {
      delete sanitized[field];
    });
    
    // Enforce required fields
    sanitized['host.name'] = hostName;
    sanitized['user.name'] = userName;
    sanitized['kibana.space_ids'] = [space];
    sanitized['kibana.alert.uuid'] = sanitized['kibana.alert.uuid'] || 'mock-uuid';
    
    // Fix severity values
    if (!['low', 'medium', 'high', 'critical'].includes(sanitized['kibana.alert.severity'])) {
      sanitized['kibana.alert.severity'] = 'medium';
    }
    
    // Fix risk score
    if (typeof sanitized['kibana.alert.risk_score'] !== 'number' || 
        sanitized['kibana.alert.risk_score'] < 0 || 
        sanitized['kibana.alert.risk_score'] > 100) {
      sanitized['kibana.alert.risk_score'] = 50;
    }
    
    // Fix timestamps
    const timestamp = new Date().toISOString();
    sanitized['@timestamp'] = timestamp;
    sanitized['kibana.alert.start'] = timestamp;
    sanitized['kibana.alert.last_detected'] = timestamp;
    
    return sanitized;
  }),
  sanitizeJSONResponse: vi.fn((str: string) => {
    if (!str || typeof str !== 'string') return '{}';
    
    // Remove control characters
    str = str.replace(/[\x00-\x1F\x7F]/g, '');
    
    // Remove comments first
    str = str.replace(/\/\/.*$/gm, '');
    str = str.replace(/\/\*[\s\S]*?\*\//g, '');
    
    // Extract JSON from text
    const jsonMatch = str.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return jsonMatch[0];
    }
    
    return '{}';
  }),
  validateBatchResponse: vi.fn((responses: any[], expectedSize: number) => {
    console.log(`Expected ${expectedSize} alerts, got ${responses?.length || 0}. Padding with defaults.`);
    if (!Array.isArray(responses)) {
      responses = responses ? [responses] : [];
    }
    
    // Pad or truncate to expected size
    if (responses.length < expectedSize) {
      while (responses.length < expectedSize) {
        responses.push({});
      }
    } else if (responses.length > expectedSize) {
      responses = responses.slice(0, expectedSize);
    }
    
    // Replace null/undefined with empty objects
    return responses.map(r => r || {});
  }),
}));

// Mock cache service
vi.mock('../src/utils/cache_service.js', () => ({
  aiResponseCache: {
    get: vi.fn(() => null),
    set: vi.fn(),
  },
  generateAlertCacheKey: vi.fn(() => 'mock-cache-key'),
  generateEventCacheKey: vi.fn(() => 'mock-event-cache-key'),
  generateMitreCacheKey: vi.fn(() => 'mock-mitre-cache-key'),
  startCacheMaintenance: vi.fn(),
  stopCacheMaintenance: vi.fn(),
}));

// Mock timestamp utils
vi.mock('../src/utils/timestamp_utils.js', () => ({
  generateTimestamp: vi.fn(() => new Date().toISOString()),
}));

// Mock MITRE attack service
vi.mock('../src/utils/mitre_attack_service.js', () => ({
  loadMitreData: vi.fn(() => ({
    tactics: {
      'TA0001': { name: 'Initial Access' },
      'TA0002': { name: 'Execution' },
    },
    techniques: {
      'T1566': { name: 'Phishing', tactics: ['TA0001'] },
      'T1059': { name: 'Command and Scripting Interpreter', tactics: ['TA0002'] },
    },
  })),
  generateAttackChain: vi.fn(() => null),
  selectMitreTechniques: vi.fn(() => [
    { tactic: 'TA0001', technique: 'T1566' },
  ]),
  createMitreContext: vi.fn(() => 'Mock MITRE context'),
  generateMitreFields: vi.fn(() => ({
    'threat.technique.id': ['T1566'],
    'threat.technique.name': ['Phishing'],
  })),
  getTechniquesForTactic: vi.fn(() => ['T1566.001', 'T1566.002']),
}));

// Global test utilities
global.testUtils = {
  createMockAlert: () => ({
    'kibana.alert.uuid': 'test-uuid',
    'host.name': 'test-host',
    'user.name': 'test-user',
    '@timestamp': new Date().toISOString(),
    'kibana.alert.severity': 'medium',
    'kibana.alert.risk_score': 50,
  }),
  createMockOpenAIResponse: (content: string) => ({
    choices: [
      {
        message: {
          content,
        },
      },
    ],
  }),
  createMockClaudeResponse: (content: string) => ({
    content: [
      {
        type: 'text' as const,
        text: content,
      },
    ],
  }),
};

declare global {
  var testUtils: {
    createMockAlert: () => any;
    createMockOpenAIResponse: (content: string) => any;
    createMockClaudeResponse: (content: string) => any;
  };
}