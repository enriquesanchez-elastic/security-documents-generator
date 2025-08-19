/**
 * AI Service Integration - Seamless Migration to Two-Stage Architecture
 * 
 * This module provides integration hooks for the existing AI service to
 * optionally use the new two-stage architecture based on configuration.
 * 
 * Migration strategy:
 * 1. Feature flag in config enables new architecture
 * 2. Fallback to original implementation if new system fails
 * 3. Performance monitoring and comparison
 * 4. Gradual rollout capability
 */

import { getConfig } from '../get_config';
import { 
  generateAIAlert as originalGenerateAIAlert,
  generateAIAlertBatch as originalGenerateAIAlertBatch,
  generateMITREAlert as originalGenerateMITREAlert
} from '../utils/ai_service';
import { 
  generateAIAlert as unifiedGenerateAIAlert,
  generateAIAlertBatch as unifiedGenerateAIAlertBatch,
  generateMITREAlert as unifiedGenerateMITREAlert,
  generateEnhancedAlert,
  comparePerformance
} from './ai_service_compatibility';
import { BaseCreateAlertsReturnType } from '../create_alerts';
import { 
  GenerateAIAlertParams, 
  GenerateAIAlertBatchParams, 
  GenerateMITREAlertParams 
} from '../utils/ai_service_types';

interface IntegrationConfig {
  useUnifiedArchitecture: boolean;
  fallbackOnError: boolean;
  enablePerformanceMonitoring: boolean;
  rolloutPercentage: number; // 0-100, for gradual rollout
}

/**
 * Get integration configuration from main config
 */
function getIntegrationConfig(): IntegrationConfig {
  const config = getConfig();
  
  // Check if unified architecture is enabled in config
  // Add this to config.json: "unifiedArchitecture": { ... }
  const unifiedConfig = (config as any).unifiedArchitecture;
  
  return {
    useUnifiedArchitecture: unifiedConfig?.enabled || false,
    fallbackOnError: unifiedConfig?.fallbackOnError ?? true,
    enablePerformanceMonitoring: unifiedConfig?.monitoring || false,
    rolloutPercentage: unifiedConfig?.rolloutPercentage || 0
  };
}

/**
 * Determine if this request should use unified architecture
 */
function shouldUseUnifiedArchitecture(params: any): boolean {
  const config = getIntegrationConfig();
  
  if (!config.useUnifiedArchitecture) {
    return false;
  }
  
  // Gradual rollout based on percentage
  if (config.rolloutPercentage < 100) {
    const hash = hashString(JSON.stringify(params));
    const percentage = hash % 100;
    return percentage < config.rolloutPercentage;
  }
  
  return true;
}

/**
 * Simple hash function for consistent rollout
 */
function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return Math.abs(hash);
}

/**
 * Integrated generateAIAlert with unified architecture support
 */
export async function generateAIAlert(
  params: GenerateAIAlertParams,
): Promise<BaseCreateAlertsReturnType> {
  const config = getIntegrationConfig();
  const useUnified = shouldUseUnifiedArchitecture(params);
  
  if (useUnified) {
    try {
      const startTime = Date.now();
      const result = await unifiedGenerateAIAlert(params);
      
      // Performance monitoring
      if (config.enablePerformanceMonitoring) {
        const endTime = Date.now();
        console.log(`[UNIFIED] Alert generated in ${endTime - startTime}ms`);
        
        // Optional: Store metrics for analysis
        logPerformanceMetric('generateAIAlert', {
          time_ms: endTime - startTime,
          architecture: 'unified',
          params_hash: hashString(JSON.stringify(params))
        });
      }
      
      return result;
    } catch (error) {
      console.warn('[UNIFIED] Failed, falling back to original:', error);
      
      if (config.fallbackOnError) {
        return originalGenerateAIAlert(params);
      }
      throw error;
    }
  }
  
  // Use original implementation
  const startTime = Date.now();
  const result = await originalGenerateAIAlert(params);
  
  if (config.enablePerformanceMonitoring) {
    const endTime = Date.now();
    console.log(`[ORIGINAL] Alert generated in ${endTime - startTime}ms`);
    
    logPerformanceMetric('generateAIAlert', {
      time_ms: endTime - startTime,
      architecture: 'original',
      params_hash: hashString(JSON.stringify(params))
    });
  }
  
  return result;
}

/**
 * Integrated generateAIAlertBatch with unified architecture support
 */
export async function generateAIAlertBatch(
  params: GenerateAIAlertBatchParams,
): Promise<BaseCreateAlertsReturnType[]> {
  const config = getIntegrationConfig();
  const useUnified = shouldUseUnifiedArchitecture(params);
  
  if (useUnified) {
    try {
      const startTime = Date.now();
      const results = await unifiedGenerateAIAlertBatch(params);
      
      if (config.enablePerformanceMonitoring) {
        const endTime = Date.now();
        const timePerAlert = (endTime - startTime) / results.length;
        console.log(`[UNIFIED] Batch of ${results.length} alerts generated in ${endTime - startTime}ms (${timePerAlert.toFixed(1)}ms per alert)`);
        
        logPerformanceMetric('generateAIAlertBatch', {
          time_ms: endTime - startTime,
          time_per_alert_ms: timePerAlert,
          batch_size: results.length,
          architecture: 'unified'
        });
      }
      
      return results;
    } catch (error) {
      console.warn('[UNIFIED] Batch failed, falling back to original:', error);
      
      if (config.fallbackOnError) {
        return originalGenerateAIAlertBatch(params);
      }
      throw error;
    }
  }
  
  // Use original implementation
  const startTime = Date.now();
  const results = await originalGenerateAIAlertBatch(params);
  
  if (config.enablePerformanceMonitoring) {
    const endTime = Date.now();
    const timePerAlert = (endTime - startTime) / results.length;
    console.log(`[ORIGINAL] Batch of ${results.length} alerts generated in ${endTime - startTime}ms (${timePerAlert.toFixed(1)}ms per alert)`);
    
    logPerformanceMetric('generateAIAlertBatch', {
      time_ms: endTime - startTime,
      time_per_alert_ms: timePerAlert,
      batch_size: results.length,
      architecture: 'original'
    });
  }
  
  return results;
}

/**
 * Integrated generateMITREAlert with unified architecture support
 */
export async function generateMITREAlert(
  params: GenerateMITREAlertParams,
): Promise<BaseCreateAlertsReturnType> {
  const config = getIntegrationConfig();
  const useUnified = shouldUseUnifiedArchitecture(params);
  
  if (useUnified) {
    try {
      const startTime = Date.now();
      const result = await unifiedGenerateMITREAlert(params);
      
      if (config.enablePerformanceMonitoring) {
        const endTime = Date.now();
        console.log(`[UNIFIED] MITRE alert generated in ${endTime - startTime}ms`);
        
        logPerformanceMetric('generateMITREAlert', {
          time_ms: endTime - startTime,
          architecture: 'unified',
          has_mitre: true
        });
      }
      
      return result;
    } catch (error) {
      console.warn('[UNIFIED] MITRE alert failed, falling back to original:', error);
      
      if (config.fallbackOnError) {
        return originalGenerateMITREAlert(params);
      }
      throw error;
    }
  }
  
  // Use original implementation
  const startTime = Date.now();
  const result = await originalGenerateMITREAlert(params);
  
  if (config.enablePerformanceMonitoring) {
    const endTime = Date.now();
    console.log(`[ORIGINAL] MITRE alert generated in ${endTime - startTime}ms`);
    
    logPerformanceMetric('generateMITREAlert', {
      time_ms: endTime - startTime,
      architecture: 'original',
      has_mitre: true
    });
  }
  
  return result;
}

/**
 * Enhanced CLI-aware alert generation (New Interface)
 */
export async function generateCLIAlert(options: {
  // Basic options (backwards compatible)
  userName?: string;
  hostName?: string;
  space?: string;
  examples?: any[];
  timestampConfig?: any;
  
  // Enhanced CLI options
  mitre?: boolean;
  subTechniques?: boolean;
  attackChains?: boolean;
  focusTactic?: string;
  
  multiField?: boolean;
  fieldCount?: number;
  fieldCategories?: string;
  
  theme?: string;
  
  ai4soc?: boolean;
  platform?: 'splunk' | 'sentinelone' | 'google-secops' | 'all';
  
  visualAnalyzer?: boolean;
  sessionView?: boolean;
  integrations?: boolean;
  
  realistic?: boolean;
  detectionRate?: number;
  
  // Force architecture choice
  forceUnified?: boolean;
  forceOriginal?: boolean;
}): Promise<BaseCreateAlertsReturnType> {
  const config = getIntegrationConfig();
  
  // Determine which architecture to use
  let useUnified = config.useUnifiedArchitecture;
  
  if (options.forceUnified) useUnified = true;
  if (options.forceOriginal) useUnified = false;
  
  // Check if unified architecture is needed for enhanced features
  const needsEnhancedFeatures = !!(
    options.multiField || 
    options.visualAnalyzer || 
    options.ai4soc ||
    options.subTechniques ||
    options.attackChains
  );
  
  if (needsEnhancedFeatures && !options.forceOriginal) {
    useUnified = true;
  }
  
  if (useUnified) {
    try {
      return await generateEnhancedAlert(options);
    } catch (error) {
      if (config.fallbackOnError && !options.forceUnified) {
        console.warn('[CLI] Enhanced features failed, falling back to basic alert generation');
        
        // Convert to basic parameters for original system
        const basicParams: GenerateAIAlertParams = {
          userName: options.userName,
          hostName: options.hostName,
          space: options.space,
          examples: options.examples,
          timestampConfig: options.timestampConfig,
          mitreEnabled: options.mitre,
          theme: options.theme
        };
        
        return originalGenerateAIAlert(basicParams);
      }
      throw error;
    }
  }
  
  // Use original system with basic parameters
  const basicParams: GenerateAIAlertParams = {
    userName: options.userName,
    hostName: options.hostName,
    space: options.space,
    examples: options.examples,
    timestampConfig: options.timestampConfig,
    mitreEnabled: options.mitre,
    theme: options.theme
  };
  
  return originalGenerateAIAlert(basicParams);
}

/**
 * Performance comparison utility
 */
export async function performPerformanceComparison(
  params: GenerateAIAlertParams,
): Promise<{
  original_time_ms: number;
  unified_time_ms: number;
  time_improvement: number;
  estimated_token_savings: number;
  recommendation: 'use_unified' | 'use_original' | 'equivalent';
}> {
  console.log('[COMPARISON] Starting performance comparison...');
  
  // Test original implementation
  const originalStart = Date.now();
  const originalResult = await originalGenerateAIAlert(params);
  const originalTime = Date.now() - originalStart;
  
  // Test unified implementation
  const unifiedStart = Date.now();
  const unifiedResult = await unifiedGenerateAIAlert(params);
  const unifiedTime = Date.now() - unifiedStart;
  
  const timeImprovement = ((originalTime - unifiedTime) / originalTime) * 100;
  const estimatedTokenSavings = 85; // Based on architecture design (~300 vs ~2000 tokens)
  
  let recommendation: 'use_unified' | 'use_original' | 'equivalent' = 'equivalent';
  if (timeImprovement > 20 && estimatedTokenSavings > 50) {
    recommendation = 'use_unified';
  } else if (timeImprovement < -20) {
    recommendation = 'use_original';
  }
  
  return {
    original_time_ms: originalTime,
    unified_time_ms: unifiedTime,
    time_improvement: timeImprovement,
    estimated_token_savings: estimatedTokenSavings,
    recommendation
  };
}

/**
 * Simple performance logging
 */
function logPerformanceMetric(operation: string, data: any): void {
  const logEntry = {
    timestamp: new Date().toISOString(),
    operation,
    ...data
  };
  
  // In production, this could write to a proper logging system
  // For now, just console log for debugging
  console.debug('[PERF_METRIC]', JSON.stringify(logEntry));
  
  // Optional: Write to file for analysis
  // fs.appendFileSync('performance_metrics.jsonl', JSON.stringify(logEntry) + '\n');
}