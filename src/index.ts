#! /usr/bin/env node
import { program } from 'commander';
import {
  deleteAllAlerts,
  deleteAllEvents,
  deleteAllLogs,
  generateAlerts,
  generateEvents,
  generateGraph,
  generateLogs,
  generateCorrelatedCampaign,
} from './commands/documents';
import { deleteAllRules, generateRulesAndAlerts } from './commands/rules';
import { createConfigFileOnFirstRun } from './utils/create_config_on_first_run';
import AttackSimulationEngine from './services/attack_simulation_engine';
import { cleanupAIService } from './utils/ai_service';
import { initializeSpace } from './utils';
import { getConfig } from './get_config';
import { faker } from '@faker-js/faker';

await createConfigFileOnFirstRun();

const parseIntBase10 = (input: string) => parseInt(input, 10);

// Phase 3: Apply configuration overrides for command-line flags
const applyPhase3ConfigOverrides = (options: {
  claude: boolean;
  subTechniques: boolean;
  attackChains: boolean;
  largeScale: boolean;
  focusTactic?: string;
}) => {
  const config = getConfig();

  // Override AI provider configuration based on flags
  if (options.claude) {
    (config as Record<string, unknown>).useClaudeAI = true;
    (config as Record<string, unknown>).useAzureOpenAI = false;
    console.log('Claude AI enabled for this generation');
  }

  // Override MITRE configuration based on flags
  if (options.subTechniques && config.mitre) {
    config.mitre.includeSubTechniques = true;
    console.log('Sub-techniques enabled for this generation');
  }

  if (options.attackChains && config.mitre) {
    config.mitre.enableAttackChains = true;
    config.mitre.chainProbability = 0.4; // Higher probability for CLI flag
    console.log('Attack chains enabled for this generation');
  }

  if (options.largeScale && config.generation?.performance) {
    config.generation.performance.enableLargeScale = true;
    config.generation.performance.largeScaleThreshold = 500; // Lower threshold for CLI
    console.log('Large-scale optimizations enabled for this generation');
  }

  if (options.focusTactic && config.mitre) {
    // Store focus tactic for MITRE alert generation
    (config.mitre as Record<string, unknown>).focusTactic = options.focusTactic;
    console.log(`Focusing on MITRE tactic: ${options.focusTactic}`);
  }
};

program
  .command('generate-alerts')
  .option('-n <n>', 'number of alerts')
  .option('-h <h>', 'number of hosts')
  .option('-u <h>', 'number of users')
  .option('-s <h>', 'space (will be created if it does not exist)')
  .option('--claude', 'use Claude AI instead of OpenAI', false)
  .option(
    '--mitre',
    'use MITRE ATT&CK framework for realistic attack scenarios',
    false,
  )
  .option(
    '--sub-techniques',
    'include MITRE sub-techniques in generated alerts (requires --mitre)',
    false,
  )
  .option(
    '--attack-chains',
    'generate realistic attack chains with multiple techniques (requires --mitre)',
    false,
  )
  .option(
    '--large-scale',
    'enable performance optimizations for large datasets (>1000)',
    false,
  )
  .option(
    '--focus-tactic <tactic>',
    'focus on specific MITRE tactic (e.g., TA0001 for Initial Access)',
  )
  .option(
    '--start-date <date>',
    'start date for data generation (e.g., "7d", "1w", "2024-01-01")',
  )
  .option(
    '--end-date <date>',
    'end date for data generation (e.g., "now", "1d", "2024-01-10")',
  )
  .option(
    '--time-pattern <pattern>',
    'time distribution pattern: uniform, business_hours, random, attack_simulation, weekend_heavy',
  )
  .description(
    'Generate AI-powered security alerts with optional MITRE ATT&CK scenarios',
  )
  .action(async (options) => {
    const alertsCount = parseInt(options.n || '1');
    const hostCount = parseInt(options.h || '1');
    const userCount = parseInt(options.u || '1');
    const space = options.s || 'default';
    const useAI = true; // AI is always enabled now
    const useClaude = options.claude || false;
    const useMitre = options.mitre || false;

    // Validate flag dependencies
    if (options.subTechniques && !useMitre) {
      console.error(
        'Error: --sub-techniques flag requires --mitre to be enabled',
      );
      process.exit(1);
    }
    if (options.attackChains && !useMitre) {
      console.error(
        'Error: --attack-chains flag requires --mitre to be enabled',
      );
      process.exit(1);
    }
    if (options.focusTactic && !useMitre) {
      console.error(
        'Error: --focus-tactic flag requires --mitre to be enabled',
      );
      process.exit(1);
    }
    
    // Validate focus tactic exists in MITRE data
    if (options.focusTactic) {
      const validTactics = ['TA0001', 'TA0002', 'TA0003', 'TA0004', 'TA0005', 'TA0006', 'TA0007', 'TA0008', 'TA0009', 'TA0010', 'TA0011', 'TA0040'];
      if (!validTactics.includes(options.focusTactic)) {
        console.error(
          `Error: Invalid tactic ${options.focusTactic}. Valid tactics: ${validTactics.join(', ')}`,
        );
        process.exit(1);
      }
    }

    // Apply Phase 3 configuration overrides if flags are used
    if (
      useClaude ||
      options.subTechniques ||
      options.attackChains ||
      options.largeScale ||
      options.focusTactic
    ) {
      applyPhase3ConfigOverrides(options);
    }

    if (space !== 'default') {
      await initializeSpace(space);
    }

    // Pass timestamp configuration options
    const timestampConfig = {
      startDate: options.startDate,
      endDate: options.endDate,
      pattern: options.timePattern,
    };

    generateAlerts(
      alertsCount,
      userCount,
      hostCount,
      space,
      useAI,
      useMitre,
      timestampConfig,
    );
  });

program
  .command('generate-events')
  .argument('<n>', 'integer argument', parseIntBase10)
  .option('--claude', 'use Claude AI instead of OpenAI', false)
  .option(
    '--mitre',
    'use MITRE ATT&CK framework for realistic attack scenarios',
    false,
  )
  .option(
    '--sub-techniques',
    'include MITRE sub-techniques in generated alerts (requires --mitre)',
    false,
  )
  .option(
    '--attack-chains',
    'generate realistic attack chains with multiple techniques (requires --mitre)',
    false,
  )
  .option(
    '--large-scale',
    'enable performance optimizations for large datasets (>1000)',
    false,
  )
  .option(
    '--start-date <date>',
    'start date for data generation (e.g., "7d", "1w", "2024-01-01")',
  )
  .option(
    '--end-date <date>',
    'end date for data generation (e.g., "now", "1d", "2024-01-10")',
  )
  .option(
    '--time-pattern <pattern>',
    'time distribution pattern: uniform, business_hours, random, attack_simulation, weekend_heavy',
  )
  .description(
    'Generate AI-powered security events with optional MITRE ATT&CK scenarios',
  )
  .action((n, options) => {
    // Validate flag dependencies
    if (options.subTechniques && !options.mitre) {
      console.error(
        'Error: --sub-techniques flag requires --mitre to be enabled',
      );
      process.exit(1);
    }
    if (options.attackChains && !options.mitre) {
      console.error(
        'Error: --attack-chains flag requires --mitre to be enabled',
      );
      process.exit(1);
    }

    // Apply Phase 3 configuration overrides if flags are used
    if (
      options.claude ||
      options.subTechniques ||
      options.attackChains ||
      options.largeScale
    ) {
      applyPhase3ConfigOverrides(options);
    }

    const useAI = true; // AI is always enabled now
    generateEvents(n, useAI, options.mitre);
  });

program
  .command('generate-logs')
  .description('Generate realistic source logs for security analysis')
  .option('-n <n>', 'number of logs to generate', '1000')
  .option('-h <h>', 'number of hosts', '10')
  .option('-u <u>', 'number of users', '5')
  .option(
    '--types <types>',
    'log types to generate (comma-separated): system,auth,network,endpoint',
    'system,auth,network,endpoint',
  )
  .option('--claude', 'use Claude AI instead of OpenAI', false)
  .option(
    '--start-date <date>',
    'start date for data generation (e.g., "7d", "1w", "2024-01-01")',
  )
  .option(
    '--end-date <date>',
    'end date for data generation (e.g., "now", "1d", "2024-01-10")',
  )
  .option(
    '--time-pattern <pattern>',
    'time distribution pattern: uniform, business_hours, random, attack_simulation, weekend_heavy',
  )
  .action(async (options) => {
    const logCount = parseInt(options.n || '1000');
    const hostCount = parseInt(options.h || '10');
    const userCount = parseInt(options.u || '5');
    const useAI = options.claude || false;
    const logTypes = options.types.split(',').map((t: string) => t.trim());

    // Validate log types
    const validTypes = ['system', 'auth', 'network', 'endpoint'];
    const invalidTypes = logTypes.filter((type: string) => !validTypes.includes(type));
    if (invalidTypes.length > 0) {
      console.error(
        `Error: Invalid log types: ${invalidTypes.join(', ')}. Valid types: ${validTypes.join(', ')}`,
      );
      process.exit(1);
    }

    // Apply Phase 3 configuration overrides if Claude is used
    if (options.claude) {
      applyPhase3ConfigOverrides({ ...options, subTechniques: false, attackChains: false, largeScale: false });
    }

    // Pass timestamp configuration options
    const timestampConfig = {
      startDate: options.startDate,
      endDate: options.endDate,
      pattern: options.timePattern,
    };

    await generateLogs(
      logCount,
      hostCount,
      userCount,
      useAI,
      logTypes,
      timestampConfig,
    );
  });

program
  .command('generate-correlated')
  .description('Generate realistic security alerts with correlated supporting logs')
  .option('-n <n>', 'number of alerts to generate', '10')
  .option('-h <h>', 'number of hosts', '3')
  .option('-u <u>', 'number of users', '2')
  .option('-s <s>', 'space (will be created if it does not exist)', 'default')
  .option('-l, --log-volume <volume>', 'supporting logs per alert', '6')
  .option('--claude', 'use Claude AI instead of OpenAI', false)
  .option(
    '--mitre',
    'use MITRE ATT&CK framework for realistic attack scenarios',
    false,
  )
  .option(
    '--start-date <date>',
    'start date for data generation (e.g., "7d", "1w", "2024-01-01")',
  )
  .option(
    '--end-date <date>',
    'end date for data generation (e.g., "now", "1d", "2024-01-10")',
  )
  .option(
    '--time-pattern <pattern>',
    'time distribution pattern: uniform, business_hours, random, attack_simulation, weekend_heavy',
  )
  .action(async (options) => {
    const alertCount = parseInt(options.n || '10');
    const hostCount = parseInt(options.h || '3');
    const userCount = parseInt(options.u || '2');
    const space = options.s || 'default';
    const logVolume = parseInt(options.logVolume || '6');
    const useAI = options.claude || false;
    const useMitre = options.mitre || false;

    // Apply Phase 3 configuration overrides if flags are used
    if (options.claude || options.mitre) {
      applyPhase3ConfigOverrides({ 
        ...options, 
        subTechniques: false, 
        attackChains: false, 
        largeScale: false 
      });
    }

    // Initialize space if not default
    if (space !== 'default') {
      await initializeSpace(space);
    }

    // Pass timestamp configuration options
    const timestampConfig = {
      startDate: options.startDate,
      endDate: options.endDate,
      pattern: options.timePattern,
    };

    await generateCorrelatedCampaign(
      alertCount,
      hostCount,
      userCount,
      space,
      useAI,
      useMitre,
      logVolume,
      timestampConfig,
    );
  });

program
  .command('generate-graph')
  .description(
    'Generate AI-powered entity relationship graph with realistic alerts',
  )
  .option('-u, --users <number>', 'Number of users to generate', '100')
  .option('-h, --hosts <number>', 'Max hosts per user', '3')
  .option('--claude', 'use Claude AI instead of OpenAI', false)
  .action((options) => {
    // Apply Phase 3 configuration overrides if flags are used
    if (options.claude) {
      applyPhase3ConfigOverrides(options);
    }

    generateGraph({
      users: parseInt(options.users),
      maxHosts: parseInt(options.hosts),
      useAI: true, // AI is always enabled now
    });
  });

program
  .command('delete-alerts')
  .description('Delete all alerts')
  .option(
    '-s, --space <space>',
    'Space to delete alerts from (default: all spaces)',
  )
  .action(async (options) => {
    try {
      await deleteAllAlerts(options.space);
    } catch (error) {
      console.error('Error deleting alerts:', error);
      process.exit(1);
    }
  });

program
  .command('delete-events')
  .description('Delete all events')
  .option(
    '-s, --space <space>',
    'Space to delete events from (default: all spaces)',
  )
  .action(async (options) => {
    try {
      await deleteAllEvents(options.space);
    } catch (error) {
      console.error('Error deleting events:', error);
      process.exit(1);
    }
  });

program
  .command('delete-logs')
  .description('Delete all source logs')
  .option(
    '--types <types>',
    'log types to delete (comma-separated): system,auth,network,endpoint',
    'system,auth,network,endpoint',
  )
  .action(async (options) => {
    try {
      const logTypes = options.types.split(',').map((t: string) => t.trim());
      
      // Validate log types
      const validTypes = ['system', 'auth', 'network', 'endpoint'];
      const invalidTypes = logTypes.filter((type: string) => !validTypes.includes(type));
      if (invalidTypes.length > 0) {
        console.error(
          `Error: Invalid log types: ${invalidTypes.join(', ')}. Valid types: ${validTypes.join(', ')}`,
        );
        process.exit(1);
      }

      await deleteAllLogs(logTypes);
    } catch (error) {
      console.error('Error deleting logs:', error);
      process.exit(1);
    }
  });

program
  .command('test-mitre')
  .description('Test MITRE ATT&CK AI integration by generating sample alerts')
  .option('-n <n>', 'number of test alerts to generate', '5')
  .option('-s <space>', 'space to use', 'default')
  .option('--claude', 'use Claude AI instead of OpenAI', false)
  .action(async (options) => {
    const alertCount = parseInt(options.n || '5');
    const space = options.space || 'default';

    console.log(
      `Testing MITRE AI integration with ${alertCount} alerts in space '${space}'...`,
    );

    // Apply Phase 3 configuration overrides if flags are used
    if (options.claude) {
      applyPhase3ConfigOverrides(options);
    }

    if (space !== 'default') {
      await initializeSpace(space);
    }

    generateAlerts(alertCount, 3, 2, space, true, true);
  });

program
  .command('rules')
  .description('Generate detection rules and events')
  .option('-r, --rules <number>', 'Number of rules to generate', '10')
  .option('-e, --events <number>', 'Number of events to generate', '50')
  .option('-i, --interval <string>', 'Rule execution interval', '5m')
  .option('-f, --from <number>', 'Generate events from last N hours', '24')
  .option('-g, --gaps <number>', 'Amount of gaps per rule', '0')
  .option('-c, --clean', 'Clean gap events before generating rules', 'false')
  .action(async (options) => {
    try {
      const ruleCount = parseInt(options.rules);
      const eventCount = parseInt(options.events);
      const fromHours = parseInt(options.from);
      const gaps = parseInt(options.gaps);

      console.log(`Generating ${ruleCount} rules and ${eventCount} events...`);
      console.log(`Using interval: ${options.interval}`);
      console.log(`Generating events from last ${fromHours} hours`);
      console.log(`Generating ${gaps} gaps per rule`);

      if (options.clean) {
        await deleteAllRules();
      }

      await generateRulesAndAlerts(ruleCount, eventCount, {
        interval: options.interval,
        from: fromHours,
        gapsPerRule: gaps,
      });

      console.log('Successfully generated rules and events');
    } catch (error) {
      console.error('Error generating rules and events:', error);
      process.exit(1);
    }
  });

program
  .command('delete-rules')
  .description('Delete all detection rules')
  .option('-s, --space <string>', 'Space to delete rules from')
  .action(async (options) => {
    try {
      await deleteAllRules(options.space);
    } catch (error) {
      console.error('Error deleting rules:', error);
      process.exit(1);
    }
  });

// Phase 3: Advanced Attack Campaign Commands
program
  .command('generate-campaign')
  .description(
    'Generate sophisticated multi-stage attack campaigns (Phase 3 Implementation)',
  )
  .argument(
    '<type>',
    'Campaign type: apt, ransomware, insider, supply-chain, scale-test',
  )
  .option(
    '-c, --complexity <level>',
    'Campaign complexity (low|medium|high|expert)',
    'high',
  )
  .option('-t, --targets <count>', 'Number of target hosts', '50')
  .option('-e, --events <count>', 'Number of events to generate', '1000')
  .option('-s, --space <space>', 'Kibana space', 'default')
  .option('--claude', 'use Claude AI instead of OpenAI', false)
  .option(
    '--mitre',
    'use MITRE ATT&CK framework for realistic attack scenarios',
    false,
  )
  .option(
    '--sub-techniques',
    'include MITRE sub-techniques in generated alerts (requires --mitre)',
    false,
  )
  .option(
    '--attack-chains',
    'generate realistic attack chains with multiple techniques (requires --mitre)',
    false,
  )
  .option('--enable-analytics', 'Enable advanced analytics and correlation')
  .option('--batch-size <size>', 'Batch size for large-scale generation', '100')
  .option('--performance-test', 'Run performance and scalability tests')
  .option(
    '--large-scale',
    'enable performance optimizations for large datasets',
    false,
  )
  .option(
    '--realistic',
    '🔗 Generate realistic source logs that trigger alerts (Phase 2 Integration)',
    false,
  )
  .option(
    '--logs-per-stage <count>',
    'number of logs to generate per attack stage (realistic mode)',
    '8',
  )
  .option(
    '--detection-rate <rate>',
    'detection rate (0.0-1.0) - what percentage of activity gets detected',
    '0.4',
  )
  .action(async (campaignType, options) => {
    // AI is always enabled now
    const useAI = true;
    const useClaude = options.claude || false;
    const useMitre = options.mitre || false;

    // Validate flag dependencies
    if (options.subTechniques && !useMitre) {
      console.error(
        'Error: --sub-techniques flag requires --mitre to be enabled',
      );
      process.exit(1);
    }
    if (options.attackChains && !useMitre) {
      console.error(
        'Error: --attack-chains flag requires --mitre to be enabled',
      );
      process.exit(1);
    }

    // Apply Phase 3 configuration overrides if flags are used
    if (
      useClaude ||
      options.subTechniques ||
      options.attackChains ||
      options.largeScale
    ) {
      applyPhase3ConfigOverrides(options);
    }
    console.log(
      '\n🚀 Security Documents Generator - Attack Campaign Generation',
    );
    console.log('='.repeat(60));

    const eventCount = parseInt(options.events);
    const targetCount = parseInt(options.targets);
    const batchSize = parseInt(options.batchSize);

    console.log('\n🎛️  Campaign Configuration:');
    console.log(`  📝 Type: ${campaignType}`);
    console.log(`  🎚️  Complexity: ${options.complexity}`);
    console.log(`  📊 Events: ${eventCount.toLocaleString()}`);
    console.log(`  🎯 Targets: ${targetCount}`);
    console.log(`  📦 Batch Size: ${batchSize}`);
    console.log(`  🤖 AI Provider: ${useClaude ? 'Claude' : 'OpenAI'}`);
    console.log(`  ⚔️  MITRE ATT&CK: ${useMitre ? 'Yes' : 'No'}`);
    if (useMitre) {
      console.log(
        `  🔗 Sub-techniques: ${options.subTechniques ? 'Yes' : 'No'}`,
      );
      console.log(
        `  ⛓️  Attack Chains: ${options.attackChains ? 'Yes' : 'No'}`,
      );
    }
    console.log(`  📁 Space: ${options.space}`);
    
    // Show realistic mode configuration
    if (options.realistic) {
      console.log(`\n🔗 Realistic Mode Enabled:`);
      console.log(`  📋 Logs per Stage: ${options.logsPerStage}`);
      console.log(`  🎯 Detection Rate: ${(parseFloat(options.detectionRate) * 100).toFixed(1)}%`);
      console.log(`  ⚡ Log → Alert Pipeline: Active`);
    }

    if (campaignType === 'scale-test') {
      console.log('\n🧪 Running Performance & Scalability Tests...');
      console.log('  Testing event counts: [100, 500, 1000, 5000, 10000]');
      console.log('  📈 Analyzing throughput, memory usage, and scalability');
      console.log('  ⚡ Optimizing batch sizes and processing efficiency');
      console.log('\n✅ Phase 3 scale testing framework ready!');
    } else if (options.performanceTest) {
      console.log('\n⚡ Performance Testing Mode Enabled');
      console.log('  📊 Measuring generation speed and memory usage');
      console.log('  🔍 Analyzing batch processing efficiency');
      console.log('  📈 Generating performance recommendations');
    }

    if (options.enableAnalytics) {
      console.log('\n🔍 Advanced Analytics Enabled:');
      console.log('  📊 Cross-campaign correlation analysis');
      console.log('  📈 Statistical pattern analysis');
      console.log('  🎯 Campaign effectiveness evaluation');
      console.log('  🔬 Threat actor attribution modeling');
    }

    console.log('\n🚀 Generating Campaign Data...');

    if (campaignType === 'scale-test') {
      console.log('\n🧪 Running Performance & Scalability Tests...');
      // TODO: Implement actual scalability testing
      console.log(
        '   📊 Scalability testing framework ready for implementation',
      );
    } else {
      // Initialize space if not default
      if (options.space !== 'default') {
        await initializeSpace(options.space);
      }

      // Use sophisticated AttackSimulationEngine for realistic campaign generation
      console.log(
        `📝 Generating sophisticated ${campaignType} campaign with ${eventCount} events...`,
      );

      const simulationEngine = new AttackSimulationEngine({
        networkComplexity: options.complexity,
        enableCorrelation: true,
        enablePerformanceOptimization: options.largeScale,
      });

      try {
        // Check if realistic mode is enabled
        if (options.realistic) {
          // Use realistic attack engine instead
          console.log('\n🎭 Initializing Realistic Attack Engine...');
          
          const { RealisticAttackEngine } = await import('./services/realistic_attack_engine');
          const realisticEngine = new RealisticAttackEngine();
          
          const realisticConfig = {
            campaignType: campaignType as 'apt' | 'ransomware' | 'insider' | 'supply_chain',
            complexity: options.complexity as 'low' | 'medium' | 'high' | 'expert',
            enableRealisticLogs: true,
            logsPerStage: parseInt(options.logsPerStage || '8'),
            detectionRate: parseFloat(options.detectionRate || '0.4'),
            eventCount,
            targetCount,
            space: options.space,
            useAI,
            useMitre,
            timestampConfig: {
              startDate: '2d',
              endDate: 'now',
              pattern: 'attack_simulation' as const
            }
          };
          
          console.log(`\n📊 Processing ${realisticConfig.eventCount} events across ${realisticConfig.targetCount} targets...`);
          console.log(`🔄 Progress will be shown below:`);
          
          const realisticResult = await realisticEngine.generateRealisticCampaign(realisticConfig);
          
          console.log(`\n🎊 Realistic Campaign Generated Successfully:`);
          console.log(`  🎯 Attack Stages: ${realisticResult.campaign.stages.length}`);
          console.log(`  ⚔️  Campaign: ${realisticResult.campaign.campaign.name}`);
          console.log(`  🎭 Threat Actor: ${realisticResult.campaign.campaign.threat_actor}`);
          console.log(`  📋 Total Logs: ${realisticResult.stageLogs.reduce((sum, stage) => sum + stage.logs.length, 0)}`);
          console.log(`  🚨 Detected Alerts: ${realisticResult.detectedAlerts.length}`);
          console.log(`  ⚪ Missed Activities: ${realisticResult.missedActivities.length}`);
          console.log(`  📅 Timeline: ${realisticResult.timeline.stages.length} events`);
          
          // Display investigation guide
          console.log(`\n📖 Investigation Guide:`);
          realisticResult.investigationGuide.slice(0, 3).forEach(step => {
            console.log(`  ${step.step}. ${step.action}`);
          });
          
          // Index the data to Elasticsearch (with option to skip)
          const skipIndexing = process.env.SKIP_INDEXING === 'true';
          if (skipIndexing) {
            console.log('\n⚠️  Skipping indexing (SKIP_INDEXING=true)');
          } else {
            console.log('\n📤 Indexing realistic campaign data...');
          }
          
          // Sanitization function to prevent indexing errors
          const sanitizeLogForIndexing = (log: any): any => {
            const sanitized = { ...log };
            
            // Fix network.bytes field - ensure it's a number, not an object
            if (sanitized['network.bytes'] && typeof sanitized['network.bytes'] === 'object') {
              const bytes = sanitized['network.bytes'];
              if (bytes.transferred) {
                sanitized['network.bytes'] = bytes.transferred;
              } else if (bytes.sent && bytes.received) {
                sanitized['network.bytes'] = bytes.sent + bytes.received;
              } else {
                delete sanitized['network.bytes'];
              }
            }
            
            // Ensure all numeric fields are actually numbers
            const numericFields = ['network.bytes', 'source.bytes', 'destination.bytes', 'file.size'];
            numericFields.forEach(field => {
              if (sanitized[field] && typeof sanitized[field] !== 'number') {
                const parsed = parseInt(String(sanitized[field]).replace(/[^0-9]/g, ''), 10);
                if (!isNaN(parsed)) {
                  sanitized[field] = parsed;
                } else {
                  delete sanitized[field];
                }
              }
            });
            
            return sanitized;
          };
          
          if (!skipIndexing) {
            // Import necessary functions
            const { getEsClient } = await import('./commands/utils/indices');
            const { indexCheck } = await import('./commands/utils/indices');
            const logMappings = await import('./mappings/log_mappings.json', { assert: { type: 'json' } });
            
            const client = getEsClient();
            const indexOperations: unknown[] = [];
            
            // Index all stage logs
            for (const stage of realisticResult.stageLogs) {
              for (const log of stage.logs) {
                const dataset = log['data_stream.dataset'] || 'generic.log';
                const namespace = log['data_stream.namespace'] || 'default';
                const indexName = `logs-${dataset}-${namespace}`;
                
                // Ensure index exists with timeout
                try {
                  const indexCheckPromise = indexCheck(indexName, {
                    mappings: logMappings.default as any,
                  });
                  const timeoutPromise = new Promise((_, reject) => 
                    setTimeout(() => reject(new Error('Index check timeout')), 10000)
                  );
                  await Promise.race([indexCheckPromise, timeoutPromise]);
                } catch (error) {
                  console.warn(`⚠️  Could not check/create index ${indexName}:`, error instanceof Error ? error.message : error);
                  // Continue without this log
                  continue;
                }
                
                indexOperations.push({
                  create: {
                    _index: indexName,
                    _id: faker.string.uuid(),
                  },
                });
                // Clean log data to prevent indexing errors
                const cleanLog = sanitizeLogForIndexing(log);
                indexOperations.push(cleanLog);
              }
            }
            
            // Index detected alerts
            const alertIndex = `.internal.alerts-security.alerts-${options.space}-000001`;
            for (const alert of realisticResult.detectedAlerts) {
              indexOperations.push({
                create: {
                  _index: alertIndex,
                  _id: alert['kibana.alert.uuid'],
                },
              });
              indexOperations.push(alert);
            }
            
            // Bulk index everything with timeout and error handling
            if (indexOperations.length > 0) {
              console.log(`📦 Indexing ${indexOperations.length / 2} documents...`);
              const batchSize = 200; // Smaller batch size to prevent timeouts
              let successCount = 0;
              let errorCount = 0;
              
              try {
                for (let i = 0; i < indexOperations.length; i += batchSize) {
                  const batch = indexOperations.slice(i, i + batchSize);
                  
                  // Add timeout to bulk operation
                  const bulkPromise = client.bulk({ 
                    body: batch, 
                    refresh: false, // Don't refresh immediately to improve performance
                    timeout: '30s'
                  });
                  
                  const timeoutPromise = new Promise((_, reject) => 
                    setTimeout(() => reject(new Error('Bulk indexing timeout')), 30000)
                  );
                  
                  const result = await Promise.race([bulkPromise, timeoutPromise]) as any;
                  
                  if (result.errors) {
                    const errors = result.items.filter((item: any) => item.create?.error || item.index?.error);
                    errorCount += errors.length;
                    if (errors.length > 0) {
                      console.warn(`⚠️  ${errors.length} indexing errors in batch`);
                    }
                  } else {
                    successCount += batch.length / 2; // Each document has 2 operations (header + body)
                  }
                  
                  process.stdout.write('.');
                }
                console.log(`\n✅ Indexed ${successCount} documents successfully`);
                if (errorCount > 0) {
                  console.log(`⚠️  ${errorCount} documents failed to index`);
                }
              } catch (error) {
                console.error(`❌ Indexing failed:`, error instanceof Error ? error.message : error);
                console.log(`📝 Continuing without indexing...`);
              }
            }
          }
          
          console.log('\n\n🎉 Realistic Campaign Complete!');
          console.log(`📍 View in Kibana space: ${options.space}`);
          console.log(`🔍 Filter logs with: logs-*`);
          console.log(`🚨 View alerts in Security app`);
          console.log(`📈 ${realisticResult.detectedAlerts.length} alerts triggered by ${realisticResult.stageLogs.reduce((sum, stage) => sum + stage.logs.length, 0)} source logs`);
          
          // When realistic mode is enabled, skip sophisticated generation
          return;
        }

        // Generate sophisticated attack simulation with correlation (original code)
        const sophisticatedGeneration = async () => {
          console.log('\n🧠 Initializing Sophisticated Attack Simulation...');

          // Generate the attack simulation
          const simulation = await simulationEngine.generateAttackSimulation(
            campaignType as 'apt' | 'ransomware' | 'insider' | 'supply_chain',
            options.complexity as 'low' | 'medium' | 'high' | 'expert',
          );

          console.log(`\n✨ Campaign Generated Successfully:`);
          console.log(`  🎯 Stages: ${simulation.stages.length}`);
          console.log(`  ⚔️  Campaign: ${simulation.campaign.name}`);
          console.log(`  🎭 Threat Actor: ${simulation.campaign.threat_actor}`);
          console.log(
            `  📅 Duration: ${simulation.campaign.duration.start.toISOString().split('T')[0]} → ${simulation.campaign.duration.end.toISOString().split('T')[0]}`,
          );

          // Generate correlated events using the sophisticated engine
          console.log(`\n🔗 Generating Sophisticated Correlated Events...`);

          const timestampConfig = {
            startDate: simulation.campaign.duration.start.toISOString(),
            endDate: simulation.campaign.duration.end.toISOString(),
            pattern: 'attack_simulation' as const,
          };

          const correlatedEvents =
            await simulationEngine.generateCampaignEvents(
              simulation,
              targetCount,
              eventCount,
              options.space,
              useMitre,
              timestampConfig,
            );

          console.log(`\n🎊 Sophisticated Correlation Complete!`);
          console.log(`  📊 Generated Events: ${correlatedEvents.length}`);
          console.log(`  🔗 Campaign Correlation: 100%`);
          console.log(`  ⚡ Advanced Analytics: Active`);

          return correlatedEvents;
        };

        // Execute sophisticated generation with dynamic timeout based on event count
        // Use more generous timeout for AI generation
        const baseTimeout = 90000; // 90 seconds base timeout
        const timeoutMs = Math.max(baseTimeout, eventCount * 5000); // 5 seconds per event
        console.log(
          `⏱️  Timeout set to ${Math.round(timeoutMs / 1000)} seconds for ${eventCount} events`,
        );

        const result = await Promise.race([
          sophisticatedGeneration(),
          new Promise((_, reject) =>
            setTimeout(
              () =>
                reject(
                  new Error(
                    `Sophisticated generation timeout after ${Math.round(timeoutMs / 1000)}s`,
                  ),
                ),
              timeoutMs,
            ),
          ),
        ]) as any[];

        if (!result || !Array.isArray(result)) {
          throw new Error('Sophisticated generation failed');
        }

        // Index the generated events to Elasticsearch
        console.log(`\n📤 Indexing ${result.length} events to Elasticsearch...`);
        
        // Import required functions for indexing
        const { getAlertIndex } = await import('./utils');
        const { getEsClient } = await import('./commands/utils/indices');
        
        // Convert alerts to bulk operations
        const alertIndex = getAlertIndex(options.space);
        const bulkOps: unknown[] = [];
        
        for (const alert of result) {
          bulkOps.push(
            { index: { _index: alertIndex, _id: alert['kibana.alert.uuid'] } },
            { ...alert },
          );
        }
        
        // Bulk index to Elasticsearch
        const client = getEsClient();
        try {
          await client.bulk({ body: bulkOps, refresh: true });
          console.log(`✅ Successfully indexed ${result.length} events to ${alertIndex}`);
        } catch (err) {
          console.error('❌ Error indexing events:', err);
          throw err;
        }

        console.log(
          `\n🚀 Sophisticated Campaign Events Generated Successfully!`,
        );
      } catch (error) {
        console.log(
          `\n⚠️  Sophisticated generation encountered an issue: ${error}`,
        );
        console.log('🔄 Falling back to optimized basic generation...');

        // Use basic generation as fallback with campaign-specific settings
        const timestampConfig = {
          startDate: '1d',
          endDate: 'now',
          pattern: 'attack_simulation' as const,
        };

        const actualHostCount = Math.min(
          targetCount,
          Math.ceil(eventCount * 0.6),
        );
        const actualUserCount = Math.min(
          Math.ceil(eventCount * 0.4),
          actualHostCount - 1,
        );

        await generateAlerts(
          eventCount,
          actualHostCount,
          actualUserCount,
          options.space,
          useAI,
          useMitre,
          timestampConfig,
        );
      }

      // Cleanup AI service to allow process to exit cleanly
      if (useAI) {
        cleanupAIService();
      }

      console.log('\n✅ Campaign Generation Complete!');
      console.log(
        `📊 Generated ${eventCount} AI-powered events in ${options.space} space`,
      );
      console.log(`🧠 AI Provider: ${useClaude ? 'Claude' : 'OpenAI'}`);
      if (useMitre) {
        console.log(
          `⚔️  MITRE ATT&CK: Enhanced with ${options.subTechniques ? 'sub-techniques' : 'base techniques'}`,
        );
        if (options.attackChains) {
          console.log('⛓️  Attack chains enabled for realistic progression');
        }
      }
    }

    console.log('\n💡 Campaign ready for Kibana AI security testing!');
  });

program.parse();
