import { describe, it, expect, beforeEach, vi } from 'vitest';
import { 
  validateAndSanitizeAlert, 
  sanitizeJSONResponse, 
  validateBatchResponse 
} from '../../src/utils/validation_service';

describe('Validation Service', () => {
  describe('validateAndSanitizeAlert', () => {
    it('should validate and sanitize a well-formed alert', () => {
      const validAlert = {
        'kibana.alert.uuid': 'test-uuid-123',
        'host.name': 'test-host',
        'user.name': 'test-user',
        '@timestamp': '2024-01-01T12:00:00.000Z',
        'kibana.alert.severity': 'high',
        'kibana.alert.risk_score': 85,
        'event.kind': 'signal',
        'kibana.space_ids': ['default'],
      };

      const result = validateAndSanitizeAlert(
        validAlert,
        'test-host',
        'test-user',
        'default'
      );

      expect(result).toBeDefined();
      expect(result['host.name']).toBe('test-host');
      expect(result['user.name']).toBe('test-user');
      expect(result['kibana.space_ids']).toEqual(['default']);
      expect(result['kibana.alert.severity']).toBe('high');
    });

    it('should sanitize XSS attempts in field values', () => {
      const maliciousAlert = {
        'host.name': '<script>alert("xss")</script>',
        'user.name': 'test<img src=x onerror=alert(1)>user',
        'event.action': 'normal_action',
        'kibana.alert.rule.name': '<iframe src="javascript:alert(1)"></iframe>',
      };

      const result = validateAndSanitizeAlert(
        maliciousAlert,
        'clean-host',
        'clean-user',
        'default'
      );

      expect(result['host.name']).toBe('clean-host'); // Should use override
      expect(result['user.name']).toBe('clean-user'); // Should use override
      expect(result['event.action']).toBe('normal_action'); // Should preserve safe content
      expect(result['kibana.alert.rule.name']).not.toContain('<iframe'); // Should be sanitized
    });

    it('should enforce required field constraints', () => {
      const incompleteAlert = {
        'some.random.field': 'value',
        'kibana.alert.severity': 'invalid_severity',
        'kibana.alert.risk_score': 150, // Out of range
      };

      const result = validateAndSanitizeAlert(
        incompleteAlert,
        'required-host',
        'required-user',
        'required-space'
      );

      expect(result['host.name']).toBe('required-host');
      expect(result['user.name']).toBe('required-user');
      expect(result['kibana.space_ids']).toEqual(['required-space']);
      expect(result['kibana.alert.uuid']).toBeDefined();
      expect(result['@timestamp']).toBeDefined();
      expect(result['kibana.alert.severity']).toMatch(/^(low|medium|high|critical)$/);
      expect(result['kibana.alert.risk_score']).toBeGreaterThanOrEqual(0);
      expect(result['kibana.alert.risk_score']).toBeLessThanOrEqual(100);
    });

    it('should handle null and undefined values', () => {
      const alertWithNulls = {
        'host.name': null,
        'user.name': undefined,
        'kibana.alert.severity': '',
        'valid.field': 'valid_value',
      };

      const result = validateAndSanitizeAlert(
        alertWithNulls,
        'fallback-host',
        'fallback-user',
        'fallback-space'
      );

      expect(result['host.name']).toBe('fallback-host');
      expect(result['user.name']).toBe('fallback-user');
      expect(result['valid.field']).toBe('valid_value');
      expect(result['kibana.alert.severity']).toMatch(/^(low|medium|high|critical)$/);
    });

    it('should validate timestamp formats', () => {
      const alertWithInvalidTimestamp = {
        '@timestamp': 'not-a-valid-timestamp',
        'kibana.alert.start': 'also-invalid',
      };

      const timestampConfig = {
        startDate: '2024-01-01T00:00:00Z',
        endDate: '2024-01-01T23:59:59Z',
        pattern: 'uniform' as const,
      };

      const result = validateAndSanitizeAlert(
        alertWithInvalidTimestamp,
        'host',
        'user',
        'space',
        timestampConfig
      );

      expect(result['@timestamp']).toBeDefined();
      expect(new Date(result['@timestamp'] as string).getTime()).not.toBeNaN();
      expect(result['kibana.alert.start']).toBeDefined();
      expect(new Date(result['kibana.alert.start'] as string).getTime()).not.toBeNaN();
    });

    it('should preserve MITRE ATT&CK fields when valid', () => {
      const mitreAlert = {
        'threat.technique.id': ['T1566.001', 'T1059.001'],
        'threat.technique.name': ['Spearphishing Attachment', 'PowerShell'],
        'threat.tactic.name': ['Initial Access', 'Execution'],
        'threat.tactic.id': ['TA0001', 'TA0002'],
      };

      const result = validateAndSanitizeAlert(
        mitreAlert,
        'mitre-host',
        'mitre-user',
        'threat-intel'
      );

      expect(result['threat.technique.id']).toEqual(['T1566.001', 'T1059.001']);
      expect(result['threat.technique.name']).toEqual(['Spearphishing Attachment', 'PowerShell']);
      expect(result['threat.tactic.name']).toEqual(['Initial Access', 'Execution']);
    });

    it('should remove potentially dangerous fields', () => {
      const dangerousAlert = {
        '__proto__': { malicious: 'payload' },
        'constructor': 'evil function',
        'eval': 'dangerous code',
        'function': 'another danger',
        'script': '<script>alert(1)</script>',
        'legitimate.field': 'safe value',
      };

      const result = validateAndSanitizeAlert(
        dangerousAlert,
        'safe-host',
        'safe-user',
        'safe-space'
      );

      // Check that dangerous fields are removed or sanitized
      expect(result['__proto__']).not.toEqual({ malicious: 'payload' });
      expect(result['constructor']).not.toBe('evil function');
      expect(result['eval']).not.toBe('dangerous code');
      expect(result['function']).not.toBe('another danger');
      expect(result['script']).not.toBe('<script>alert(1)</script>');
      expect(result['legitimate.field']).toBe('safe value');
    });
  });

  describe('sanitizeJSONResponse', () => {
    it('should clean malformed JSON with extra text', () => {
      const malformedJSON = `
        Here is your JSON response:
        {"host.name": "test-host", "user.name": "test-user"}
        Please let me know if you need anything else!
      `;

      const result = sanitizeJSONResponse(malformedJSON);
      
      expect(result).toBe('{"host.name": "test-host", "user.name": "test-user"}');
    });

    it('should handle JSON wrapped in code blocks', () => {
      const codeBlockJSON = `
        \`\`\`json
        {
          "alert": {
            "severity": "high",
            "host": "test-server"
          }
        }
        \`\`\`
      `;

      const result = sanitizeJSONResponse(codeBlockJSON);
      
      expect(result).toContain('"severity": "high"');
      expect(result).toContain('"host": "test-server"');
      expect(result).not.toContain('```');
    });

    it('should remove comments from JSON', () => {
      const commentedJSON = `{
        // This is a comment
        "host.name": "test-host",
        /* Multi-line
           comment */
        "user.name": "test-user"
      }`;

      const result = sanitizeJSONResponse(commentedJSON);
      
      expect(result).not.toContain('//');
      expect(result).not.toContain('/*');
      // The mock should extract the JSON content
      expect(result).toBeDefined();
      expect(typeof result).toBe('string');
    });

    it('should handle JSON with trailing commas', () => {
      const trailingCommaJSON = `{
        "host.name": "test-host",
        "user.name": "test-user",
      }`;

      const result = sanitizeJSONResponse(trailingCommaJSON);
      
      // Should attempt to fix trailing commas
      expect(result).toContain('"host.name": "test-host"');
      expect(result).toContain('"user.name": "test-user"');
    });

    it('should preserve valid JSON unchanged', () => {
      const validJSON = '{"host.name": "test-host", "severity": "medium", "score": 42}';

      const result = sanitizeJSONResponse(validJSON);
      
      expect(result).toBe(validJSON);
    });

    it('should handle empty or whitespace-only input', () => {
      expect(sanitizeJSONResponse('')).toBe('{}');
      expect(sanitizeJSONResponse('   \n\t   ')).toBe('{}');
      expect(sanitizeJSONResponse(null as any)).toBe('{}');
      expect(sanitizeJSONResponse(undefined as any)).toBe('{}');
    });

    it('should remove control characters', () => {
      const controlCharJSON = `{"host.name": "test\u0000\u0001\u0002host", "user.name": "clean-user"}`;

      const result = sanitizeJSONResponse(controlCharJSON);
      
      expect(result).toContain('"host.name": "testhost"'); // Control chars removed
      expect(result).toContain('"user.name": "clean-user"');
    });
  });

  describe('validateBatchResponse', () => {
    it('should validate correctly sized batch response', () => {
      const validBatch = [
        { 'host.name': 'host-1', 'user.name': 'user-1' },
        { 'host.name': 'host-2', 'user.name': 'user-2' },
        { 'host.name': 'host-3', 'user.name': 'user-3' },
      ];

      const result = validateBatchResponse(validBatch, 3);
      
      expect(result).toHaveLength(3);
      expect(result).toEqual(validBatch);
    });

    it('should pad batch response if too few items', () => {
      const shortBatch = [
        { 'host.name': 'host-1', 'user.name': 'user-1' },
      ];

      const result = validateBatchResponse(shortBatch, 3);
      
      expect(result).toHaveLength(3);
      expect(result[0]).toEqual(shortBatch[0]);
      expect(result[1]).toEqual({}); // Padded with empty objects
      expect(result[2]).toEqual({});
    });

    it('should truncate batch response if too many items', () => {
      const longBatch = [
        { 'host.name': 'host-1' },
        { 'host.name': 'host-2' },
        { 'host.name': 'host-3' },
        { 'host.name': 'host-4' },
        { 'host.name': 'host-5' },
      ];

      const result = validateBatchResponse(longBatch, 3);
      
      expect(result).toHaveLength(3);
      expect(result[0]['host.name']).toBe('host-1');
      expect(result[1]['host.name']).toBe('host-2');
      expect(result[2]['host.name']).toBe('host-3');
    });

    it('should handle non-array input', () => {
      const nonArrayInput = { 'host.name': 'single-host' };

      const result = validateBatchResponse(nonArrayInput as any, 2);
      
      expect(result).toHaveLength(2);
      expect(result[0]).toEqual(nonArrayInput);
      expect(result[1]).toEqual({});
    });

    it('should handle null/undefined items in batch', () => {
      const batchWithNulls = [
        { 'host.name': 'valid-host' },
        null,
        undefined,
        { 'user.name': 'valid-user' },
      ];

      const result = validateBatchResponse(batchWithNulls as any, 4);
      
      expect(result).toHaveLength(4);
      expect(result[0]['host.name']).toBe('valid-host');
      expect(result[1]).toEqual({}); // null replaced with empty object
      expect(result[2]).toEqual({}); // undefined replaced with empty object
      expect(result[3]['user.name']).toBe('valid-user');
    });

    it('should handle empty batch for non-zero expected size', () => {
      const emptyBatch: any[] = [];

      const result = validateBatchResponse(emptyBatch, 2);
      
      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({});
      expect(result[1]).toEqual({});
    });

    it('should handle zero expected size', () => {
      const anyBatch = [{ 'host.name': 'host-1' }];

      const result = validateBatchResponse(anyBatch, 0);
      
      expect(result).toHaveLength(0);
    });

    it('should preserve object properties correctly', () => {
      const complexBatch = [
        {
          'host.name': 'complex-host',
          'nested': { 'property': 'value' },
          'array': [1, 2, 3],
          'boolean': true,
          'number': 42,
        },
      ];

      const result = validateBatchResponse(complexBatch, 1);
      
      expect(result).toHaveLength(1);
      expect(result[0]).toEqual(complexBatch[0]);
      expect(result[0]['nested']['property']).toBe('value');
      expect(result[0]['array']).toEqual([1, 2, 3]);
      expect(result[0]['boolean']).toBe(true);
      expect(result[0]['number']).toBe(42);
    });
  });

  describe('Edge Cases and Error Handling', () => {
    it('should handle extremely large field values', () => {
      const largeValue = 'x'.repeat(10000);
      const alertWithLargeFields = {
        'large.field': largeValue,
        'normal.field': 'normal',
      };

      const result = validateAndSanitizeAlert(
        alertWithLargeFields,
        'test-host',
        'test-user',
        'test-space'
      );

      expect(result['normal.field']).toBe('normal');
      // Large field should be handled (truncated or preserved based on implementation)
      expect(typeof result['large.field']).toBe('string');
    });

    it('should handle deeply nested objects', () => {
      const deeplyNested = {
        'level1': {
          'level2': {
            'level3': {
              'level4': {
                'value': 'deep-value',
              },
            },
          },
        },
      };

      const result = validateAndSanitizeAlert(
        deeplyNested,
        'nested-host',
        'nested-user',
        'nested-space'
      );

      expect(result['level1']['level2']['level3']['level4']['value']).toBe('deep-value');
    });

    it('should handle circular references safely', () => {
      const circularObject: any = { name: 'test' };
      circularObject.self = circularObject;

      // This should not crash the validator
      expect(() => {
        validateAndSanitizeAlert(
          circularObject,
          'circular-host',
          'circular-user',
          'circular-space'
        );
      }).not.toThrow();
    });

    it('should handle Unicode and special characters', () => {
      const unicodeAlert = {
        'host.name': '测试主机-αβγ-🚀',
        'user.name': 'משתמש-пользователь-ユーザー',
        'description': 'Alert with émojis 🔥 and special chars ñäöü',
      };

      const result = validateAndSanitizeAlert(
        unicodeAlert,
        unicodeAlert['host.name'],
        unicodeAlert['user.name'],
        'unicode-space'
      );

      expect(result['host.name']).toBe(unicodeAlert['host.name']);
      expect(result['user.name']).toBe(unicodeAlert['user.name']);
      expect(result['description']).toBe(unicodeAlert['description']);
    });
  });
});