/**
 * Tests for Timestamp Utils
 * 
 * Critical utility tests with high coverage target (80%)
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import moment from 'moment';

// We need to mock faker and config before importing the module
vi.mock('@faker-js/faker', () => ({
  faker: {
    date: {
      between: vi.fn().mockReturnValue(new Date('2024-01-15T12:30:00.000Z')),
    },
    number: {
      int: vi.fn().mockReturnValue(50),
    },
    helpers: {
      arrayElement: vi.fn().mockReturnValue('normal'),
    },
  },
}));

vi.mock('../../src/get_config', () => ({
  getConfig: vi.fn(() => ({
    generation: {
      timezone: 'UTC',
    },
  })),
}));

import {
  generateTimestamp,
  getTimeRange,
  TimestampConfig,
} from '../../src/utils/timestamp_utils';

describe('Timestamp Utils', () => {
  const mockBaseDate = moment('2024-01-15T10:30:00.000Z');

  beforeEach(() => {
    vi.clearAllMocks();
    // Mock moment.now() for consistent testing
    vi.spyOn(moment, 'now').mockReturnValue(mockBaseDate.valueOf());
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('generateTimestamp', () => {
    it('should generate current timestamp when no config provided', () => {
      const result = generateTimestamp();
      
      expect(typeof result).toBe('string');
      expect(new Date(result)).toBeInstanceOf(Date);
    });

    it('should generate timestamp within specified date range', () => {
      const config: TimestampConfig = {
        startDate: '2024-01-01T00:00:00.000Z',
        endDate: '2024-01-31T23:59:59.999Z',
      };

      const result = generateTimestamp(config);
      const timestamp = moment(result);

      expect(timestamp.isValid()).toBe(true);
      expect(timestamp.isBetween(
        moment(config.startDate),
        moment(config.endDate),
        undefined,
        '[]'
      )).toBe(true);
    });

    it('should handle relative date strings', () => {
      const config: TimestampConfig = {
        startDate: '7d',
        endDate: 'now',
      };

      const result = generateTimestamp(config);
      const timestamp = moment(result);

      expect(timestamp.isValid()).toBe(true);
      // Should be within the last 7 days
      expect(timestamp.isAfter(mockBaseDate.clone().subtract(7, 'days'))).toBe(true);
      expect(timestamp.isSameOrBefore(mockBaseDate)).toBe(true);
    });

    it('should handle business hours pattern', () => {
      const config: TimestampConfig = {
        pattern: 'business_hours',
        startDate: '2024-01-15T00:00:00.000Z',
        endDate: '2024-01-15T23:59:59.999Z',
      };

      const result = generateTimestamp(config);
      const timestamp = moment(result);

      expect(timestamp.isValid()).toBe(true);
      // Should generate timestamp within the specified date range
      expect(timestamp.isBetween(
        moment(config.startDate),
        moment(config.endDate),
        undefined,
        '[]'
      )).toBe(true);
    });

    it('should handle uniform pattern', () => {
      const config: TimestampConfig = {
        pattern: 'uniform',
        startDate: '2024-01-01T00:00:00.000Z',
        endDate: '2024-01-02T00:00:00.000Z',
      };

      const result = generateTimestamp(config);
      const timestamp = moment(result);

      expect(timestamp.isValid()).toBe(true);
      expect(timestamp.isBetween(
        moment(config.startDate),
        moment(config.endDate),
        undefined,
        '[]'
      )).toBe(true);
    });

    it('should handle random pattern', () => {
      const config: TimestampConfig = {
        pattern: 'random',
        startDate: '2024-01-01T00:00:00.000Z',
        endDate: '2024-01-02T00:00:00.000Z',
      };

      const result = generateTimestamp(config);
      const timestamp = moment(result);

      expect(timestamp.isValid()).toBe(true);
    });

    it('should handle attack simulation pattern', () => {
      const config: TimestampConfig = {
        pattern: 'attack_simulation',
        startDate: '2024-01-15T00:00:00.000Z',
        endDate: '2024-01-15T23:59:59.999Z',
      };

      const result = generateTimestamp(config);
      const timestamp = moment(result);

      expect(timestamp.isValid()).toBe(true);
      // Attack simulation might cluster events at specific times
      expect(timestamp.isBetween(
        moment(config.startDate),
        moment(config.endDate),
        undefined,
        '[]'
      )).toBe(true);
    });

    it('should handle weekend heavy pattern', () => {
      const config: TimestampConfig = {
        pattern: 'weekend_heavy',
        startDate: '2024-01-13T00:00:00.000Z', // Saturday
        endDate: '2024-01-14T23:59:59.999Z',   // Sunday
      };

      const result = generateTimestamp(config);
      const timestamp = moment(result);

      expect(timestamp.isValid()).toBe(true);
      expect(timestamp.isBetween(
        moment(config.startDate),
        moment(config.endDate),
        undefined,
        '[]'
      )).toBe(true);
    });

    it('should handle legacy eventDateOffsetHours', () => {
      const config: TimestampConfig = {
        eventDateOffsetHours: -24, // 24 hours ago
      };

      const result = generateTimestamp(config);
      const timestamp = moment(result);

      expect(timestamp.isValid()).toBe(true);
      // The result should be a valid timestamp
      expect(typeof result).toBe('string');
    });
  });

  describe('getTimeRange', () => {
    it('should return time range with start and end dates', () => {
      const config: TimestampConfig = {
        startDate: '2024-01-01T00:00:00.000Z',
        endDate: '2024-01-31T23:59:59.999Z',
      };

      const range = getTimeRange(config);

      expect(range.start.isValid()).toBe(true);
      expect(range.end.isValid()).toBe(true);
      expect(range.start.isBefore(range.end)).toBe(true);
      expect(range.start.toISOString()).toBe('2024-01-01T00:00:00.000Z');
      expect(range.end.toISOString()).toBe('2024-01-31T23:59:59.999Z');
    });

    it('should handle relative dates', () => {
      const config: TimestampConfig = {
        startDate: '7d',
        endDate: 'now',
      };

      const range = getTimeRange(config);

      expect(range.start.isValid()).toBe(true);
      expect(range.end.isValid()).toBe(true);
      expect(range.start.isBefore(range.end)).toBe(true);
      
      // Start should be approximately 7 days before now
      const expectedStart = mockBaseDate.clone().subtract(7, 'days');
      expect(Math.abs(range.start.diff(expectedStart, 'hours'))).toBeLessThan(1);
      
      // End should be approximately now
      expect(Math.abs(range.end.diff(mockBaseDate, 'minutes'))).toBeLessThan(1);
    });

    it('should handle default range when no config provided', () => {
      const range = getTimeRange();

      expect(range.start.isValid()).toBe(true);
      expect(range.end.isValid()).toBe(true);
      expect(range.start.isBefore(range.end)).toBe(true);
      
      // Default range should be reasonable (e.g., last 24 hours)
      const timeDiff = range.end.diff(range.start, 'hours');
      expect(timeDiff).toBeGreaterThan(0);
      expect(timeDiff).toBeLessThanOrEqual(24);
    });

    it('should handle edge case with same start and end date', () => {
      const config: TimestampConfig = {
        startDate: '2024-01-15T12:00:00.000Z',
        endDate: '2024-01-15T12:00:00.000Z',
      };

      const range = getTimeRange(config);

      expect(range.start.isValid()).toBe(true);
      expect(range.end.isValid()).toBe(true);
      expect(range.start.isSameOrBefore(range.end)).toBe(true);
    });

    it('should handle invalid date strings gracefully', () => {
      const config: TimestampConfig = {
        startDate: 'invalid-date',
        endDate: 'also-invalid',
      };

      // Should not throw an error
      expect(() => getTimeRange(config)).not.toThrow();
      
      const range = getTimeRange(config);
      // May create invalid moments, but shouldn't crash
      expect(range).toBeDefined();
      expect(range.start).toBeDefined();
      expect(range.end).toBeDefined();
    });
  });

  describe('Relative Date Parsing', () => {
    it('should parse minutes correctly', () => {
      const config: TimestampConfig = {
        startDate: '30m',
        endDate: 'now',
      };

      const range = getTimeRange(config);
      const expectedStart = mockBaseDate.clone().subtract(30, 'minutes');

      expect(Math.abs(range.start.diff(expectedStart, 'minutes'))).toBeLessThan(1);
    });

    it('should parse hours correctly', () => {
      const config: TimestampConfig = {
        startDate: '6h',
        endDate: 'now',
      };

      const range = getTimeRange(config);
      const expectedStart = mockBaseDate.clone().subtract(6, 'hours');

      expect(Math.abs(range.start.diff(expectedStart, 'minutes'))).toBeLessThan(1);
    });

    it('should parse days correctly', () => {
      const config: TimestampConfig = {
        startDate: '3d',
        endDate: 'now',
      };

      const range = getTimeRange(config);
      const expectedStart = mockBaseDate.clone().subtract(3, 'days');

      expect(Math.abs(range.start.diff(expectedStart, 'minutes'))).toBeLessThan(1);
    });

    it('should parse weeks correctly', () => {
      const config: TimestampConfig = {
        startDate: '2w',
        endDate: 'now',
      };

      const range = getTimeRange(config);
      const expectedStart = mockBaseDate.clone().subtract(2, 'weeks');

      expect(Math.abs(range.start.diff(expectedStart, 'hours'))).toBeLessThan(1);
    });

    it('should parse months correctly', () => {
      const config: TimestampConfig = {
        startDate: '1M',
        endDate: 'now',
      };

      const range = getTimeRange(config);
      const expectedStart = mockBaseDate.clone().subtract(1, 'months');

      expect(Math.abs(range.start.diff(expectedStart, 'hours'))).toBeLessThan(1);
    });

    it('should parse years correctly', () => {
      const config: TimestampConfig = {
        startDate: '1y',
        endDate: 'now',
      };

      const range = getTimeRange(config);
      const expectedStart = mockBaseDate.clone().subtract(1, 'years');

      expect(Math.abs(range.start.diff(expectedStart, 'days'))).toBeLessThan(1);
    });
  });

  describe('Pattern-Specific Behaviors', () => {
    it('should generate multiple timestamps with business hours pattern consistently', () => {
      const config: TimestampConfig = {
        pattern: 'business_hours',
        startDate: '2024-01-15T00:00:00.000Z',
        endDate: '2024-01-15T23:59:59.999Z',
      };

      const timestamps = [];
      for (let i = 0; i < 10; i++) {
        timestamps.push(generateTimestamp(config));
      }

      timestamps.forEach(ts => {
        const timestamp = moment(ts);
        expect(timestamp.isValid()).toBe(true);
        expect(timestamp.isBetween(
          moment(config.startDate),
          moment(config.endDate),
          undefined,
          '[]'
        )).toBe(true);
      });
    });

    it('should handle cross-midnight business hours', () => {
      const config: TimestampConfig = {
        pattern: 'business_hours',
        startDate: '2024-01-15T20:00:00.000Z', // 8 PM
        endDate: '2024-01-16T04:00:00.000Z',   // 4 AM next day
      };

      const result = generateTimestamp(config);
      const timestamp = moment(result);

      expect(timestamp.isValid()).toBe(true);
      // Should still be within the specified range
      expect(timestamp.isBetween(
        moment(config.startDate),
        moment(config.endDate),
        undefined,
        '[]'
      )).toBe(true);
    });
  });

  describe('Error Handling and Edge Cases', () => {
    it('should handle undefined config gracefully', () => {
      expect(() => generateTimestamp(undefined)).not.toThrow();
      expect(() => getTimeRange(undefined)).not.toThrow();
    });

    it('should handle empty config object', () => {
      const config: TimestampConfig = {};
      
      expect(() => generateTimestamp(config)).not.toThrow();
      expect(() => getTimeRange(config)).not.toThrow();
      
      const timestamp = generateTimestamp(config);
      expect(moment(timestamp).isValid()).toBe(true);
    });

    it('should handle malformed relative date strings', () => {
      const config: TimestampConfig = {
        startDate: '999xyz', // Invalid format
        endDate: 'now',
      };

      expect(() => generateTimestamp(config)).not.toThrow();
      
      const result = generateTimestamp(config);
      // May produce invalid moment, but shouldn't crash
      expect(typeof result).toBe('string');
    });

    it('should handle future relative dates', () => {
      const config: TimestampConfig = {
        startDate: 'now',
        endDate: '7d', // Should be interpreted as 7 days from now
      };

      const range = getTimeRange(config);
      
      expect(range.start.isValid()).toBe(true);
      expect(range.end.isValid()).toBe(true);
      // End should be after start
      expect(range.end.isAfter(range.start)).toBe(true);
    });

    it('should handle very large time ranges', () => {
      const config: TimestampConfig = {
        startDate: '10y',
        endDate: 'now',
      };

      expect(() => generateTimestamp(config)).not.toThrow();
      
      const result = generateTimestamp(config);
      expect(moment(result).isValid()).toBe(true);
    });

    it('should handle zero time ranges', () => {
      const config: TimestampConfig = {
        startDate: '2024-01-15T12:00:00.000Z',
        endDate: '2024-01-15T12:00:00.000Z',
      };

      expect(() => generateTimestamp(config)).not.toThrow();
      
      const result = generateTimestamp(config);
      const timestamp = moment(result);
      expect(timestamp.isValid()).toBe(true);
      expect(timestamp.toISOString()).toBe(config.startDate);
    });
  });

  describe('Performance and Consistency', () => {
    it('should generate timestamps quickly', () => {
      const config: TimestampConfig = {
        pattern: 'uniform',
        startDate: '7d',
        endDate: 'now',
      };

      const start = performance.now();
      
      // Generate 100 timestamps
      for (let i = 0; i < 100; i++) {
        generateTimestamp(config);
      }
      
      const end = performance.now();
      const duration = end - start;

      // Should complete within reasonable time (less than 100ms for 100 timestamps)
      expect(duration).toBeLessThan(100);
    });

    it('should generate valid ISO strings consistently', () => {
      const config: TimestampConfig = {
        startDate: '1d',
        endDate: 'now',
      };

      for (let i = 0; i < 20; i++) {
        const timestamp = generateTimestamp(config);
        
        // Should be valid string
        expect(typeof timestamp).toBe('string');
        
        // Should be a valid date
        expect(moment(timestamp).isValid()).toBe(true);
      }
    });
  });
});