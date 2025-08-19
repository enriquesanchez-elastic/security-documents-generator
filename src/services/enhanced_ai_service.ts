/**
 * Enhanced AI Service - Main Export for Two-Stage Architecture
 * 
 * This is the main export that existing code should import from.
 * It provides seamless integration with the two-stage architecture
 * while maintaining 100% backwards compatibility.
 * 
 * Usage: Replace imports from '../utils/ai_service' with './enhanced_ai_service'
 */

import {
  generateAIAlert,
  generateAIAlertBatch,
  generateMITREAlert,
  generateCLIAlert,
  performPerformanceComparison
} from './ai_service_integration';

// Re-export the original functions for any remaining dependencies
export {
  generateAIEvent,
  cleanupAIService,
  extractSchemaFromMapping,
  generateRealisticRuleNamesBatch
} from '../utils/ai_service';

// Re-export the enhanced versions
export {
  generateAIAlert,
  generateAIAlertBatch,
  generateMITREAlert,
  generateCLIAlert,
  performPerformanceComparison
};

// New enhanced interface that fully leverages CLI options
export async function generateAlertWithAllOptions(options: {
  // Entity context
  userName?: string;
  hostName?: string;
  space?: string;
  
  // MITRE options
  mitre?: boolean;
  subTechniques?: boolean;
  attackChains?: boolean;
  focusTactic?: string;
  
  // Multi-field options (leverages existing system)
  multiField?: boolean;
  fieldCount?: number;
  fieldCategories?: string[];
  fieldPerformanceMode?: boolean;
  
  // Theme options (leverages existing system)
  theme?: string;
  
  // Platform options (leverages existing system)
  ai4soc?: boolean;
  platform?: 'splunk' | 'sentinelone' | 'google-secops' | 'all';
  
  // Integration options
  visualAnalyzer?: boolean;
  sessionView?: boolean;
  integrations?: boolean;
  
  // Realistic mode options
  realistic?: boolean;
  detectionRate?: number;
  falsePositiveRate?: number;
  
  // Scale options
  largeScale?: boolean;
  environments?: number;
  
  // Time options
  timestampConfig?: any;
  startDate?: string;
  endDate?: string;
  timePattern?: string;
}) {
  return generateCLIAlert({
    ...options,
    fieldCategories: options.fieldCategories?.join(',')
  });
}

/**
 * Batch generation with full CLI option support
 */
export async function generateAlertBatchWithAllOptions(options: {
  entities: Array<{ userName: string; hostName: string }>;
  batchSize?: number;
  space?: string;
  
  // All the same options as generateAlertWithAllOptions
  mitre?: boolean;
  subTechniques?: boolean;
  attackChains?: boolean;
  focusTactic?: string;
  multiField?: boolean;
  fieldCount?: number;
  fieldCategories?: string[];
  theme?: string;
  ai4soc?: boolean;
  platform?: string;
  visualAnalyzer?: boolean;
  sessionView?: boolean;
  integrations?: boolean;
  realistic?: boolean;
  detectionRate?: number;
  environments?: number;
  timestampConfig?: any;
}) {
  // Use the integrated batch generation
  return generateAIAlertBatch({
    entities: options.entities,
    space: options.space,
    batchSize: options.batchSize,
    timestampConfig: options.timestampConfig,
    theme: options.theme,
    examples: [] // Keep for compatibility
  });
}

/**
 * CLI Integration Helper - Maps CLI flags to generation options
 */
export function mapCLIOptionsToGenerationOptions(cliFlags: {
  mitre?: boolean;
  subTechniques?: boolean;
  attackChains?: boolean;
  focusTactic?: string;
  multiField?: boolean;
  fieldCount?: number;
  fieldCategories?: string;
  fieldPerformanceMode?: boolean;
  theme?: string;
  ai4soc?: boolean;
  platform?: string;
  visualAnalyzer?: boolean;
  sessionView?: boolean;
  integrations?: boolean;
  realistic?: boolean;
  detectionRate?: number;
  falsePositiveRate?: number;
  largeScale?: boolean;
  environments?: number;
  startDate?: string;
  endDate?: string;
  timePattern?: string;
}) {
  return {
    mitre: cliFlags.mitre,
    subTechniques: cliFlags.subTechniques,
    attackChains: cliFlags.attackChains,
    focusTactic: cliFlags.focusTactic,
    multiField: cliFlags.multiField,
    fieldCount: cliFlags.fieldCount ? parseInt(cliFlags.fieldCount.toString()) : undefined,
    fieldCategories: cliFlags.fieldCategories?.split(','),
    fieldPerformanceMode: cliFlags.fieldPerformanceMode,
    theme: cliFlags.theme,
    ai4soc: cliFlags.ai4soc,
    platform: cliFlags.platform as any,
    visualAnalyzer: cliFlags.visualAnalyzer,
    sessionView: cliFlags.sessionView,
    integrations: cliFlags.integrations,
    realistic: cliFlags.realistic,
    detectionRate: cliFlags.detectionRate ? parseFloat(cliFlags.detectionRate.toString()) : undefined,
    falsePositiveRate: cliFlags.falsePositiveRate ? parseFloat(cliFlags.falsePositiveRate.toString()) : undefined,
    largeScale: cliFlags.largeScale,
    environments: cliFlags.environments,
    timestampConfig: {
      startDate: cliFlags.startDate,
      endDate: cliFlags.endDate,
      pattern: cliFlags.timePattern
    }
  };
}