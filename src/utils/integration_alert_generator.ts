/**
 * Integration Alert Generator Utility
 * 
 * Generates alerts with coordination to existing rules for proper integration display.
 */

import createAlerts from '../create_alerts';
import { ruleCoordinationService } from '../services/rule_coordination_service';
import { faker } from '@faker-js/faker';

export interface IntegrationAlertOptions {
  userName?: string;
  hostName?: string;
  space?: string;
  timestampConfig?: import('../utils/timestamp_utils').TimestampConfig;
  sessionView?: boolean;
  visualAnalyzer?: boolean;
  useCoordinatedRules?: boolean;
  ruleType?: string; // Optional filter for specific rule type
}

/**
 * Generate alerts with proper rule coordination for integrations
 */
export function generateCoordinatedAlert<O extends object>(
  override: O,
  options: IntegrationAlertOptions = {}
): O & ReturnType<typeof createAlerts> {
  
  if (options.useCoordinatedRules && ruleCoordinationService.hasRules()) {
    // Use actual rule data from coordination service
    let selectedRule;
    
    if (options.ruleType) {
      selectedRule = ruleCoordinationService.getRandomRuleByType(options.ruleType);
    } else {
      selectedRule = ruleCoordinationService.getRandomRule();
    }
    
    if (selectedRule) {
      return createAlerts(override, {
        ...options,
        ruleId: selectedRule.rule_id,
        ruleName: selectedRule.name,
        ruleType: selectedRule.type,
        relatedIntegrations: selectedRule.related_integrations,
      });
    }
  }
  
  // Fallback to regular alert generation without coordination
  return createAlerts(override, options);
}

/**
 * Generate multiple coordinated alerts
 */
export function generateCoordinatedAlerts<O extends object>(
  count: number,
  override: O,
  options: IntegrationAlertOptions = {}
): Array<O & ReturnType<typeof createAlerts>> {
  const alerts = [];
  
  for (let i = 0; i < count; i++) {
    const alert = generateCoordinatedAlert(override, options);
    alerts.push(alert);
  }
  
  return alerts;
}

/**
 * Get statistics about available coordinated rules
 */
export function getCoordinationStats() {
  const totalRules = ruleCoordinationService.getRuleCount();
  const rulesWithIntegrations = ruleCoordinationService.getRulesWithIntegrations().length;
  const availableTypes = ruleCoordinationService.getAvailableRuleTypes();
  
  return {
    totalRules,
    rulesWithIntegrations,
    availableTypes,
    integrationCoverage: totalRules > 0 ? (rulesWithIntegrations / totalRules) * 100 : 0,
  };
}

/**
 * Validate that coordination data is available for integration features
 */
export function validateCoordinationForIntegrations(): {
  isValid: boolean;
  message: string;
  suggestions?: string[];
} {
  if (!ruleCoordinationService.hasRules()) {
    return {
      isValid: false,
      message: 'No coordinated rules available for integration features',
      suggestions: [
        'Generate rules with --integrations flag first',
        'Ensure rules were successfully created and stored',
        'Check that rule generation completed without errors'
      ]
    };
  }
  
  const rulesWithIntegrations = ruleCoordinationService.getRulesWithIntegrations();
  if (rulesWithIntegrations.length === 0) {
    return {
      isValid: false,
      message: 'No rules with integration data found',
      suggestions: [
        'Generate rules with --integrations flag enabled',
        'Verify integration service is working properly',
        'Check rule generation logs for integration errors'
      ]
    };
  }
  
  return {
    isValid: true,
    message: `Ready for integration features with ${rulesWithIntegrations.length} coordinated rules`
  };
}

/**
 * Clear coordination state (useful for testing)
 */
export function clearCoordinationState(): void {
  ruleCoordinationService.clear();
}