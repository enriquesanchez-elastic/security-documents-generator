import { vi } from 'vitest';

// Mock Elasticsearch client
export const mockElasticsearchClient = {
  search: vi.fn(),
  index: vi.fn(),
  bulk: vi.fn(),
  indices: {
    create: vi.fn(),
    exists: vi.fn(),
    putMapping: vi.fn(),
    delete: vi.fn(),
  },
  deleteByQuery: vi.fn(),
  count: vi.fn(),
};

// Mock the Elasticsearch module
vi.mock('@elastic/elasticsearch', () => ({
  Client: vi.fn(() => mockElasticsearchClient),
}));

// Helper functions for setting up mock responses
export const mockElasticsearchSuccess = (response: any) => {
  mockElasticsearchClient.search.mockResolvedValue(response);
  mockElasticsearchClient.index.mockResolvedValue({ _id: 'mock-id', result: 'created' });
  mockElasticsearchClient.bulk.mockResolvedValue({ errors: false, items: [] });
  mockElasticsearchClient.indices.exists.mockResolvedValue(true);
  mockElasticsearchClient.indices.create.mockResolvedValue({ acknowledged: true });
  mockElasticsearchClient.deleteByQuery.mockResolvedValue({ deleted: 0 });
};

export const mockElasticsearchError = (error: Error) => {
  mockElasticsearchClient.search.mockRejectedValue(error);
  mockElasticsearchClient.index.mockRejectedValue(error);
  mockElasticsearchClient.bulk.mockRejectedValue(error);
};

export const resetElasticsearchMocks = () => {
  vi.clearAllMocks();
  Object.values(mockElasticsearchClient).forEach(mock => {
    if (typeof mock === 'function') {
      mock.mockReset();
    }
  });
  Object.values(mockElasticsearchClient.indices).forEach(mock => {
    if (typeof mock === 'function') {
      mock.mockReset();
    }
  });
};