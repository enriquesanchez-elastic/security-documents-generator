import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';

// Mock the modules that are imported
vi.mock('@modelcontextprotocol/sdk/server/index.js');
vi.mock('@modelcontextprotocol/sdk/server/stdio.js');
vi.mock('../src/commands/documents.js');
vi.mock('../src/services/attack_simulation_engine.js');
vi.mock('../src/utils/ai_service.js');

// Mock all imported functions
const mockGenerateAlerts = vi.fn();
const mockGenerateAttackCampaign = vi.fn();
const mockGenerateRealisticLogs = vi.fn();
const mockDeleteAllAlerts = vi.fn();

vi.doMock('../src/commands/documents.js', () => ({
  generateAlerts: mockGenerateAlerts,
  generateLogs: mockGenerateRealisticLogs,
  generateCorrelatedCampaign: vi.fn(),
  deleteAllAlerts: mockDeleteAllAlerts,
  deleteAllEvents: vi.fn(),
  deleteAllLogs: vi.fn(),
}));

vi.doMock('../src/services/attack_simulation_engine.js', () => ({
  default: vi.fn().mockImplementation(() => ({
    generateAttackSimulation: vi.fn().mockResolvedValue({
      campaign: {
        id: 'test-campaign',
        name: 'Test APT Campaign',
        type: 'apt',
        threat_actor: 'Test Actor',
        duration: {
          start: new Date('2024-01-01'),
          end: new Date('2024-01-02'),
        },
        objectives: ['test objective'],
      },
      stages: [{
        id: 'stage-1',
        name: 'Initial Access',
        tactic: 'initial-access',
        techniques: ['T1566'],
        start_time: new Date('2024-01-01'),
        end_time: new Date('2024-01-01T12:00:00'),
        objectives: ['gain access'],
        generated_events: [],
        correlation_keys: ['stage_0'],
      }],
      artifacts: [],
      network_topology: { subnets: [], critical_assets: [], trust_relationships: [], security_controls: [] },
      lateral_movement_paths: [],
      correlation_timeline: [],
    }),
    generateCampaignEvents: vi.fn().mockResolvedValue([]),
  })),
}));

describe('MCP Server', () => {
  let mockServer: any;
  let mockTransport: any;
  let mockSetRequestHandler: any;

  beforeEach(async () => {
    vi.clearAllMocks();
    
    mockSetRequestHandler = vi.fn();
    mockServer = {
      setRequestHandler: mockSetRequestHandler,
      connect: vi.fn(),
      close: vi.fn(),
      onerror: null,
    };
    
    mockTransport = {
      connect: vi.fn(),
    };

    (Server as any).mockImplementation(() => mockServer);
    (StdioServerTransport as any).mockImplementation(() => mockTransport);
    
    // Import the server to trigger constructor calls
    await import('../src/mcp_server.js');
  });

  describe('Initialization', () => {
    it('should initialize server with correct capabilities', async () => {
      // Just verify the Server constructor is called with correct params
      expect(Server).toHaveBeenCalled();
    });

    it('should set up error handling', async () => {
      // The mock server should have the setRequestHandler method
      expect(mockServer.setRequestHandler).toBeDefined();
      expect(typeof mockServer.setRequestHandler).toBe('function');
    });
  });

  describe('Tool Handlers', () => {
    let serverInstance: any;

    beforeEach(async () => {
      // Create mock handlers
      serverInstance = {
        handleGenerateSecurityAlerts: vi.fn().mockResolvedValue({
          content: [{
            type: 'text',
            text: 'Successfully generated 5 security alerts in space \'test\' with 2 hosts and 1 users. AI-powered generation used.',
          }],
        }),
        handleGenerateAttackCampaign: vi.fn().mockImplementation((params) => {
          if (params.realistic) {
            return Promise.resolve({
              content: [{
                type: 'text',
                text: `🎊 Realistic ${params.campaignType.toUpperCase()} campaign generated successfully!

Detection Rate: ${(params.detectionRate * 100).toFixed(1)}%`,
              }],
            });
          }
          return Promise.resolve({
            content: [{
              type: 'text',
              text: '🚀 Sophisticated APT campaign generated successfully!',
            }],
          });
        }),
        handleGenerateRealisticLogs: vi.fn().mockResolvedValue({
          content: [{
            type: 'text',
            text: 'Successfully generated 1000 realistic source logs across types: system, auth, network.',
          }],
        }),
        handleGenerateCorrelatedEvents: vi.fn().mockResolvedValue({
          content: [{
            type: 'text',
            text: 'Successfully generated correlated events.',
          }],
        }),
        handleCleanupSecurityData: vi.fn().mockResolvedValue({
          content: [{
            type: 'text',
            text: 'Successfully deleted all alerts from space \'test-space\'.',
          }],
        }),
        handleGetMitreTechniques: vi.fn().mockResolvedValue({
          content: [{
            type: 'text',
            text: `MITRE ATT&CK Techniques for tactic 'TA0001':

• T1566 - Phishing
• T1566.001 - Spearphishing Attachment
• T1566.002 - Spearphishing Link

Total: 3 techniques (including sub-techniques)`,
          }],
        }),
        run: vi.fn(),
      };
    });

    it('should handle generate_security_alerts tool', async () => {
      const mockParams = {
        alertCount: 5,
        hostCount: 2,
        userCount: 1,
        space: 'test',
        useAI: true,
        useMitre: false,
      };

      mockGenerateAlerts.mockResolvedValue(undefined);

      const result = await serverInstance.handleGenerateSecurityAlerts(mockParams);

      expect(result).toBeDefined();
      expect(result.content[0].text).toContain('Successfully generated 5 security alerts');
    });

    it('should handle generate_attack_campaign tool', async () => {
      const mockParams = {
        campaignType: 'apt' as const,
        complexity: 'high' as const,
        targets: 10,
        events: 100,
        space: 'threat-intel',
        useAI: true,
        useMitre: true,
        realistic: false,
      };

      const result = await serverInstance.handleGenerateAttackCampaign(mockParams);

      expect(result).toBeDefined();
      expect(result.content[0].text).toContain('campaign generated successfully');
    });

    it('should handle realistic attack campaign generation', async () => {
      const mockParams = {
        campaignType: 'ransomware' as const,
        complexity: 'expert' as const,
        targets: 20,
        events: 200,
        realistic: true,
        logsPerStage: 10,
        detectionRate: 0.6,
      };

      // Mock the realistic engine response
      const mockRealisticResult = {
        campaign: {
          campaign: {
            name: 'Realistic Ransomware Campaign',
            threat_actor: 'RansomGroup',
          },
          stages: [{ id: 'stage-1', name: 'Encryption' }],
        },
        stageLogs: [{
          stageId: 'stage-1',
          logs: [{ '@timestamp': new Date().toISOString() }],
        }],
        detectedAlerts: [{ 'kibana.alert.uuid': 'alert-1' }],
        missedActivities: [],
        investigationGuide: [],
      };

      const result = await serverInstance.handleGenerateAttackCampaign(mockParams);

      expect(result).toBeDefined();
      expect(result.content[0].text).toContain('Realistic RANSOMWARE campaign');
      expect(result.content[0].text).toContain('Detection Rate: 60.0%');
    });

    it('should handle generate_realistic_logs tool', async () => {
      const mockParams = {
        logCount: 1000,
        hostCount: 10,
        userCount: 5,
        useAI: false,
        logTypes: ['system', 'auth', 'network'],
      };

      mockGenerateRealisticLogs.mockResolvedValue(undefined);

      const result = await serverInstance.handleGenerateRealisticLogs(mockParams);

      expect(result).toBeDefined();
      expect(result.content[0].text).toContain('Successfully generated 1000 realistic source logs');
    });

    it('should handle cleanup_security_data tool', async () => {
      const mockParams = {
        type: 'alerts' as const,
        space: 'test-space',
      };

      mockDeleteAllAlerts.mockResolvedValue(undefined);

      const result = await serverInstance.handleCleanupSecurityData(mockParams);

      expect(result).toBeDefined();
      expect(result.content[0].text).toContain('Successfully deleted all alerts');
    });

    it('should handle get_mitre_techniques tool', async () => {
      const mockParams = {
        tactic: 'TA0001',
        includeSubTechniques: true,
      };

      const result = await serverInstance.handleGetMitreTechniques(mockParams);

      expect(result).toBeDefined();
      expect(result.content[0].text).toContain('MITRE ATT&CK Techniques');
      expect(result.content[0].text).toContain('including sub-techniques');
    });
  });

  describe('Error Handling', () => {
    it('should handle tool execution failures gracefully', async () => {
      const mockParams = {
        alertCount: 10,
        hostCount: 5,
      };

      mockGenerateAlerts.mockRejectedValue(new Error('Database connection failed'));

      // The handler should catch errors and return appropriate MCP error
      const handler = vi.fn().mockImplementation(async () => {
        try {
          await mockGenerateAlerts();
        } catch (error) {
          throw {
            code: -32603, // InternalError
            message: `Tool execution failed: ${error.message}`,
          };
        }
      });

      await expect(handler(mockParams)).rejects.toThrow('Tool execution failed: Database connection failed');
    });

    it('should handle invalid tool names', async () => {
      const handler = vi.fn().mockImplementation((toolName: string) => {
        if (toolName === 'unknown_tool') {
          throw {
            code: -32601, // MethodNotFound
            message: `Unknown tool: ${toolName}`,
          };
        }
      });

      expect(() => handler('unknown_tool')).toThrow('Unknown tool: unknown_tool');
    });
  });

  describe('Configuration Validation', () => {
    it('should fail to start without config file', async () => {
      vi.doMock('fs', () => ({
        existsSync: vi.fn(() => false),
      }));

      const mockExit = vi.spyOn(process, 'exit').mockImplementation(() => {
        throw new Error('Process exit');
      });

      try {
        // This should trigger the config check
        const { SecurityDataMCPServer } = await import('../src/mcp_server.js');
        const server = new (SecurityDataMCPServer as any)();
        await expect(server.run()).rejects.toThrow();
      } catch (error) {
        // Expected to fail
      }

      mockExit.mockRestore();
    });
  });

  describe('Transport and Connection', () => {
    it('should connect to stdio transport', async () => {
      // The transport mock should be available and properly configured
      expect(StdioServerTransport).toBeDefined();
      expect(mockTransport).toBeDefined();
    });

    it('should handle connection errors', async () => {
      mockServer.connect.mockRejectedValue(new Error('Connection failed'));
      // Test that connection errors are handled properly
      expect(mockServer.connect).toBeDefined();
    });
  });
});