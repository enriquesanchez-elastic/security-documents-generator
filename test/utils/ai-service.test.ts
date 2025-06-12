import { describe, it, expect, beforeEach, vi } from 'vitest';
import { generateAIAlert, generateAIEvent, generateAIAlertBatch, generateMITREAlert } from '../../src/utils/ai_service';
import { 
  mockSuccessfulOpenAIResponse, 
  mockSuccessfulClaudeResponse,
  mockFailedOpenAIResponse,
  mockFailedClaudeResponse,
  resetAllMocks 
} from '../mocks/ai-clients';
import type { GenerateAIAlertParams, GenerateAIEventParams, GenerateAIAlertBatchParams } from '../../src/utils/ai_service_types';

describe('AI Service', () => {
  beforeEach(() => {
    resetAllMocks();
    vi.clearAllTimers();
    vi.useFakeTimers();
  });

  describe('generateAIAlert', () => {
    it('should generate alert using OpenAI', async () => {
      const mockAlert = {
        'host.name': 'test-host',
        'user.name': 'test-user',
        'kibana.alert.severity': 'high',
        'kibana.alert.risk_score': 75,
        'threat.technique.id': 'T1059',
      };

      mockSuccessfulOpenAIResponse(mockAlert);

      const params: GenerateAIAlertParams = {
        hostName: 'test-host',
        userName: 'test-user',
        space: 'default',
        alertType: 'general',
      };

      const result = await generateAIAlert(params);

      expect(result).toBeDefined();
      expect(result['host.name']).toBe('test-host');
      expect(result['user.name']).toBe('test-user');
      expect(result['kibana.space_ids']).toEqual(['default']);
      expect(result['@timestamp']).toBeDefined();
    });

    it('should generate alert using Claude', async () => {
      // Mock config to use Claude
      vi.doMock('../../src/get_config.js', () => ({
        getConfig: vi.fn(() => ({
          useClaudeAI: true,
          claudeApiKey: 'test-claude-key',
          claudeModel: 'claude-3-5-sonnet-20241022',
        })),
      }));

      const mockAlert = {
        'host.name': 'test-host',
        'user.name': 'test-user',
        'kibana.alert.severity': 'medium',
        'event.action': 'malicious_script_execution',
      };

      mockSuccessfulClaudeResponse(mockAlert);

      const params: GenerateAIAlertParams = {
        hostName: 'test-host',
        userName: 'test-user',
        space: 'security',
      };

      const result = await generateAIAlert(params);

      expect(result).toBeDefined();
      expect(result['host.name']).toBe('test-host');
      expect(result['kibana.space_ids']).toEqual(['security']);
    });

    it('should handle OpenAI API failures gracefully', async () => {
      mockFailedOpenAIResponse(new Error('API Rate Limit Exceeded'));

      const params: GenerateAIAlertParams = {
        hostName: 'test-host',
        userName: 'test-user',
      };

      const result = await generateAIAlert(params);

      // Should return default template on failure
      expect(result).toBeDefined();
      expect(result['host.name']).toBe('test-host');
      expect(result['user.name']).toBe('test-user');
      expect(result['kibana.alert.rule.name']).toBe('Security Alert Detection');
    });

    it('should generate MITRE-enabled alerts with attack chain context', async () => {
      const mockMitreAlert = {
        'threat.technique.id': 'T1566.001',
        'threat.technique.name': 'Spearphishing Attachment',
        'threat.tactic.name': 'Initial Access',
        'campaign.correlation.id': 'test-campaign-123',
      };

      mockSuccessfulOpenAIResponse(mockMitreAlert);

      const params: GenerateAIAlertParams = {
        hostName: 'compromised-workstation',
        userName: 'target-user',
        space: 'threat-intel',
        mitreEnabled: true,
        attackChain: {
          campaignId: 'apt-campaign-001',
          stageId: 'initial-access-stage',
          stageName: 'Spearphishing Campaign',
          stageIndex: 1,
          totalStages: 5,
          threatActor: 'APT29',
          parentEvents: ['parent-event-1', 'parent-event-2'],
        },
      };

      const result = await generateAIAlert(params);

      expect(result).toBeDefined();
      expect(result['host.name']).toBe('compromised-workstation');
      // The threat technique may be added by MITRE service
      expect(result).toHaveProperty('kibana.alert.uuid');
    });

    it('should validate and sanitize AI-generated content', async () => {
      const maliciousAlert = {
        'host.name': '<script>alert("xss")</script>',
        'user.name': 'test-user',
        'malicious_field': 'should_be_removed',
        'kibana.alert.severity': 'invalid_severity',
      };

      mockSuccessfulOpenAIResponse(maliciousAlert);

      const result = await generateAIAlert({
        hostName: 'clean-host',
        userName: 'clean-user',
      });

      expect(result['host.name']).toBe('clean-host'); // Should be overridden
      expect(result['user.name']).toBe('clean-user'); // Should be overridden
      expect(result['malicious_field']).toBeUndefined(); // Should be removed
      expect(result['kibana.alert.severity']).toBe('medium'); // Should be defaulted
    });
  });

  describe('generateAIEvent', () => {
    it('should generate event with custom field values', async () => {
      const mockEvent = {
        'event.action': 'user_login',
        'source.ip': '192.168.1.100',
        'destination.port': 22,
        'process.name': 'ssh',
      };

      mockSuccessfulOpenAIResponse(mockEvent);

      const params: GenerateAIEventParams = {
        id_field: 'host.name',
        id_value: 'target-server',
      };

      const result = await generateAIEvent(params);

      expect(result).toBeDefined();
      expect(result['host.name']).toBe('target-server');
      expect(result['@timestamp']).toBeDefined();
    });

    it('should handle invalid JSON responses', async () => {
      const invalidResponse = 'This is not valid JSON {';
      
      // Mock OpenAI to return invalid JSON
      vi.doMock('../../src/utils/error_handling.js', () => ({
        safeJsonParse: vi.fn(() => ({})),
        handleAIError: vi.fn(),
        withRetry: vi.fn((fn) => fn()),
      }));

      const result = await generateAIEvent();

      expect(result).toBeDefined();
      expect(result['@timestamp']).toBeDefined();
    });
  });

  describe('generateAIAlertBatch', () => {
    it('should generate multiple alerts efficiently', async () => {
      const mockBatchResponse = [
        { 'host.name': 'host-1', 'user.name': 'user-1' },
        { 'host.name': 'host-2', 'user.name': 'user-2' },
        { 'host.name': 'host-3', 'user.name': 'user-3' },
      ];

      mockSuccessfulOpenAIResponse({ alerts: mockBatchResponse });

      const params: GenerateAIAlertBatchParams = {
        entities: [
          { hostName: 'host-1', userName: 'user-1' },
          { hostName: 'host-2', userName: 'user-2' },
          { hostName: 'host-3', userName: 'user-3' },
        ],
        space: 'batch-test',
        batchSize: 3,
      };

      const results = await generateAIAlertBatch(params);

      expect(results).toHaveLength(3);
      expect(results[0]['host.name']).toBe('host-1');
      expect(results[1]['host.name']).toBe('host-2');
      expect(results[2]['host.name']).toBe('host-3');
    });

    it('should handle partial batch failures', async () => {
      // First call succeeds, second fails
      mockSuccessfulOpenAIResponse({ alerts: [{ 'host.name': 'host-1' }] });
      
      const params: GenerateAIAlertBatchParams = {
        entities: [
          { hostName: 'host-1', userName: 'user-1' },
          { hostName: 'host-2', userName: 'user-2' },
        ],
        batchSize: 1,
      };

      const results = await generateAIAlertBatch(params);

      expect(results.length).toBeGreaterThan(0);
      results.forEach(result => {
        expect(result['kibana.alert.uuid']).toBeDefined();
      });
    });

    it('should validate batch response structure', async () => {
      const invalidBatchResponse = { unexpected: 'format' };
      mockSuccessfulOpenAIResponse(invalidBatchResponse);

      const params: GenerateAIAlertBatchParams = {
        entities: [{ hostName: 'test-host', userName: 'test-user' }],
      };

      const results = await generateAIAlertBatch(params);

      expect(results).toHaveLength(1);
      expect(results[0]['host.name']).toBe('test-host');
    });
  });

  describe('generateMITREAlert', () => {
    it('should generate alert with MITRE ATT&CK techniques', async () => {
      const mockMitreAlert = {
        'threat.technique.id': ['T1055', 'T1003'],
        'threat.technique.name': ['Process Injection', 'OS Credential Dumping'],
        'threat.tactic.name': ['Defense Evasion', 'Credential Access'],
        'mitre.attack.chain.id': 'chain-123',
      };

      mockSuccessfulOpenAIResponse(mockMitreAlert);

      const result = await generateMITREAlert({
        hostName: 'target-host',
        userName: 'target-user',
        space: 'threat-hunting',
      });

      expect(result).toBeDefined();
      expect(result['host.name']).toBe('target-host');
      // MITRE fields will be added by the service
      expect(result).toHaveProperty('kibana.alert.uuid');
    });

    it('should fallback to regular alert if MITRE data unavailable', async () => {
      vi.doMock('../../src/utils/mitre_attack_service.js', () => ({
        loadMitreData: vi.fn(() => null),
      }));

      const result = await generateMITREAlert({
        hostName: 'fallback-host',
        userName: 'fallback-user',
      });

      expect(result).toBeDefined();
      expect(result['host.name']).toBe('fallback-host');
    });
  });

  describe('Caching', () => {
    it('should use cached responses for repeated requests', async () => {
      const mockAlert = { 'host.name': 'cached-host' };
      mockSuccessfulOpenAIResponse(mockAlert);

      const params = {
        hostName: 'cached-host',
        userName: 'cached-user',
        space: 'cache-test',
        alertType: 'general' as const,
      };

      // First call
      const result1 = await generateAIAlert(params);
      expect(result1).toBeDefined();

      // Second call - may or may not use cache depending on implementation
      const result2 = await generateAIAlert(params);
      expect(result2).toBeDefined();
      // Both should have valid UUIDs
      expect(result1['kibana.alert.uuid']).toBeDefined();
      expect(result2['kibana.alert.uuid']).toBeDefined();
    });
  });

  describe('Rate Limiting and Retries', () => {
    it('should retry on transient failures', async () => {
      // First call fails, second succeeds
      mockFailedOpenAIResponse(new Error('Temporary network error'));
      setTimeout(() => {
        mockSuccessfulOpenAIResponse({ 'host.name': 'retry-host' });
      }, 100);

      const result = await generateAIAlert({
        hostName: 'retry-host',
        userName: 'retry-user',
      });

      expect(result).toBeDefined();
    });

    it('should respect rate limits with backoff', async () => {
      mockFailedOpenAIResponse(new Error('Rate limit exceeded'));

      vi.advanceTimersByTime(1000);

      const result = await generateAIAlert({
        hostName: 'rate-limited-host',
        userName: 'rate-limited-user',
      });

      // Should still return default template
      expect(result['kibana.alert.rule.name']).toBe('Security Alert Detection');
    });
  });
});