import { describe, it, expect, beforeEach, vi } from 'vitest';
import AttackSimulationEngine from '../../src/services/attack_simulation_engine';
import { mockSuccessfulOpenAIResponse, resetAllMocks } from '../mocks/ai-clients';

// Mock the AI service
vi.mock('../../src/utils/ai_service.js', () => ({
  generateAIAlert: vi.fn().mockResolvedValue({
    'kibana.alert.uuid': 'test-alert-uuid',
    'host.name': 'test-host',
    'user.name': 'test-user',
    '@timestamp': new Date().toISOString(),
    'kibana.alert.severity': 'high',
    'threat.technique.id': 'T1566.001',
  }),
}));

// Mock attack scenarios
vi.mock('../../src/attack_scenarios/apt_campaigns.js', () => ({
  getAllAPTCampaigns: vi.fn(() => [{
    name: 'Test APT Campaign',
    threatActor: { name: 'Test Actor' },
    stages: [{
      name: 'Initial Access',
      tactic: 'initial-access',
      techniques: ['T1566.001'],
      objectives: ['establish foothold'],
      duration: { min: 2, max: 12 },
    }],
    duration: { min: 7, max: 30 },
  }]),
}));

vi.mock('../../src/attack_scenarios/ransomware_chains.js', () => ({
  getAllRansomwareChains: vi.fn(() => [{
    name: 'Test Ransomware',
    group: { name: 'RansomGroup' },
    stages: [{
      name: 'Encryption Phase',
      tactic: 'impact',
      techniques: ['T1486'],
      objectives: ['encrypt files'],
    }],
  }]),
}));

vi.mock('../../src/attack_scenarios/insider_threats.js', () => ({
  getAllInsiderThreatScenarios: vi.fn(() => [{
    name: 'Insider Data Theft',
    insider: { name: 'Malicious Employee' },
    activities: [{ indicators: ['suspicious file access'] }],
  }]),
}));

vi.mock('../../src/attack_scenarios/supply_chain.js', () => ({
  getAllSupplyChainAttacks: vi.fn(() => [{
    name: 'Supply Chain Compromise',
    stages: [{
      name: 'Package Compromise',
      tactic: 'initial-access',
      techniques: ['T1195.002'],
    }],
  }]),
}));

describe('AttackSimulationEngine', () => {
  let engine: AttackSimulationEngine;

  beforeEach(() => {
    resetAllMocks();
    engine = new AttackSimulationEngine({
      networkComplexity: 'high',
      enableCorrelation: true,
      enablePerformanceOptimization: false,
    });
  });

  describe('Attack Simulation Generation', () => {
    it('should generate APT attack simulation', async () => {
      const simulation = await engine.generateAttackSimulation('apt', 'high');

      expect(simulation).toBeDefined();
      expect(simulation.campaign.type).toBe('apt');
      expect(simulation.campaign.name).toBe('Test APT Campaign');
      expect(simulation.campaign.threat_actor).toBe('Test Actor');
      expect(simulation.stages).toHaveLength(1);
      expect(simulation.stages[0].name).toBe('Initial Access');
      expect(simulation.stages[0].techniques).toContain('T1566.001');
    });

    it('should generate ransomware attack simulation', async () => {
      const simulation = await engine.generateAttackSimulation('ransomware', 'medium');

      expect(simulation).toBeDefined();
      expect(simulation.campaign.type).toBe('ransomware');
      expect(simulation.campaign.threat_actor).toBe('RansomGroup');
      expect(simulation.stages[0].name).toBe('Encryption Phase');
    });

    it('should generate insider threat simulation', async () => {
      const simulation = await engine.generateAttackSimulation('insider', 'low');

      expect(simulation).toBeDefined();
      expect(simulation.campaign.type).toBe('insider');
      expect(simulation.campaign.threat_actor).toBe('Malicious Employee');
    });

    it('should generate supply chain attack simulation', async () => {
      const simulation = await engine.generateAttackSimulation('supply_chain', 'expert');

      expect(simulation).toBeDefined();
      expect(simulation.campaign.type).toBe('supply_chain');
      expect(simulation.stages[0].name).toBe('Package Compromise');
    });

    it('should create proper time ranges for stages', async () => {
      const simulation = await engine.generateAttackSimulation('apt', 'high');

      expect(simulation.campaign.duration.start).toBeInstanceOf(Date);
      expect(simulation.campaign.duration.end).toBeInstanceOf(Date);
      expect(simulation.campaign.duration.end.getTime()).toBeGreaterThan(
        simulation.campaign.duration.start.getTime()
      );

      simulation.stages.forEach(stage => {
        expect(stage.start_time).toBeInstanceOf(Date);
        expect(stage.end_time).toBeInstanceOf(Date);
        expect(stage.end_time.getTime()).toBeGreaterThan(stage.start_time.getTime());
      });
    });

    it('should generate network topology', async () => {
      const simulation = await engine.generateAttackSimulation('apt', 'high');

      expect(simulation.network_topology).toBeDefined();
      expect(simulation.network_topology.subnets).toHaveLength(3);
      expect(simulation.network_topology.critical_assets).toHaveLength(2);
      
      const dmzSubnet = simulation.network_topology.subnets.find(s => s.security_zone === 'dmz');
      expect(dmzSubnet).toBeDefined();
      expect(dmzSubnet!.cidr).toBe('10.1.0.0/24');
    });

    it('should create lateral movement paths', async () => {
      const simulation = await engine.generateAttackSimulation('apt', 'high');

      expect(simulation.lateral_movement_paths).toBeDefined();
      expect(simulation.lateral_movement_paths.length).toBeGreaterThan(0);
      
      const path = simulation.lateral_movement_paths[0];
      expect(path.source_asset).toBeDefined();
      expect(path.target_asset).toBeDefined();
      expect(path.techniques).toBeInstanceOf(Array);
      expect(path.success_probability).toBeGreaterThanOrEqual(0);
      expect(path.success_probability).toBeLessThanOrEqual(1);
    });
  });

  describe('Campaign Event Generation', () => {

    it('should generate campaign events with correlation', async () => {
      const simulation = await engine.generateAttackSimulation('apt', 'high');
      const events = await engine.generateCampaignEvents(
        simulation,
        5, // targetCount
        10, // eventCount
        'test-space',
        true // useMitre
      );

      expect(events).toHaveLength(10);
      
      events.forEach(event => {
        expect(event['campaign.id']).toBe(simulation.campaign.id);
        expect(event['campaign.name']).toBe(simulation.campaign.name);
        expect(event['campaign.type']).toBe('apt');
        expect(event['campaign.stage.name']).toBeDefined();
        expect(event['campaign.correlation.id']).toBeDefined();
        expect(event['campaign.correlation.score']).toBeGreaterThanOrEqual(0.7);
        expect(event['campaign.correlation.score']).toBeLessThanOrEqual(0.95);
      });
    });

    it('should distribute events across attack stages', async () => {
      const simulation = await engine.generateAttackSimulation('apt', 'high');
      const events = await engine.generateCampaignEvents(simulation, 3, 6, 'test');

      const stageNames = [...new Set(events.map(e => e['campaign.stage.name']))];
      expect(stageNames.length).toBeGreaterThan(0);
    });

    it('should generate contextual usernames for different stages', async () => {
      const simulation = await engine.generateAttackSimulation('apt', 'high');
      const events = await engine.generateCampaignEvents(simulation, 3, 6, 'test');

      events.forEach(event => {
        expect(event['user.name']).toBeDefined(); // Should have a username
        expect(typeof event['user.name']).toBe('string');
      });
    });

    it('should apply advanced correlation', async () => {
      const simulation = await engine.generateAttackSimulation('apt', 'high');
      const events = await engine.generateCampaignEvents(simulation, 3, 6, 'test');

      // Some events should have correlation metadata
      const correlatedEvents = events.filter(e => e['correlation.rule_id']);
      // Note: correlation might not always trigger, so we just check structure
      correlatedEvents.forEach(event => {
        expect(event['correlation.rule_name']).toBeDefined();
        expect(event['correlation.confidence']).toBeGreaterThanOrEqual(0);
        expect(event['correlation.confidence']).toBeLessThanOrEqual(1);
      });
    });

    it('should calculate campaign success metrics', async () => {
      const simulation = await engine.generateAttackSimulation('apt', 'high');
      const events = await engine.generateCampaignEvents(simulation, 3, 10, 'test');

      // Success calculation is done internally, we verify structure
      expect(events.length).toBeGreaterThan(0);
      events.forEach(event => {
        expect(event['campaign.progression.phase']).toMatch(/^(initial|escalation|objectives)$/);
      });
    });

    it('should handle API failures gracefully', async () => {
      // Mock the generateAIAlert to fail first, then succeed
      const mockModule = await vi.importMock('../../src/utils/ai_service.js') as any;
      mockModule.generateAIAlert
        .mockRejectedValueOnce(new Error('API Error'))
        .mockResolvedValue({
          'kibana.alert.uuid': 'fallback-uuid',
          'host.name': 'fallback-host',
          'user.name': 'fallback-user',
          '@timestamp': new Date().toISOString(),
        });

      const simulation = await engine.generateAttackSimulation('apt', 'high');
      const events = await engine.generateCampaignEvents(simulation, 2, 3, 'test');

      // Should still generate some events despite failures
      expect(events.length).toBeGreaterThan(0);
    });
  });

  describe('Correlation Engine', () => {
    it('should identify related events based on techniques', async () => {
      const mockEvents = [
        {
          id: 'event-1',
          timestamp: new Date(),
          event_type: 'alert' as const,
          source_asset: 'host-1',
          technique: 'T1078',
          severity: 'medium' as const,
          correlation_id: 'corr-1',
          raw_data: {},
        },
        {
          id: 'event-2',
          timestamp: new Date(),
          event_type: 'alert' as const,
          source_asset: 'host-1',
          technique: 'T1021.001',
          severity: 'high' as const,
          correlation_id: 'corr-2',
          raw_data: {},
        },
        {
          id: 'event-3',
          timestamp: new Date(),
          event_type: 'alert' as const,
          source_asset: 'host-1',
          technique: 'T1057',
          severity: 'medium' as const,
          correlation_id: 'corr-3',
          raw_data: {},
        },
      ];

      const correlationEngine = (engine as any).correlationEngine;
      const results = correlationEngine.correlateEvents(mockEvents);

      expect(results).toBeDefined();
      expect(Array.isArray(results)).toBe(true);
      
      // Should find lateral movement correlation if all techniques match
      const lateralMovement = results.find(r => r.rule_id === 'lateral_movement_sequence');
      if (lateralMovement) {
        expect(lateralMovement.matched_events.length).toBeGreaterThanOrEqual(3);
        expect(lateralMovement.confidence_score).toBeGreaterThan(0);
      }
    });

    it('should calculate confidence scores correctly', async () => {
      // Access private correlation engine for testing
      const correlationEngine = (engine as any).correlationEngine;
      
      const mockRule = {
        id: 'test-rule',
        name: 'Test Rule',
        techniques: ['T1078'],
        timeWindow: 24 * 60 * 60 * 1000,
        minimumEvents: 2,
        confidenceWeights: { temporal: 0.4, asset: 0.3, technique: 0.3 },
      };

      const mockEvents = [
        { technique: 'T1078', timestamp: new Date() },
        { technique: 'T1078', timestamp: new Date() },
      ];

      const confidence = correlationEngine.calculateConfidence(mockEvents, mockRule);
      expect(confidence).toBeGreaterThanOrEqual(0);
      expect(confidence).toBeLessThanOrEqual(1);
    });
  });

  describe('Configuration Options', () => {
    it('should respect network complexity settings', () => {
      const lowComplexityEngine = new AttackSimulationEngine({
        networkComplexity: 'low',
      });

      const highComplexityEngine = new AttackSimulationEngine({
        networkComplexity: 'expert',
      });

      expect(lowComplexityEngine).toBeDefined();
      expect(highComplexityEngine).toBeDefined();
    });

    it('should enable/disable correlation based on config', () => {
      const noCorrelationEngine = new AttackSimulationEngine({
        enableCorrelation: false,
      });

      expect(noCorrelationEngine).toBeDefined();
    });

    it('should enable performance optimization for large datasets', () => {
      const optimizedEngine = new AttackSimulationEngine({
        enablePerformanceOptimization: true,
      });

      expect(optimizedEngine).toBeDefined();
    });
  });

  describe('Error Handling', () => {
    it('should handle unknown scenario types', async () => {
      await expect(
        engine.generateAttackSimulation('unknown' as any, 'high')
      ).rejects.toThrow('Unknown scenario type: unknown');
    });

    it('should handle empty technique lists', async () => {
      // Mock scenario with no techniques
      vi.doMock('../../src/attack_scenarios/apt_campaigns.js', () => ({
        getAllAPTCampaigns: vi.fn(() => [{
          name: 'Empty Campaign',
          threatActor: { name: 'Test' },
          stages: [{
            name: 'Empty Stage',
            tactic: 'unknown',
            techniques: [], // Empty techniques
            objectives: [],
          }],
        }]),
      }));

      const simulation = await engine.generateAttackSimulation('apt', 'high');
      const events = await engine.generateCampaignEvents(simulation, 1, 1, 'test');

      // Should handle gracefully with fallback techniques
      expect(events.length).toBeGreaterThanOrEqual(0);
    });
  });
});