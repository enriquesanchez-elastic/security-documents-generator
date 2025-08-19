/**
 * Template Orchestrator - Stage 2 of Two-Stage Architecture
 * 
 * Coordinates all existing systems (multi-field, themes, AI4SOC, MITRE, etc.)
 * with narrative context to generate complete security alerts.
 * 
 * This leverages existing optimized systems while adding narrative intelligence.
 */

import { 
  EnhancedAttackNarrative, 
  CLIOptions, 
  TemplateExecutionResult,
  AttackStageNarrative
} from './narrative_generator_types';
import { BaseCreateAlertsReturnType } from '../create_alerts';
import createAlerts from '../create_alerts';
import { generateTimestamp, TimestampConfig } from '../utils/timestamp_utils';
import { MULTI_FIELD_TEMPLATES, MultiFieldTemplates } from '../utils/multi_field_templates';
import { generateMultiFields } from '../utils/multi_field_generator';
import { getThemeContext, getThemedData } from '../utils/theme_service';
import { SPLUNK_TEMPLATES, SENTINELONE_TEMPLATES, GOOGLE_SECOPS_TEMPLATES } from '../templates/ai4soc/alert_templates';
import { generateMitreFields, loadMitreData } from '../utils/mitre_attack_service';
import { createProcessEventWithVisualAnalyzer } from '../services/visual_event_analyzer';
import { faker } from '@faker-js/faker';

export class TemplateOrchestrator {
  private multiFieldTemplates: MultiFieldTemplates = MULTI_FIELD_TEMPLATES;

  /**
   * Generate complete security alert using narrative + existing systems
   */
  async generateAlert(
    narrative: EnhancedAttackNarrative, 
    options: CLIOptions,
    entityContext?: { userName: string; hostName: string; space: string }
  ): Promise<BaseCreateAlertsReturnType> {
    const executionStart = Date.now();
    
    // Step 1: Create base alert template
    const baseAlert = await this.createBaseAlert(narrative, options, entityContext);
    
    // Step 2: Map narrative to specific fields
    const narrativeFields = this.mapNarrativeToFields(narrative, options);
    
    // Step 3: Apply existing system enhancements in parallel
    const enhancements = await Promise.all([
      this.applyMultiFieldGeneration(narrative, options),
      this.applyThemeEnhancements(narrative, options, entityContext),
      this.applyPlatformTemplates(narrative, options),
      this.applyMitreEnhancements(narrative, options),
      this.applyIntegrationFields(narrative, options),
    ]);
    
    // Step 4: Merge all results
    const finalAlert = this.mergeAlertSections(
      baseAlert,
      narrativeFields,
      ...enhancements
    );

    // Step 5: Add performance metadata
    finalAlert['_generation_metadata'] = {
      generation_time_ms: Date.now() - executionStart,
      narrative_id: narrative.attack_id,
      template_sources: this.getUsedTemplateSources(options),
      field_count: Object.keys(finalAlert).length
    };

    return finalAlert;
  }

  /**
   * Create base alert using existing createAlerts system
   */
  private async createBaseAlert(
    narrative: EnhancedAttackNarrative,
    options: CLIOptions,
    entityContext?: { userName: string; hostName: string; space: string }
  ): Promise<BaseCreateAlertsReturnType> {
    // Use existing createAlerts function with narrative-derived overrides
    const alertOverrides = this.buildAlertOverrides(narrative, options);
    
    const baseAlert = createAlerts(alertOverrides, {
      userName: entityContext?.userName || this.extractUsername(narrative),
      hostName: entityContext?.hostName || this.extractHostname(narrative),
      space: entityContext?.space || options.space || 'default',
      timestampConfig: this.buildTimestampConfig(options),
      ruleId: faker.string.uuid(),
      ruleName: this.generateRuleName(narrative),
      ruleType: this.inferRuleType(narrative, options),
      relatedIntegrations: options.integrations ? this.extractIntegrations(narrative) : []
    });

    return baseAlert;
  }

  /**
   * Map narrative elements to specific alert fields
   */
  private mapNarrativeToFields(
    narrative: EnhancedAttackNarrative, 
    options: CLIOptions
  ): Record<string, any> {
    const fields: Record<string, any> = {};

    // Map timeline to alert description and reason
    if (narrative.timeline.length > 0) {
      const primaryStage = narrative.timeline[0];
      fields['kibana.alert.rule.description'] = this.buildRuleDescription(narrative);
      fields['kibana.alert.reason'] = this.buildAlertReason(primaryStage);
      fields['kibana.alert.severity'] = this.calculateSeverity(narrative);
      fields['kibana.alert.risk_score'] = this.calculateRiskScore(narrative);
    }

    // Map technical artifacts to relevant fields
    const artifacts = narrative.technical_artifacts;
    if (artifacts.processes.length > 0) {
      fields['process.name'] = faker.helpers.arrayElement(artifacts.processes).split(' ')[0];
      fields['process.command_line'] = faker.helpers.arrayElement(artifacts.processes);
    }

    if (artifacts.files.length > 0) {
      const selectedFile = faker.helpers.arrayElement(artifacts.files);
      fields['file.name'] = selectedFile.split('/').pop() || selectedFile;
      fields['file.path'] = selectedFile;
    }

    if (artifacts.network_destinations.length > 0) {
      const destination = faker.helpers.arrayElement(artifacts.network_destinations);
      fields['destination.ip'] = this.extractIpFromDestination(destination);
      fields['url.domain'] = this.extractDomainFromDestination(destination);
    }

    // Map registry modifications
    if (artifacts.registry_modifications.length > 0) {
      fields['registry.key'] = faker.helpers.arrayElement(artifacts.registry_modifications);
    }

    // Set event categories based on narrative
    fields['event.category'] = this.inferEventCategories(narrative);
    fields['event.action'] = this.inferEventAction(narrative);

    return fields;
  }

  /**
   * Apply multi-field generation using existing system
   */
  private async applyMultiFieldGeneration(
    narrative: EnhancedAttackNarrative,
    options: CLIOptions
  ): Promise<Record<string, any>> {
    if (!options.multiField) return {};

    const multiFieldConfig = {
      fieldCount: options.fieldCount || 200,
      categories: options.fieldCategories ? options.fieldCategories.split(',') : undefined,
      performanceMode: options.fieldPerformanceMode || false,
      contextWeightEnabled: true, // Enable context-aware field selection
      correlationEnabled: true
    };

    // Use existing multi-field system with narrative context
    const contextualMultiFields = this.generateContextualMultiFields(narrative, multiFieldConfig);
    
    return contextualMultiFields;
  }

  /**
   * Generate contextual multi-fields based on narrative
   */
  private generateContextualMultiFields(
    narrative: EnhancedAttackNarrative,
    config: any
  ): Record<string, any> {
    const fields: Record<string, any> = {};
    const relevantCategories = this.selectRelevantFieldCategories(narrative);

    // Generate fields from narrative-relevant categories first
    let fieldsGenerated = 0;
    for (const category of relevantCategories) {
      if (fieldsGenerated >= config.fieldCount) break;
      
      const categoryTemplates = this.multiFieldTemplates[category];
      if (categoryTemplates) {
        const categoryFieldCount = Math.min(
          config.fieldCount - fieldsGenerated,
          Math.floor(config.fieldCount / relevantCategories.length)
        );

        const categoryFields = this.generateFieldsFromCategory(
          categoryTemplates,
          categoryFieldCount,
          narrative
        );

        Object.assign(fields, categoryFields);
        fieldsGenerated += Object.keys(categoryFields).length;
      }
    }

    // Fill remaining fields with general categories if needed
    if (fieldsGenerated < config.fieldCount) {
      const remainingCount = config.fieldCount - fieldsGenerated;
      const generalFields = generateMultiFields({
        fieldCount: remainingCount,
        categories: undefined, // Use all categories
        performanceMode: config.performanceMode
      });
      Object.assign(fields, generalFields);
    }

    return fields;
  }

  /**
   * Apply theme enhancements using existing theme system
   */
  private async applyThemeEnhancements(
    narrative: EnhancedAttackNarrative,
    options: CLIOptions,
    entityContext?: { userName: string; hostName: string; space: string }
  ): Promise<Record<string, any>> {
    if (!options.theme) return {};

    try {
      // Use existing theme system with narrative context
      const themeContext = getThemeContext(options.theme);
      const themedUsers = await getThemedData(options.theme, 'user.name', 1);
      const themedHosts = await getThemedData(options.theme, 'host.name', 1);

      return {
        'user.name': entityContext?.userName || themedUsers[0],
        'host.name': entityContext?.hostName || themedHosts[0],
        'organization.name': `${options.theme} Corporation`,
        '_theme_context': {
          theme: options.theme,
          applied_entities: {
            users: themedUsers,
            hosts: themedHosts
          }
        }
      };
    } catch (error) {
      console.warn('Theme enhancement failed, continuing without theme:', error);
      return {};
    }
  }

  /**
   * Apply platform-specific templates using existing AI4SOC system
   */
  private async applyPlatformTemplates(
    narrative: EnhancedAttackNarrative,
    options: CLIOptions
  ): Promise<Record<string, any>> {
    if (!options.ai4soc) return {};

    const platform = options.platform || 'all';
    let platformTemplate;

    // Use existing AI4SOC templates
    switch (platform) {
      case 'splunk':
        platformTemplate = this.selectSplunkTemplate(narrative);
        break;
      case 'sentinelone':
        platformTemplate = this.selectSentinelOneTemplate(narrative);
        break;
      case 'google-secops':
        platformTemplate = this.selectGoogleSecOpsTemplate(narrative);
        break;
      default:
        // For 'all', select the most appropriate template
        platformTemplate = this.selectBestPlatformTemplate(narrative);
    }

    if (platformTemplate) {
      return {
        ...platformTemplate.fieldOverrides,
        '_platform_context': {
          platform,
          template_id: platformTemplate.id,
          mitre_mapping: platformTemplate.mitreMapping
        }
      };
    }

    return {};
  }

  /**
   * Apply MITRE enhancements using existing MITRE service
   */
  private async applyMitreEnhancements(
    narrative: EnhancedAttackNarrative,
    options: CLIOptions
  ): Promise<Record<string, any>> {
    if (!options.mitre || !narrative.mitre_context) return {};

    const mitreData = loadMitreData();
    if (!mitreData) return {};

    // Use existing MITRE service with narrative context
    const selectedTechniques = narrative.mitre_context.techniques.map(techniqueId => ({
      tactic: this.getTacticForTechnique(techniqueId, mitreData),
      technique: techniqueId,
      subTechnique: options.subTechniques ? `${techniqueId}.001` : undefined
    }));

    const mitreFields = generateMitreFields(
      selectedTechniques,
      mitreData,
      narrative.mitre_context.attack_chains?.[0]
    );

    return mitreFields;
  }

  /**
   * Apply integration-specific fields
   */
  private async applyIntegrationFields(
    narrative: EnhancedAttackNarrative,
    options: CLIOptions
  ): Promise<Record<string, any>> {
    const fields: Record<string, any> = {};

    // Visual Event Analyzer fields
    if (options.visualAnalyzer && narrative.visual_analyzer) {
      const processHierarchy = narrative.visual_analyzer.process_hierarchies[0];
      if (processHierarchy) {
        fields['process.entity_id'] = faker.string.uuid();
        fields['process.parent.entity_id'] = faker.string.uuid();
        fields['agent.type'] = 'endpoint';
      }
    }

    // Session View fields
    if (options.sessionView && narrative.session_view) {
      const session = narrative.session_view.terminal_sessions[0];
      if (session) {
        fields['process.session_leader.entity_id'] = session.session_id;
        fields['process.working_directory'] = session.working_directory;
      }
    }

    // Integration fields for Kibana UI
    if (options.integrations) {
      fields['kibana.alert.rule.parameters.related_integrations'] = this.extractIntegrations(narrative);
    }

    return fields;
  }

  /**
   * Helper methods
   */
  
  private buildAlertOverrides(narrative: EnhancedAttackNarrative, options: CLIOptions): Record<string, any> {
    const overrides: Record<string, any> = {};

    // Set basic overrides based on narrative
    if (narrative.timeline.length > 0) {
      const primaryStage = narrative.timeline[0];
      overrides['event.action'] = this.inferEventAction(narrative);
      overrides['event.category'] = this.inferEventCategories(narrative);
    }

    return overrides;
  }

  private extractUsername(narrative: EnhancedAttackNarrative): string {
    // Extract from theme context or generate based on narrative
    if (narrative.theme_context?.character_pool.length) {
      return faker.helpers.arrayElement(narrative.theme_context.character_pool);
    }
    return faker.internet.username();
  }

  private extractHostname(narrative: EnhancedAttackNarrative): string {
    // Extract from theme context or generate based on narrative
    if (narrative.theme_context?.asset_naming.length) {
      return faker.helpers.arrayElement(narrative.theme_context.asset_naming);
    }
    return `${narrative.attack_type}-host-${faker.string.alphanumeric(4)}`;
  }

  private buildTimestampConfig(options: CLIOptions): TimestampConfig {
    return {
      startDate: options.startDate,
      endDate: options.endDate,
      pattern: options.timePattern as any
    };
  }

  private generateRuleName(narrative: EnhancedAttackNarrative): string {
    if (narrative.timeline.length > 0) {
      const primaryStage = narrative.timeline[0];
      const technique = primaryStage.mitre_technique || primaryStage.technique;
      const stageName = primaryStage.stage_name || primaryStage.stage;
      
      if (technique) {
        return `MITRE ${technique} ${stageName} Detection`;
      }
      return `${stageName} Security Alert`;
    }
    return `${narrative.attack_type.toUpperCase()} Attack Detection`;
  }

  private buildRuleDescription(narrative: EnhancedAttackNarrative): string {
    const stages = narrative.timeline.slice(0, 3); // First 3 stages
    const descriptions = stages.map(stage => stage.description || stage.desc || 'Security event');
    return `Detected ${narrative.attack_type} attack progression: ${descriptions.join(' → ')}`;
  }

  private buildAlertReason(stage: AttackStageNarrative): string {
    return `Security alert triggered: ${stage.description || stage.desc || 'Security event'} (${stage.mitre_technique || stage.technique || 'Unknown technique'})`;
  }

  private calculateSeverity(narrative: EnhancedAttackNarrative): 'low' | 'medium' | 'high' | 'critical' {
    const avgSeverity = narrative.timeline.reduce((sum, stage) => sum + stage.severity_impact, 0) / narrative.timeline.length;
    if (avgSeverity >= 8) return 'critical';
    if (avgSeverity >= 6) return 'high';
    if (avgSeverity >= 4) return 'medium';
    return 'low';
  }

  private calculateRiskScore(narrative: EnhancedAttackNarrative): number {
    const avgSeverity = narrative.timeline.reduce((sum, stage) => sum + stage.severity_impact, 0) / narrative.timeline.length;
    return Math.min(100, Math.floor(avgSeverity * 10));
  }

  private inferEventCategories(narrative: EnhancedAttackNarrative): string[] {
    const categories = [];
    
    if (narrative.technical_artifacts.processes.length > 0) categories.push('process');
    if (narrative.technical_artifacts.files.length > 0) categories.push('file');
    if (narrative.technical_artifacts.network_destinations.length > 0) categories.push('network');
    if (narrative.technical_artifacts.registry_modifications.length > 0) categories.push('registry');
    
    // Fallback
    if (categories.length === 0) categories.push('security');
    
    return categories;
  }

  private inferEventAction(narrative: EnhancedAttackNarrative): string {
    if (narrative.timeline.length > 0) {
      const primaryStage = narrative.timeline[0];
      // Handle both old format (description) and new format (desc)
      const description = primaryStage.description || primaryStage.desc || '';
      const lowerDesc = description.toLowerCase();
      
      if (lowerDesc.includes('execution') || lowerDesc.includes('execute')) return 'execution';
      if (lowerDesc.includes('access') || lowerDesc.includes('open')) return 'access';
      if (lowerDesc.includes('network') || lowerDesc.includes('connection')) return 'network_connection';
      if (lowerDesc.includes('file') || lowerDesc.includes('download')) return 'file_creation';
    }
    return 'security_detection';
  }

  private inferRuleType(narrative: EnhancedAttackNarrative, options: CLIOptions): string {
    if (options.mitre && narrative.mitre_context?.attack_chains) return 'eql';
    if (narrative.timeline.length > 1) return 'threshold';
    return 'query';
  }

  private selectRelevantFieldCategories(narrative: EnhancedAttackNarrative): string[] {
    const categories = ['behavioral_analytics']; // Always include behavioral

    if (narrative.attack_type === 'apt') {
      categories.push('threat_intelligence', 'network_analytics', 'forensics_analysis');
    } else if (narrative.attack_type === 'ransomware') {
      categories.push('malware_analysis', 'endpoint_analytics', 'incident_response');
    } else if (narrative.attack_type === 'insider') {
      categories.push('audit_compliance', 'security_scores', 'behavioral_analytics');
    }

    if (narrative.platform_context?.ai4soc_platform === 'splunk') {
      categories.push('performance_metrics');
    }

    return categories;
  }

  private generateFieldsFromCategory(templates: any, count: number, narrative: EnhancedAttackNarrative): Record<string, any> {
    const fields: Record<string, any> = {};
    const templateKeys = Object.keys(templates);
    
    for (let i = 0; i < Math.min(count, templateKeys.length); i++) {
      const fieldName = templateKeys[i];
      const template = templates[fieldName];
      fields[fieldName] = template.generator();
    }

    return fields;
  }

  private selectSplunkTemplate(narrative: EnhancedAttackNarrative) {
    return SPLUNK_TEMPLATES.find(t => t.eventType === this.narrativeToEventType(narrative)) || SPLUNK_TEMPLATES[0];
  }

  private selectSentinelOneTemplate(narrative: EnhancedAttackNarrative) {
    return SENTINELONE_TEMPLATES.find(t => t.eventType === this.narrativeToEventType(narrative)) || SENTINELONE_TEMPLATES[0];
  }

  private selectGoogleSecOpsTemplate(narrative: EnhancedAttackNarrative) {
    return GOOGLE_SECOPS_TEMPLATES.find(t => t.eventType === this.narrativeToEventType(narrative)) || GOOGLE_SECOPS_TEMPLATES[0];
  }

  private selectBestPlatformTemplate(narrative: EnhancedAttackNarrative) {
    // Default to Splunk template as most comprehensive
    return this.selectSplunkTemplate(narrative);
  }

  private narrativeToEventType(narrative: EnhancedAttackNarrative): 'file_access' | 'process_creation' | 'network_access' {
    if (narrative.technical_artifacts.processes.length > 0) return 'process_creation';
    if (narrative.technical_artifacts.network_destinations.length > 0) return 'network_access';
    return 'file_access';
  }

  private extractIntegrations(narrative: EnhancedAttackNarrative): Array<{package: string; version: string}> {
    const integrations = [];
    
    if (narrative.technical_artifacts.processes.length > 0) {
      integrations.push({ package: 'endpoint', version: '^8.0.0' });
    }
    if (narrative.technical_artifacts.network_destinations.length > 0) {
      integrations.push({ package: 'network_traffic', version: '^1.0.0' });
    }
    if (narrative.attack_type === 'apt') {
      integrations.push({ package: 'threat_intel', version: '^2.0.0' });
    }

    return integrations;
  }

  private extractIpFromDestination(destination: string): string {
    const ipMatch = destination.match(/(\d+\.\d+\.\d+\.\d+)/);
    return ipMatch ? ipMatch[1] : faker.internet.ipv4();
  }

  private extractDomainFromDestination(destination: string): string {
    const domainMatch = destination.match(/([a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/);
    return domainMatch ? domainMatch[1] : destination.split(':')[0];
  }

  private getTacticForTechnique(techniqueId: string, mitreData: any): string {
    for (const [tacticId, tacticData] of Object.entries(mitreData.tactics)) {
      if ((tacticData as any).techniques?.includes(techniqueId)) {
        return tacticId;
      }
    }
    return 'TA0001'; // Default to Initial Access
  }

  private mergeAlertSections(baseAlert: any, ...sections: Record<string, any>[]): BaseCreateAlertsReturnType {
    const merged = { ...baseAlert };
    
    for (const section of sections) {
      Object.assign(merged, section);
    }

    return merged;
  }

  private getUsedTemplateSources(options: CLIOptions): string[] {
    const sources = ['base_alert'];
    
    if (options.multiField) sources.push('multi_field_templates');
    if (options.theme) sources.push('theme_service');
    if (options.ai4soc) sources.push('ai4soc_templates');
    if (options.mitre) sources.push('mitre_service');
    if (options.visualAnalyzer) sources.push('visual_analyzer');
    
    return sources;
  }
}

export const templateOrchestrator = new TemplateOrchestrator();