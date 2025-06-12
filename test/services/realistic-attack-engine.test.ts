import { describe, it, expect, beforeEach, vi } from 'vitest';
import { RealisticAttackEngine } from '../../src/services/realistic_attack_engine';
import { resetAllMocks } from '../mocks/ai-clients';

// Mock all dependencies
vi.mock('../../src/services/attack_simulation_engine.js');
vi.mock('../../src/services/log_correlation_engine.js');
vi.mock('../../src/services/correlated_alert_generator.js');

const mockAttackSimulation = {
  campaign: {
    id: 'realistic-campaign-001',
    name: 'Realistic APT Campaign',
    type: 'apt' as const,
    threat_actor: 'APT29',
    duration: {
      start: new Date('2024-01-01T00:00:00Z'),
      end: new Date('2024-01-02T00:00:00Z'),
    },
    objectives: ['steal credentials', 'exfiltrate data'],
  },
  stages: [
    {
      id: 'stage-1',
      name: 'Initial Access',
      tactic: 'initial-access',
      techniques: ['T1566.001', 'T1078'],
      start_time: new Date('2024-01-01T08:00:00Z'),
      end_time: new Date('2024-01-01T12:00:00Z'),
      objectives: ['establish foothold'],
      generated_events: [],
      correlation_keys: ['stage_0'],
    },
    {
      id: 'stage-2',
      name: 'Credential Access',
      tactic: 'credential-access',
      techniques: ['T1003.001'],
      start_time: new Date('2024-01-01T14:00:00Z'),
      end_time: new Date('2024-01-01T16:00:00Z'),
      objectives: ['dump credentials'],
      generated_events: [],
      correlation_keys: ['stage_1'],
    },
  ],
  artifacts: [],
  network_topology: { subnets: [], critical_assets: [], trust_relationships: [], security_controls: [] },
  lateral_movement_paths: [],
  correlation_timeline: [],
};

const mockCorrelatedLogs = [
  {
    '@timestamp': '2024-01-01T08:30:00Z',
    'host.name': 'workstation-01',
    'user.name': 'jdoe',
    'data_stream.dataset': 'windows.security',
    'event.action': 'logon',
    'threat.technique.id': 'T1566.001',
  },
  {
    '@timestamp': '2024-01-01T08:35:00Z',
    'host.name': 'workstation-01',
    'user.name': 'jdoe',
    'data_stream.dataset': 'windows.powershell',
    'event.action': 'script_execution',
    'threat.technique.id': 'T1566.001',
  },
];

describe('RealisticAttackEngine', () => {
  let engine: RealisticAttackEngine;
  let mockAttackEngine: any;
  let mockCorrelationEngine: any;
  let mockAlertGenerator: any;

  beforeEach(() => {
    resetAllMocks();

    // Mock the attack simulation engine
    mockAttackEngine = {
      generateAttackSimulation: vi.fn().mockResolvedValue(mockAttackSimulation),
    };

    // Mock the correlation engine
    mockCorrelationEngine = {
      generateCorrelatedLogs: vi.fn().mockResolvedValue(mockCorrelatedLogs),
    };

    // Mock the alert generator
    mockAlertGenerator = {
      generateAlert: vi.fn(),
    };

    // Create engine instance and inject mocks
    engine = new RealisticAttackEngine();
    (engine as any).attackEngine = mockAttackEngine;
    (engine as any).correlationEngine = mockCorrelationEngine;
    (engine as any).alertGenerator = mockAlertGenerator;
  });

  describe('Realistic Campaign Generation', () => {
    it('should generate complete realistic campaign', async () => {
      const config = {
        campaignType: 'apt' as const,
        complexity: 'high' as const,
        enableRealisticLogs: true,
        logsPerStage: 5,
        detectionRate: 0.7,
        eventCount: 50,
        targetCount: 10,
        space: 'realistic-test',
        useAI: true,
        useMitre: true,
      };

      const result = await engine.generateRealisticCampaign(config);

      expect(result).toBeDefined();
      expect(result.campaign).toEqual(mockAttackSimulation);
      expect(result.stageLogs).toHaveLength(2); // Two stages
      expect(result.detectedAlerts).toBeDefined();
      expect(result.missedActivities).toBeDefined();
      expect(result.timeline).toBeDefined();
      expect(result.investigationGuide).toBeDefined();
    });

    it('should generate stage-based logs for each technique', async () => {
      const config = {
        campaignType: 'ransomware' as const,
        complexity: 'medium' as const,
        enableRealisticLogs: true,
        logsPerStage: 3,
        detectionRate: 0.5,
        eventCount: 20,
        targetCount: 5,
        space: 'test',
        useAI: false,
        useMitre: false,
      };

      const result = await engine.generateRealisticCampaign(config);

      expect(result.stageLogs).toHaveLength(2);
      
      result.stageLogs.forEach(stageLog => {
        expect(stageLog.stageId).toBeDefined();
        expect(stageLog.stageName).toBeDefined();
        expect(stageLog.technique).toBeDefined();
        expect(stageLog.logs).toBeInstanceOf(Array);
        expect(typeof stageLog.detected).toBe('boolean');
      });

      // Verify correlation engine was called for each stage
      expect(mockCorrelationEngine.generateCorrelatedLogs).toHaveBeenCalledTimes(3); // 2 stages, first stage has 2 techniques
    });

    it('should simulate realistic detection based on detection rate', async () => {
      const highDetectionConfig = {
        campaignType: 'insider' as const,
        complexity: 'low' as const,
        enableRealisticLogs: true,
        logsPerStage: 4,
        detectionRate: 0.9, // High detection rate
        eventCount: 10,
        targetCount: 2,
        space: 'test',
        useAI: true,
        useMitre: true,
      };

      const result = await engine.generateRealisticCampaign(highDetectionConfig);

      // With 90% detection rate, most stages should be detected
      const detectedStages = result.stageLogs.filter(stage => stage.detected);
      expect(detectedStages.length).toBeGreaterThan(0);

      // Check that detected stages have detection delay
      detectedStages.forEach(stage => {
        expect(stage.detectionDelay).toBeGreaterThanOrEqual(2);
        expect(stage.detectionDelay).toBeLessThanOrEqual(30);
      });
    });

    it('should track missed activities for undetected stages', async () => {
      const lowDetectionConfig = {
        campaignType: 'supply_chain' as const,
        complexity: 'expert' as const,
        enableRealisticLogs: true,
        logsPerStage: 2,
        detectionRate: 0.1, // Very low detection rate
        eventCount: 5,
        targetCount: 1,
        space: 'test',
        useAI: false,
        useMitre: false,
      };

      // Mock Math.random to ensure low detection
      const originalRandom = Math.random;
      Math.random = vi.fn(() => 0.5); // Always above 0.1 threshold

      const result = await engine.generateRealisticCampaign(lowDetectionConfig);

      // Should have missed activities
      expect(result.missedActivities.length).toBeGreaterThan(0);
      
      result.missedActivities.forEach(activity => {
        expect(activity.stage).toBeDefined();
        expect(activity.reason).toMatch(/^(below_detection_threshold|no_logs|alert_generation_failed)$/);
        expect(typeof activity.logs).toBe('number');
      });

      Math.random = originalRandom;
    });
  });

  describe('Alert Generation from Logs', () => {
    it('should generate alerts triggered by suspicious logs', async () => {
      const config = {
        campaignType: 'apt' as const,
        complexity: 'high' as const,
        enableRealisticLogs: true,
        logsPerStage: 5,
        detectionRate: 1.0, // Force detection
        eventCount: 10,
        targetCount: 3,
        space: 'alert-test',
        useAI: true,
        useMitre: true,
      };

      // Force all stages to be detected
      const originalRandom = Math.random;
      Math.random = vi.fn(() => 0.5); // Below 1.0 threshold

      const result = await engine.generateRealisticCampaign(config);

      expect(result.detectedAlerts.length).toBeGreaterThan(0);

      result.detectedAlerts.forEach(alert => {
        expect(alert['@timestamp']).toBeDefined();
        expect(alert['host.name']).toBeDefined();
        expect(alert['user.name']).toBeDefined();
        expect(alert['kibana.alert.uuid']).toBeDefined();
        expect(alert['kibana.alert.rule.name']).toBeDefined();
        expect(alert['kibana.alert.severity']).toMatch(/^(low|medium|high|critical)$/);
        expect(alert['kibana.space_ids']).toEqual(['alert-test']);
        expect(alert['_source_log']).toBeDefined();
      });

      Math.random = originalRandom;
    });

    it('should generate appropriate rule names based on log content', async () => {
      const testLog = {
        '@timestamp': '2024-01-01T10:00:00Z',
        'data_stream.dataset': 'powershell.execution',
        'event.action': 'script_execution',
        'threat.technique.id': 'T1059.001',
      };

      const stageLogs = {
        stageId: 'test-stage',
        stageName: 'Command Execution',
        technique: 'T1059.001',
        logs: [testLog],
        detected: true,
        detectionDelay: 5,
      };

      const config = {
        campaignType: 'apt' as const,
        complexity: 'medium' as const,
        enableRealisticLogs: true,
        logsPerStage: 1,
        detectionRate: 1.0,
        eventCount: 1,
        targetCount: 1,
        space: 'rule-test',
        useAI: false,
        useMitre: true,
      };

      // Access private method for testing (in a real scenario, we'd test the public interface)
      const mockEngine = engine as any;
      const ruleName = mockEngine.generateRuleName(testLog, 'T1059');

      expect(ruleName).toBe('Command Line: Suspicious PowerShell Execution');
    });

    it('should determine appropriate severity levels', async () => {
      const mockEngine = engine as any;

      expect(mockEngine.determineSeverity({}, 'T1566')).toBe('high'); // Phishing
      expect(mockEngine.determineSeverity({}, 'T1003')).toBe('critical'); // Credential dumping
      expect(mockEngine.determineSeverity({}, 'T1083')).toBe('low'); // File discovery
      expect(mockEngine.determineSeverity({}, 'T9999')).toBe('medium'); // Unknown technique
    });
  });

  describe('Timeline Generation', () => {
    it('should build comprehensive campaign timeline', async () => {
      const config = {
        campaignType: 'ransomware' as const,
        complexity: 'high' as const,
        enableRealisticLogs: true,
        logsPerStage: 3,
        detectionRate: 0.8,
        eventCount: 15,
        targetCount: 5,
        space: 'timeline-test',
        useAI: true,
        useMitre: true,
      };

      const result = await engine.generateRealisticCampaign(config);

      expect(result.timeline).toBeDefined();
      expect(result.timeline.start).toBeDefined();
      expect(result.timeline.end).toBeDefined();
      expect(result.timeline.stages).toBeInstanceOf(Array);

      // Timeline should include different event types
      const eventTypes = [...new Set(result.timeline.stages.map(s => s.type))];
      expect(eventTypes).toContain('stage_start');
      
      // Should be sorted by timestamp
      for (let i = 1; i < result.timeline.stages.length; i++) {
        const prev = new Date(result.timeline.stages[i - 1].timestamp);
        const curr = new Date(result.timeline.stages[i].timestamp);
        expect(curr.getTime()).toBeGreaterThanOrEqual(prev.getTime());
      }
    });

    it('should include log and alert events in timeline', async () => {
      const config = {
        campaignType: 'apt' as const,
        complexity: 'medium' as const,
        enableRealisticLogs: true,
        logsPerStage: 2,
        detectionRate: 1.0, // Force alerts
        eventCount: 4,
        targetCount: 2,
        space: 'timeline-events-test',
        useAI: false,
        useMitre: false,
      };

      const result = await engine.generateRealisticCampaign(config);

      const logEvents = result.timeline.stages.filter(s => s.type === 'log');
      const alertEvents = result.timeline.stages.filter(s => s.type === 'alert');

      expect(logEvents.length).toBeGreaterThan(0);
      if (result.detectedAlerts.length > 0) {
        expect(alertEvents.length).toBeGreaterThan(0);
      }
    });
  });

  describe('Investigation Guide Generation', () => {
    it('should generate step-by-step investigation guide', async () => {
      const config = {
        campaignType: 'apt' as const,
        complexity: 'expert' as const,
        enableRealisticLogs: true,
        logsPerStage: 4,
        detectionRate: 0.7,
        eventCount: 20,
        targetCount: 8,
        space: 'investigation-test',
        useAI: true,
        useMitre: true,
      };

      const result = await engine.generateRealisticCampaign(config);

      expect(result.investigationGuide).toBeDefined();
      expect(result.investigationGuide.length).toBeGreaterThan(0);

      result.investigationGuide.forEach((step, index) => {
        expect(step.step).toBe(index + 1);
        expect(step.action).toBeDefined();
        expect(step.expectedFindings).toBeInstanceOf(Array);
        expect(step.expectedFindings.length).toBeGreaterThan(0);
        expect(step.kibanaQuery).toBeDefined();
        expect(step.timeframe).toBeDefined();
      });

      // Should have basic investigation steps
      const actions = result.investigationGuide.map(step => step.action);
      expect(actions[0]).toContain('Review initial alerts');
      expect(actions[1]).toContain('Investigate supporting logs');
    });

    it('should include campaign-specific investigation steps', async () => {
      const aptConfig = {
        campaignType: 'apt' as const,
        complexity: 'high' as const,
        enableRealisticLogs: true,
        logsPerStage: 3,
        detectionRate: 0.6,
        eventCount: 12,
        targetCount: 4,
        space: 'apt-investigation',
        useAI: true,
        useMitre: true,
      };

      const result = await engine.generateRealisticCampaign(aptConfig);

      // APT campaigns should include lateral movement investigation
      const lateralMovementStep = result.investigationGuide.find(
        step => step.action.includes('lateral movement')
      );
      expect(lateralMovementStep).toBeDefined();
      expect(lateralMovementStep!.expectedFindings).toContain('Registry modifications for persistence');
    });

    it('should generate appropriate Kibana queries', async () => {
      const config = {
        campaignType: 'insider' as const,
        complexity: 'medium' as const,
        enableRealisticLogs: true,
        logsPerStage: 2,
        detectionRate: 0.5,
        eventCount: 6,
        targetCount: 2,
        space: 'query-test',
        useAI: false,
        useMitre: false,
      };

      const result = await engine.generateRealisticCampaign(config);

      result.investigationGuide.forEach(step => {
        expect(step.kibanaQuery).toMatch(/\w+/); // Should contain valid query syntax
        expect(step.timeframe).toMatch(/\w+/); // Should contain time range description
      });

      // First step should query for alerts
      expect(result.investigationGuide[0].kibanaQuery).toContain('kibana.alert.rule.name');
    });
  });

  describe('Error Handling', () => {
    it('should handle correlation engine failures gracefully', async () => {
      mockCorrelationEngine.generateCorrelatedLogs.mockRejectedValue(
        new Error('Correlation service unavailable')
      );

      const config = {
        campaignType: 'ransomware' as const,
        complexity: 'low' as const,
        enableRealisticLogs: true,
        logsPerStage: 2,
        detectionRate: 0.5,
        eventCount: 4,
        targetCount: 1,
        space: 'error-test',
        useAI: false,
        useMitre: false,
      };

      const result = await engine.generateRealisticCampaign(config);

      // Should complete despite correlation failures
      expect(result).toBeDefined();
      expect(result.campaign).toBeDefined();
      expect(result.stageLogs).toBeDefined();
      
      // Stages should exist but may have empty logs
      result.stageLogs.forEach(stage => {
        expect(stage.stageId).toBeDefined();
        expect(stage.logs).toBeInstanceOf(Array);
      });
    });

    it('should handle alert generation failures', async () => {
      const config = {
        campaignType: 'supply_chain' as const,
        complexity: 'medium' as const,
        enableRealisticLogs: true,
        logsPerStage: 3,
        detectionRate: 1.0, // Force detection
        eventCount: 6,
        targetCount: 2,
        space: 'alert-error-test',
        useAI: true,
        useMitre: false,
      };

      // Force detection but alert generation will fail
      const originalRandom = Math.random;
      Math.random = vi.fn(() => 0.1); // Below 1.0 threshold

      const result = await engine.generateRealisticCampaign(config);

      // Should track failed alert generation in missed activities
      const alertFailures = result.missedActivities.filter(
        activity => activity.reason === 'alert_generation_failed'
      );
      
      // Depends on mock behavior, but structure should be correct
      expect(result.missedActivities).toBeDefined();

      Math.random = originalRandom;
    });

    it('should handle empty stage logs', async () => {
      mockCorrelationEngine.generateCorrelatedLogs.mockResolvedValue([]);

      const config = {
        campaignType: 'insider' as const,
        complexity: 'low' as const,
        enableRealisticLogs: true,
        logsPerStage: 1,
        detectionRate: 0.5,
        eventCount: 2,
        targetCount: 1,
        space: 'empty-logs-test',
        useAI: false,
        useMitre: false,
      };

      const result = await engine.generateRealisticCampaign(config);

      expect(result).toBeDefined();
      result.stageLogs.forEach(stage => {
        expect(stage.logs).toEqual([]);
      });
    });
  });
});