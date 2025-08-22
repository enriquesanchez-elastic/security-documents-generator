/**
 * Centralized mocks for external dependencies and services
 */

import { vi } from 'vitest';

// Configuration mocks
export const mockConfig = vi.fn(() => ({
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
}));

// Faker.js controlled seeding
export const seedFaker = () => {
  // Use consistent seed for deterministic tests
  const { faker } = require('@faker-js/faker');
  faker.seed(12345);
  return faker;
};

// Elasticsearch Client Mock
export const createMockElasticsearchClient = () => {
  return {
    indices: {
      create: vi.fn().mockResolvedValue({ acknowledged: true }),
      delete: vi.fn().mockResolvedValue({ acknowledged: true }),
      exists: vi.fn().mockResolvedValue(true),
      putMapping: vi.fn().mockResolvedValue({ acknowledged: true }),
      getMapping: vi.fn().mockResolvedValue({}),
    },
    bulk: vi.fn().mockResolvedValue({
      took: 5,
      errors: false,
      items: [
        {
          create: {
            _index: 'test-index',
            _id: '1',
            status: 201,
          },
        },
      ],
    }),
    search: vi.fn().mockResolvedValue({
      hits: {
        total: { value: 1 },
        hits: [
          {
            _source: {
              'kibana.alert.rule.name': 'Test Alert',
              '@timestamp': '2024-01-15T10:30:00.000Z',
            },
          },
        ],
      },
      took: 5,
      timed_out: false,
    }),
    info: vi.fn().mockResolvedValue({
      version: { number: '8.12.0' },
      cluster_name: 'test-cluster',
    }),
    cat: {
      count: vi.fn().mockResolvedValue([{ count: '1' }]),
    },
  };
};

// OpenAI Mock
export const createMockOpenAI = () => {
  return {
    chat: {
      completions: {
        create: vi.fn().mockResolvedValue({
          choices: [
            {
              message: {
                content: JSON.stringify({
                  alert_name: 'Suspicious PowerShell Activity',
                  description: 'Detected potentially malicious PowerShell execution',
                  severity: 'high',
                  confidence: 0.85,
                  event_action: 'process_creation',
                  process_name: 'powershell.exe',
                  command_line: 'powershell.exe -EncodedCommand ...',
                  user_name: 'admin',
                  host_name: 'workstation-01',
                }),
              },
            },
          ],
        }),
      },
    },
  };
};

// Claude/Anthropic Mock
export const createMockClaude = () => {
  return {
    messages: {
      create: vi.fn().mockResolvedValue({
        content: [
          {
            text: JSON.stringify({
              alert_name: 'Lateral Movement Detected',
              description: 'Suspicious network activity indicating lateral movement',
              severity: 'critical',
              confidence: 0.92,
              event_action: 'network_connection',
              source_ip: '192.168.1.100',
              destination_ip: '192.168.1.50',
              destination_port: 445,
              user_name: 'service_account',
              host_name: 'server-01',
            }),
          },
        ],
      }),
    },
  };
};

// File System Mocks
export const createMockFileSystem = () => {
  const mockFiles = new Map<string, string>();
  
  return {
    readFileSync: vi.fn((path: string) => {
      if (mockFiles.has(path)) {
        return mockFiles.get(path);
      }
      if (path.includes('config.json')) {
        return JSON.stringify(mockConfig());
      }
      if (path.includes('schema.json')) {
        return JSON.stringify({
          type: 'object',
          properties: {
            alert_name: { type: 'string' },
            description: { type: 'string' },
          },
        });
      }
      return '{}';
    }),
    writeFileSync: vi.fn((path: string, data: string) => {
      mockFiles.set(path, data);
    }),
    existsSync: vi.fn((path: string) => {
      return mockFiles.has(path) || path.includes('config.json');
    }),
    setMockFile: (path: string, content: string) => {
      mockFiles.set(path, content);
    },
    getMockFile: (path: string) => mockFiles.get(path),
    clearMockFiles: () => mockFiles.clear(),
  };
};

// HTTP Request Mocks (for Kibana API)
export const createMockAxios = () => {
  return {
    get: vi.fn().mockResolvedValue({
      status: 200,
      data: { version: { number: '8.12.0' } },
    }),
    post: vi.fn().mockResolvedValue({
      status: 200,
      data: { acknowledged: true },
    }),
    put: vi.fn().mockResolvedValue({
      status: 200,
      data: { acknowledged: true },
    }),
    delete: vi.fn().mockResolvedValue({
      status: 200,
      data: { acknowledged: true },
    }),
  };
};

// MITRE ATT&CK Data Mock
export const createMockMitreData = () => {
  return {
    techniques: [
      {
        id: 'T1055',
        name: 'Process Injection',
        tactics: ['defense-evasion', 'privilege-escalation'],
        description: 'Adversaries may inject code into processes...',
      },
      {
        id: 'T1059',
        name: 'Command and Scripting Interpreter',
        tactics: ['execution'],
        description: 'Adversaries may abuse command and script interpreters...',
      },
    ],
    tactics: [
      {
        id: 'TA0005',
        name: 'Defense Evasion',
        description: 'The adversary is trying to avoid being detected.',
      },
      {
        id: 'TA0002',
        name: 'Execution',
        description: 'The adversary is trying to run malicious code.',
      },
    ],
  };
};

// Theme Service Mock
export const createMockThemeService = () => {
  return {
    getThemedData: vi.fn().mockResolvedValue({
      usernames: ['luke.skywalker', 'darth.vader', 'obi.wan'],
      hostnames: ['tatooine', 'death-star', 'coruscant'],
      processNames: ['lightsaber.exe', 'force.dll', 'hyperdrive.exe'],
      domains: ['empire.com', 'rebel.org', 'jedi.net'],
    }),
    parseThemeConfig: vi.fn().mockReturnValue({
      theme: 'starwars',
      categories: ['characters', 'planets', 'technology'],
    }),
  };
};

// Cache Mock
export const createMockCache = () => {
  const cache = new Map();
  
  return {
    get: vi.fn((key: string) => {
      const item = cache.get(key);
      if (!item) return null;
      
      // Check expiration
      if (Date.now() - item.timestamp > 3600000) { // 1 hour TTL
        cache.delete(key);
        return null;
      }
      
      return item;
    }),
    set: vi.fn((key: string, value: any) => {
      cache.set(key, {
        data: value,
        timestamp: Date.now(),
      });
    }),
    has: vi.fn((key: string) => {
      const item = cache.get(key);
      return item && (Date.now() - item.timestamp <= 3600000);
    }),
    clear: vi.fn(() => cache.clear()),
    size: () => cache.size,
    _getCache: () => cache, // For testing purposes
  };
};

// ML Job Manager Mock
export const createMockMLJobManager = () => {
  return {
    createJob: vi.fn().mockResolvedValue({ acknowledged: true }),
    deleteJob: vi.fn().mockResolvedValue({ acknowledged: true }),
    startDatafeed: vi.fn().mockResolvedValue({ started: true }),
    stopDatafeed: vi.fn().mockResolvedValue({ stopped: true }),
    getJobStats: vi.fn().mockResolvedValue({
      jobs: [{
        job_id: 'test-job',
        state: 'opened',
        data_counts: {
          processed_record_count: 1000,
        },
      }],
    }),
  };
};

// Performance monitoring mock
export const createMockPerformanceMonitor = () => {
  return {
    mark: vi.fn(),
    measure: vi.fn().mockReturnValue({ duration: 100 }),
    now: vi.fn(() => Date.now()),
    getEntriesByType: vi.fn().mockReturnValue([]),
  };
};

// Export all mocks for easy import
export const mocks = {
  elasticsearch: createMockElasticsearchClient,
  openai: createMockOpenAI,
  claude: createMockClaude,
  filesystem: createMockFileSystem,
  axios: createMockAxios,
  mitre: createMockMitreData,
  theme: createMockThemeService,
  cache: createMockCache,
  mlJobManager: createMockMLJobManager,
  performance: createMockPerformanceMonitor,
};

export default mocks;