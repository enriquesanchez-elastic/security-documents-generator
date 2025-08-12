/**
 * Rule Coordination Service
 * 
 * Manages coordination between generated rules and alerts for integration features.
 * Stores rule metadata and provides integration data for alert generation.
 */

export interface RuleMetadata {
  id: string;
  rule_id: string;
  name: string;
  type: string;
  related_integrations: Array<{
    package: string;
    version: string;
    integration?: string;
  }>;
  severity: string;
  risk_score: number;
  created_at: string;
}

/**
 * Service for coordinating rules and alerts with integration data
 */
export class RuleCoordinationService {
  private ruleMetadata: Map<string, RuleMetadata> = new Map();
  private rulesByType: Map<string, RuleMetadata[]> = new Map();
  
  /**
   * Store metadata for a generated rule
   */
  addRule(metadata: RuleMetadata): void {
    this.ruleMetadata.set(metadata.rule_id, metadata);
    
    // Group by type for easier selection
    if (!this.rulesByType.has(metadata.type)) {
      this.rulesByType.set(metadata.type, []);
    }
    this.rulesByType.get(metadata.type)!.push(metadata);
  }

  /**
   * Get rule metadata by rule_id
   */
  getRuleByRuleId(ruleId: string): RuleMetadata | undefined {
    return this.ruleMetadata.get(ruleId);
  }

  /**
   * Get a random rule for alert generation
   */
  getRandomRule(): RuleMetadata | undefined {
    const allRules = Array.from(this.ruleMetadata.values());
    if (allRules.length === 0) {
      return undefined;
    }
    
    const randomIndex = Math.floor(Math.random() * allRules.length);
    return allRules[randomIndex];
  }

  /**
   * Get a rule by type (for targeted alert generation)
   */
  getRandomRuleByType(type: string): RuleMetadata | undefined {
    const rulesOfType = this.rulesByType.get(type);
    if (!rulesOfType || rulesOfType.length === 0) {
      return undefined;
    }
    
    const randomIndex = Math.floor(Math.random() * rulesOfType.length);
    return rulesOfType[randomIndex];
  }

  /**
   * Get all available rule types
   */
  getAvailableRuleTypes(): string[] {
    return Array.from(this.rulesByType.keys());
  }

  /**
   * Get all rules
   */
  getAllRules(): RuleMetadata[] {
    return Array.from(this.ruleMetadata.values());
  }

  /**
   * Get rules with integrations
   */
  getRulesWithIntegrations(): RuleMetadata[] {
    return Array.from(this.ruleMetadata.values()).filter(
      rule => rule.related_integrations.length > 0
    );
  }

  /**
   * Get count of stored rules
   */
  getRuleCount(): number {
    return this.ruleMetadata.size;
  }

  /**
   * Clear all stored rules
   */
  clear(): void {
    this.ruleMetadata.clear();
    this.rulesByType.clear();
  }

  /**
   * Check if service has rules
   */
  hasRules(): boolean {
    return this.ruleMetadata.size > 0;
  }

  /**
   * Get integration data for a rule
   */
  getIntegrationDataForRule(ruleId: string): Array<{package: string; version: string; integration?: string}> {
    const rule = this.getRuleByRuleId(ruleId);
    return rule?.related_integrations || [];
  }
}

// Export singleton instance
export const ruleCoordinationService = new RuleCoordinationService();