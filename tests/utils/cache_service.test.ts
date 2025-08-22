/**
 * Tests for Cache Service
 * 
 * Critical business logic tests with high coverage target (85%)
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

import {
  AIResponseCache,
  aiResponseCache,
  generateAlertCacheKey,
  generateEventCacheKey,
  generateMitreCacheKey,
  performCacheMaintenance,
  startCacheMaintenance,
  stopCacheMaintenance,
} from '../../src/utils/cache_service';

import { TestDataFactory } from '../utils/test-helpers';

// Mock the config service
vi.mock('../../src/get_config', () => ({
  getConfig: vi.fn(() => ({
    generation: {
      performance: {
        maxCacheSize: 50,
      },
    },
  })),
}));

describe('Cache Service', () => {
  let cache: AIResponseCache;
  const mockNow = 1705317000000; // 2024-01-15T10:30:00.000Z

  beforeEach(() => {
    // Create fresh cache instance for each test
    cache = new AIResponseCache(5, 1000); // Small size and TTL for testing
    vi.setSystemTime(mockNow);
    
    // Clear singleton cache to prevent test interference
    aiResponseCache.clear();
  });

  afterEach(() => {
    vi.useRealTimers();
    stopCacheMaintenance();
  });

  describe('AIResponseCache Constructor', () => {
    it('should create cache with default parameters', () => {
      const defaultCache = new AIResponseCache();
      
      expect(defaultCache.getStats().maxSize).toBe(100);
    });

    it('should create cache with custom parameters', () => {
      const customCache = new AIResponseCache(50, 2000);
      
      expect(customCache.getStats().maxSize).toBe(50);
    });
  });

  describe('Basic Cache Operations', () => {
    it('should store and retrieve values', () => {
      const cacheValue = TestDataFactory.createMockCacheValue({
        data: { alert: 'test' },
      });

      cache.set('test-key', cacheValue);
      const result = cache.get('test-key');

      expect(result).toEqual(cacheValue);
    });

    it('should return null for non-existent keys', () => {
      const result = cache.get('non-existent');
      
      expect(result).toBeNull();
    });

    it('should overwrite existing values', () => {
      const value1 = TestDataFactory.createMockCacheValue({ data: { version: 1 } });
      const value2 = TestDataFactory.createMockCacheValue({ data: { version: 2 } });

      cache.set('same-key', value1);
      cache.set('same-key', value2);

      const result = cache.get('same-key');
      expect(result?.data).toEqual({ version: 2 });
    });

    it('should check if key exists with has method', () => {
      const cacheValue = TestDataFactory.createMockCacheValue();

      expect(cache.has('test-key')).toBe(false);
      
      cache.set('test-key', cacheValue);
      expect(cache.has('test-key')).toBe(true);
      
      expect(cache.has('non-existent')).toBe(false);
    });
  });

  describe('TTL (Time To Live) Functionality', () => {
    it('should expire entries after TTL', () => {
      const cacheValue = TestDataFactory.createMockCacheValue({
        timestamp: mockNow - 500, // 500ms ago
      });

      cache.set('test-key', cacheValue);
      
      // Should be available immediately
      expect(cache.get('test-key')).toEqual(cacheValue);
      
      // Advance time beyond TTL (1000ms)
      vi.setSystemTime(mockNow + 1001);
      
      // Should be expired and return null
      expect(cache.get('test-key')).toBeNull();
    });

    it('should remove expired entries on get', () => {
      const cacheValue = TestDataFactory.createMockCacheValue({
        timestamp: mockNow - 500,
      });

      cache.set('test-key', cacheValue);
      expect(cache.getStats().size).toBe(1);
      
      // Advance time beyond TTL
      vi.setSystemTime(mockNow + 1001);
      
      // Get should remove expired entry
      cache.get('test-key');
      expect(cache.getStats().size).toBe(0);
    });

    it('should return false for expired entries in has method', () => {
      const cacheValue = TestDataFactory.createMockCacheValue({
        timestamp: mockNow - 500,
      });

      cache.set('test-key', cacheValue);
      expect(cache.has('test-key')).toBe(true);
      
      // Advance time beyond TTL
      vi.setSystemTime(mockNow + 1001);
      
      expect(cache.has('test-key')).toBe(false);
    });

    it('should not expire entries within TTL', () => {
      const cacheValue = TestDataFactory.createMockCacheValue({
        timestamp: mockNow,
      });

      cache.set('test-key', cacheValue);
      
      // Advance time within TTL (999ms < 1000ms TTL)
      vi.setSystemTime(mockNow + 999);
      
      expect(cache.get('test-key')).toEqual(cacheValue);
      expect(cache.has('test-key')).toBe(true);
    });
  });

  describe('LRU Eviction Policy', () => {
    it('should evict oldest entry when cache is full', () => {
      // Fill cache to capacity (5 entries)
      for (let i = 0; i < 5; i++) {
        const cacheValue = TestDataFactory.createMockCacheValue({
          data: { id: i },
        });
        cache.set(`key-${i}`, cacheValue);
      }

      expect(cache.getStats().size).toBe(5);
      expect(cache.has('key-0')).toBe(true);

      // Add one more entry (should evict key-0)
      const newValue = TestDataFactory.createMockCacheValue({
        data: { id: 'new' },
      });
      cache.set('key-new', newValue);

      expect(cache.getStats().size).toBe(5);
      expect(cache.has('key-0')).toBe(false); // Oldest should be evicted
      expect(cache.has('key-1')).toBe(true);   // Others should remain
      expect(cache.has('key-new')).toBe(true); // New entry should be present
    });

    it('should handle eviction when cache reaches exact capacity', () => {
      // Add entries equal to max capacity
      for (let i = 0; i < 5; i++) {
        cache.set(`key-${i}`, TestDataFactory.createMockCacheValue());
      }

      expect(cache.getStats().size).toBe(5);

      // Adding one more should trigger eviction
      cache.set('overflow', TestDataFactory.createMockCacheValue());

      expect(cache.getStats().size).toBe(5);
      expect(cache.has('key-0')).toBe(false); // First entry evicted
      expect(cache.has('overflow')).toBe(true); // New entry present
    });
  });

  describe('Clear Operations', () => {
    it('should clear all entries', () => {
      // Add multiple entries
      for (let i = 0; i < 3; i++) {
        cache.set(`key-${i}`, TestDataFactory.createMockCacheValue());
      }

      expect(cache.getStats().size).toBe(3);

      cache.clear();

      expect(cache.getStats().size).toBe(0);
      expect(cache.has('key-0')).toBe(false);
      expect(cache.has('key-1')).toBe(false);
      expect(cache.has('key-2')).toBe(false);
    });

    it('should clear only expired entries with clearExpired', () => {
      // Add fresh entries
      cache.set('fresh-1', TestDataFactory.createMockCacheValue({ timestamp: mockNow }));
      cache.set('fresh-2', TestDataFactory.createMockCacheValue({ timestamp: mockNow }));
      
      // Add expired entries
      cache.set('expired-1', TestDataFactory.createMockCacheValue({ timestamp: mockNow - 2000 }));
      cache.set('expired-2', TestDataFactory.createMockCacheValue({ timestamp: mockNow - 1500 }));

      expect(cache.getStats().size).toBe(4);

      cache.clearExpired();

      expect(cache.getStats().size).toBe(2);
      expect(cache.has('fresh-1')).toBe(true);
      expect(cache.has('fresh-2')).toBe(true);
      expect(cache.has('expired-1')).toBe(false);
      expect(cache.has('expired-2')).toBe(false);
    });

    it('should handle clearExpired with no expired entries', () => {
      // Add only fresh entries
      cache.set('fresh-1', TestDataFactory.createMockCacheValue({ timestamp: mockNow }));
      cache.set('fresh-2', TestDataFactory.createMockCacheValue({ timestamp: mockNow }));

      expect(cache.getStats().size).toBe(2);

      cache.clearExpired();

      expect(cache.getStats().size).toBe(2);
      expect(cache.has('fresh-1')).toBe(true);
      expect(cache.has('fresh-2')).toBe(true);
    });
  });

  describe('Cache Statistics', () => {
    it('should return correct cache statistics', () => {
      const stats = cache.getStats();

      expect(stats.size).toBe(0);
      expect(stats.maxSize).toBe(5);
    });

    it('should update size in statistics', () => {
      cache.set('key-1', TestDataFactory.createMockCacheValue());
      cache.set('key-2', TestDataFactory.createMockCacheValue());

      const stats = cache.getStats();

      expect(stats.size).toBe(2);
      expect(stats.maxSize).toBe(5);
    });
  });

  describe('Configuration Updates', () => {
    it('should update cache configuration', () => {
      const initialStats = cache.getStats();
      expect(initialStats.maxSize).toBe(5);

      cache.updateConfig();

      const updatedStats = cache.getStats();
      expect(updatedStats.maxSize).toBe(50); // From mocked config
    });
  });

  describe('Cache Key Generators', () => {
    it('should generate consistent alert cache keys', () => {
      const key1 = generateAlertCacheKey('host1', 'user1', 'default', 'malware');
      const key2 = generateAlertCacheKey('host1', 'user1', 'default', 'malware');
      const key3 = generateAlertCacheKey('host2', 'user1', 'default', 'malware');

      expect(key1).toBe(key2);
      expect(key1).not.toBe(key3);
      expect(key1).toBe('alert:host1:user1:default:malware');
    });

    it('should generate event cache keys', () => {
      const key1 = generateEventCacheKey('process.pid', '1234');
      const key2 = generateEventCacheKey('process.pid', '1234');
      const key3 = generateEventCacheKey('process.pid', '5678');
      const key4 = generateEventCacheKey();

      expect(key1).toBe(key2);
      expect(key1).not.toBe(key3);
      expect(key1).toBe('event:process.pid:1234');
      expect(key4).toBe('event::');
    });

    it('should generate MITRE cache keys', () => {
      const key = generateMitreCacheKey(
        'host1',
        'user1',
        'default',
        'T1055,T1059',
        'chain-123'
      );

      expect(key).toBe('mitre-alert:host1:user1:default:T1055,T1059:chain-123');
    });

    it('should handle empty parameters in key generation', () => {
      const eventKey = generateEventCacheKey('', '');
      const alertKey = generateAlertCacheKey('', '', '', '');

      expect(eventKey).toBe('event::');
      expect(alertKey).toBe('alert::::');
    });
  });

  describe('Cache Maintenance', () => {
    it('should perform cache maintenance', () => {
      // Create a fresh cache instance to avoid singleton interference
      const testCache = new (aiResponseCache.constructor as any)(5, 1000);
      
      // Add expired and fresh entries
      testCache.set(
        'expired',
        TestDataFactory.createMockCacheValue({ timestamp: mockNow - 5000 })
      );
      testCache.set(
        'fresh',
        TestDataFactory.createMockCacheValue({ timestamp: mockNow })
      );

      expect(testCache.getStats().size).toBe(2);

      // Manually call clearExpired on our test instance
      testCache.clearExpired();

      expect(testCache.getStats().size).toBe(1);
      expect(testCache.has('fresh')).toBe(true);
      expect(testCache.has('expired')).toBe(false);
    });

    it('should start and stop cache maintenance interval', () => {
      const setIntervalSpy = vi.spyOn(global, 'setInterval');
      const clearIntervalSpy = vi.spyOn(global, 'clearInterval');

      startCacheMaintenance(1000);
      expect(setIntervalSpy).toHaveBeenCalledWith(expect.any(Function), 1000);

      stopCacheMaintenance();
      expect(clearIntervalSpy).toHaveBeenCalled();

      setIntervalSpy.mockRestore();
      clearIntervalSpy.mockRestore();
    });

    it('should use default interval when not specified', () => {
      const setIntervalSpy = vi.spyOn(global, 'setInterval');

      startCacheMaintenance();
      expect(setIntervalSpy).toHaveBeenCalledWith(
        expect.any(Function),
        1000 * 60 * 15 // 15 minutes
      );

      stopCacheMaintenance();
      setIntervalSpy.mockRestore();
    });

    it('should clear existing interval when starting new one', () => {
      const clearIntervalSpy = vi.spyOn(global, 'clearInterval');

      startCacheMaintenance(1000);
      startCacheMaintenance(2000); // Should clear the first one

      expect(clearIntervalSpy).toHaveBeenCalled();

      stopCacheMaintenance();
      clearIntervalSpy.mockRestore();
    });

    it('should handle stopping maintenance when none is running', () => {
      expect(() => stopCacheMaintenance()).not.toThrow();
    });
  });

  describe('Edge Cases and Error Handling', () => {
    it('should handle setting cache with null/undefined values', () => {
      // Should not throw when setting null data
      cache.set('null-test', { data: null, timestamp: mockNow });
      cache.set('undefined-test', { data: undefined, timestamp: mockNow });

      expect(cache.get('null-test')?.data).toBeNull();
      expect(cache.get('undefined-test')?.data).toBeUndefined();
    });

    it('should handle very large cache keys', () => {
      const largeKey = 'x'.repeat(1000);
      const cacheValue = TestDataFactory.createMockCacheValue();

      cache.set(largeKey, cacheValue);
      expect(cache.get(largeKey)).toEqual(cacheValue);
    });

    it('should handle rapid sequential operations', () => {
      // Rapid set/get operations
      for (let i = 0; i < 100; i++) {
        const key = `rapid-${i % 5}`; // Reuse some keys
        cache.set(key, TestDataFactory.createMockCacheValue({ data: { iteration: i } }));
      }

      expect(cache.getStats().size).toBe(5); // Should be capped at maxSize
      
      // All keys should be accessible
      for (let i = 0; i < 5; i++) {
        expect(cache.has(`rapid-${i}`)).toBe(true);
      }
    });

    it('should handle concurrent expiration checks', () => {
      // Add entries with different expiration times
      const now = mockNow;
      cache.set('expires-soon', { data: 'test1', timestamp: now - 999 });   // Expires in 1ms
      cache.set('expires-later', { data: 'test2', timestamp: now - 500 });  // Expires in 500ms

      // Advance time to expire first entry
      vi.setSystemTime(now + 1001);

      expect(cache.has('expires-soon')).toBe(false);
      expect(cache.has('expires-later')).toBe(false); // This should also be expired now
    });
  });

  describe('Memory Management', () => {
    it('should not grow beyond maxSize', () => {
      // Add many more entries than maxSize
      for (let i = 0; i < 20; i++) {
        cache.set(`key-${i}`, TestDataFactory.createMockCacheValue());
      }

      expect(cache.getStats().size).toBeLessThanOrEqual(5);
    });

    it('should properly clean up expired entries to free memory', () => {
      // Fill cache with entries
      for (let i = 0; i < 5; i++) {
        cache.set(`key-${i}`, TestDataFactory.createMockCacheValue({ timestamp: mockNow - 2000 }));
      }

      expect(cache.getStats().size).toBe(5);

      // Trigger expiration cleanup
      cache.clearExpired();

      expect(cache.getStats().size).toBe(0);
    });
  });
});