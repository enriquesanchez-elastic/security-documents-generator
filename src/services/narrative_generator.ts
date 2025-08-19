/**
 * Smart Narrative Generator - Stage 1 of Two-Stage Architecture
 * 
 * Generates attack narratives/storylines using AI (~200-400 tokens)
 * instead of complete JSON structures (~2000+ tokens).
 * 
 * This provides 90% token reduction while maintaining quality and context.
 */

import { OpenAI } from 'openai';
import Anthropic from '@anthropic-ai/sdk';
import { getConfig } from '../get_config';
import { 
  EnhancedAttackNarrative, 
  CLIOptions, 
  NarrativePromptContext,
  AttackStageNarrative,
  ThemeContext,
  PlatformContext
} from './narrative_generator_types';
import { withRetry, handleAIError, safeJsonParse } from '../utils/error_handling';
import { parseThemeConfig } from '../utils/theme_service';
import { loadMitreData } from '../utils/mitre_attack_service';
import { faker } from '@faker-js/faker';

export class SmartNarrativeGenerator {
  private openai: OpenAI | null = null;
  private claude: Anthropic | null = null;

  constructor() {
    this.initializeAI();
  }

  private initializeAI(): void {
    try {
      const config = getConfig();
      
      if (config.openaiApiKey || config.azureOpenAIApiKey) {
        this.openai = new OpenAI({
          apiKey: config.azureOpenAIApiKey || config.openaiApiKey,
          ...(config.useAzureOpenAI && {
            baseURL: `${config.azureOpenAIEndpoint}/openai/deployments/${config.azureOpenAIDeployment}`,
            defaultQuery: { 'api-version': config.azureOpenAIApiVersion },
            defaultHeaders: {
              'api-key': config.azureOpenAIApiKey,
            },
          }),
        });
      }

      if (config.claudeApiKey) {
        this.claude = new Anthropic({
          apiKey: config.claudeApiKey,
        });
      }
    } catch (error) {
      console.error('Failed to initialize AI clients:', error);
    }
  }

  /**
   * Generate enhanced attack narrative based on CLI options
   */
  async generateNarrative(options: CLIOptions): Promise<EnhancedAttackNarrative> {
    return withRetry(async () => {
      const promptContext = this.buildPromptContext(options);
      const rawNarrative = await this.callAI(promptContext, options);
      const enhancedNarrative = await this.enrichNarrativeWithContext(rawNarrative, options);
      
      return enhancedNarrative;
    }, 3, 1000, 'generateNarrative');
  }

  /**
   * Build contextual prompt that considers all CLI options
   */
  private buildPromptContext(options: CLIOptions): NarrativePromptContext {
    return {
      attack_type: this.inferAttackType(options),
      mitre_techniques: this.extractMitreTechniques(options),
      theme: options.theme,
      platform: options.ai4soc ? options.platform : undefined,
      realistic_mode: options.realistic || false,
      complexity_level: this.determineComplexityLevel(options),
      target_environment: this.buildEnvironmentContext(options),
    };
  }

  /**
   * Create efficient narrative-focused prompt (200-400 tokens vs 2000+)
   */
  private buildNarrativePrompt(context: NarrativePromptContext): string {
    let prompt = `Generate a realistic cyberattack storyline with the following context:\n\n`;

    // Attack type context
    if (context.attack_type && context.attack_type !== 'general') {
      prompt += `Attack Type: ${context.attack_type.toUpperCase()} attack scenario\n`;
    }

    // MITRE context
    if (context.mitre_techniques && context.mitre_techniques.length > 0) {
      prompt += `MITRE Techniques: Focus on ${context.mitre_techniques.join(', ')}\n`;
    }

    // Theme context
    if (context.theme) {
      prompt += `Theme: Generate ${context.theme}-themed usernames, hostnames, and organization names\n`;
    }

    // Platform context  
    if (context.platform) {
      prompt += `Platform: Optimize for ${context.platform} security platform\n`;
    }

    // Realistic mode
    if (context.realistic_mode) {
      prompt += `Mode: Generate realistic source log references that would trigger these alerts\n`;
    }

    prompt += `\n\nGenerate a CONCISE attack narrative as valid JSON. Keep it under 800 tokens.

IMPORTANT: 
- Use short, clear descriptions
- Maximum 3 timeline entries
- Keep technical details minimal
- Ensure all JSON strings are properly quoted and escaped
- No unescaped quotes or line breaks in strings

JSON FORMAT (COPY EXACTLY):
{
  "attack_type": "Brief attack description",
  "timeline": [
    {
      "time": "9:00 AM",
      "stage": "Initial Access",
      "desc": "Short description",
      "technique": "T1566",
      "severity": 8
    },
    {
      "time": "9:15 AM",
      "stage": "Execution",
      "desc": "Short description",
      "technique": "T1059",
      "severity": 7
    }
  ],
  "indicators": {
    "processes": ["cmd.exe", "powershell.exe"],
    "files": ["malware.exe"],
    "domains": ["evil.com"]
  }
}

Return ONLY the JSON object. No additional text.`;

    return prompt;
  }

  /**
   * Call AI with optimized narrative prompt
   */
  private async callAI(context: NarrativePromptContext, options: CLIOptions): Promise<any> {
    const prompt = this.buildNarrativePrompt(context);
    const useClaudeAI = options.claude || getConfig().useClaudeAI;

    try {
      if (useClaudeAI && this.claude) {
        const response = await this.claude.messages.create({
          model: 'claude-3-sonnet-20240229',
          max_tokens: 1500,
          system: 'You are a cybersecurity expert. Generate ONLY valid JSON. Keep responses concise. Always properly escape quotes and special characters in JSON strings.',
          messages: [{
            role: 'user',
            content: prompt
          }]
        });

        const content = response.content[0];
        if (content.type === 'text') {
          return this.parseAIGeneratedJSON(content.text);
        }
      } else if (this.openai) {
        const response = await this.openai.chat.completions.create({
          model: 'gpt-4',
          messages: [
            {
              role: 'system',
              content: 'You are a cybersecurity expert. Generate ONLY valid JSON. Keep responses concise. Always properly escape quotes and special characters in JSON strings.'
            },
            {
              role: 'user', 
              content: prompt
            }
          ],
          max_tokens: 1500,
          temperature: 0.2,
        });

        const content = response.choices[0].message.content;
        if (content) {
          return this.parseAIGeneratedJSON(content);
        }
      }

      throw new Error('No AI client available');
    } catch (error) {
      return handleAIError(error, 'narrative generation');
    }
  }

  /**
   * Parse AI-generated JSON with error recovery
   */
  private parseAIGeneratedJSON(content: string): any {
    try {
      // First, try to parse as-is
      return JSON.parse(content);
    } catch (error) {
      console.warn('Initial JSON parse failed, attempting recovery...');
      
      try {
        // Clean up common AI issues
        let cleanedContent = content.trim();
        
        // Remove any text before the first {
        const jsonStart = cleanedContent.indexOf('{');
        if (jsonStart > 0) {
          cleanedContent = cleanedContent.substring(jsonStart);
        }
        
        // Remove any text after the last }
        const jsonEnd = cleanedContent.lastIndexOf('}');
        if (jsonEnd > 0 && jsonEnd < cleanedContent.length - 1) {
          cleanedContent = cleanedContent.substring(0, jsonEnd + 1);
        }
        
        // Fix common JSON issues
        cleanedContent = cleanedContent
          .replace(/([{,]\s*)(\w+):/g, '$1"$2":') // Add quotes around unquoted keys
          .replace(/:\s*'([^']*)'/g, ': "$1"') // Replace single quotes with double quotes
          .replace(/\\n/g, ' ') // Replace literal \n with space
          .replace(/\n/g, ' ') // Replace actual newlines with space
          .replace(/\r/g, '') // Remove carriage returns
          .replace(/\t/g, ' ') // Replace tabs with space
          .replace(/\s+/g, ' ') // Replace multiple spaces with single space
          .replace(/,\s*}/g, '}') // Remove trailing commas before }
          .replace(/,\s*]/g, ']'); // Remove trailing commas before ]
        
        // Try to parse the cleaned content
        return JSON.parse(cleanedContent);
        
      } catch (secondError) {
        // If all else fails, return a minimal valid narrative
        console.warn('JSON recovery failed, using fallback narrative');
        return {
          attack_type: "Generic Security Event",
          timeline: [
            {
              time: "9:00 AM",
              stage: "Detection",
              desc: "Security event detected",
              technique: "T1000",
              severity: 5
            }
          ],
          indicators: {
            processes: ["unknown.exe"],
            files: ["temp.dat"],
            domains: ["unknown.com"]
          }
        };
      }
    }
  }

  /**
   * Enrich raw narrative with CLI option context
   */
  private async enrichNarrativeWithContext(
    rawNarrative: any, 
    options: CLIOptions
  ): Promise<EnhancedAttackNarrative> {
    const enhanced: EnhancedAttackNarrative = {
      attack_id: faker.string.uuid(),
      attack_type: rawNarrative.attack_type || 'general',
      timeline: rawNarrative.timeline || [],
      technical_artifacts: rawNarrative.technical_artifacts || {
        processes: [],
        files: [],
        network_destinations: [],
        registry_modifications: [],
        user_activities: []
      },
      generation_context: {
        realistic_mode: options.realistic || false,
        detection_rate: options.detectionRate || 0.4,
        false_positive_rate: options.falsePositiveRate || 0.0,
        environments: options.environments,
      }
    };

    // Add MITRE context if enabled
    if (options.mitre) {
      enhanced.mitre_context = await this.buildMitreContext(rawNarrative, options);
    }

    // Add theme context if enabled
    if (options.theme) {
      enhanced.theme_context = this.buildThemeContext(options.theme);
    }

    // Add platform context if enabled
    if (options.ai4soc) {
      enhanced.platform_context = this.buildPlatformContext(options.platform || 'all');
    }

    // Add Visual Event Analyzer context if enabled
    if (options.visualAnalyzer) {
      enhanced.visual_analyzer = this.buildVisualAnalyzerContext(enhanced.timeline);
    }

    // Add Session View context if enabled
    if (options.sessionView) {
      enhanced.session_view = this.buildSessionViewContext(enhanced.timeline);
    }

    return enhanced;
  }

  /**
   * Build MITRE context using existing service
   */
  private async buildMitreContext(rawNarrative: any, options: CLIOptions) {
    const mitreData = loadMitreData();
    if (!mitreData) return undefined;

    const techniques = rawNarrative.timeline
      .map((stage: AttackStageNarrative) => stage.mitre_technique)
      .filter((technique: string) => technique);

    return {
      techniques,
      sub_techniques: options.subTechniques ? techniques.map(t => `${t}.001`) : undefined,
      attack_chains: options.attackChains ? [{
        chain_id: faker.string.uuid(),
        progression: rawNarrative.timeline,
        overall_severity: this.calculateOverallSeverity(rawNarrative.timeline)
      }] : undefined,
      focused_tactic: options.focusTactic,
    };
  }

  /**
   * Build theme context using existing theme service
   */
  private buildThemeContext(theme: string): ThemeContext {
    const themeConfig = parseThemeConfig(theme);
    return {
      theme_name: themeConfig.theme || theme,
      character_pool: [], // Will be populated by existing theme service
      asset_naming: [],   // Will be populated by existing theme service
      organization_context: `${theme.charAt(0).toUpperCase() + theme.slice(1)} Corporation`
    };
  }

  /**
   * Build platform context for AI4SOC
   */
  private buildPlatformContext(platform: string): PlatformContext {
    return {
      ai4soc_platform: platform as any,
      platform_specific_indicators: {},
      required_fields: this.getPlatformRequiredFields(platform)
    };
  }

  /**
   * Helper methods
   */
  private inferAttackType(options: CLIOptions): string {
    if (options.mitre) {
      return options.focusTactic ? this.tacticToAttackType(options.focusTactic) : 'apt';
    }
    return 'general';
  }

  private extractMitreTechniques(options: CLIOptions): string[] {
    if (!options.mitre) return [];
    
    // If focus tactic is specified, return techniques for that tactic
    if (options.focusTactic) {
      const mitreData = loadMitreData();
      if (mitreData && mitreData.tactics[options.focusTactic]) {
        return mitreData.tactics[options.focusTactic].techniques.slice(0, 3);
      }
    }
    
    return ['T1566.001', 'T1059.001']; // Default techniques
  }

  private determineComplexityLevel(options: CLIOptions): 'basic' | 'intermediate' | 'expert' {
    let complexity = 0;
    if (options.attackChains) complexity++;
    if (options.subTechniques) complexity++;
    if (options.realistic) complexity++;
    if (options.multiField) complexity++;
    
    if (complexity >= 3) return 'expert';
    if (complexity >= 1) return 'intermediate';
    return 'basic';
  }

  private buildEnvironmentContext(options: CLIOptions): string {
    let context = 'Corporate network environment';
    if (options.environments && options.environments > 1) {
      context += ` with ${options.environments} separate environments`;
    }
    if (options.namespace && options.namespace !== 'default') {
      context += ` in ${options.namespace} namespace`;
    }
    return context;
  }

  private buildVisualAnalyzerContext(timeline: AttackStageNarrative[]) {
    return {
      process_hierarchies: timeline.map(stage => ({
        parent_pid: faker.number.int({ min: 1000, max: 65535 }),
        child_processes: stage.technical_indicators.processes?.map(proc => ({
          name: proc.split(' ')[0],
          command_line: proc,
          pid: faker.number.int({ min: 1000, max: 65535 })
        })) || []
      })),
      correlation_ids: timeline.map(() => faker.string.uuid()),
      entity_tracking: []
    };
  }

  private buildSessionViewContext(timeline: AttackStageNarrative[]) {
    return {
      terminal_sessions: [{
        session_id: faker.string.uuid(),
        user: faker.internet.username(),
        commands: timeline.flatMap(stage => 
          stage.technical_indicators.processes || []
        ),
        working_directory: '/home/user'
      }],
      command_sequences: []
    };
  }

  private calculateOverallSeverity(timeline: AttackStageNarrative[]): 'low' | 'medium' | 'high' | 'critical' {
    const avgSeverity = timeline.reduce((sum, stage) => sum + stage.severity_impact, 0) / timeline.length;
    if (avgSeverity >= 8) return 'critical';
    if (avgSeverity >= 6) return 'high';
    if (avgSeverity >= 4) return 'medium';
    return 'low';
  }

  private tacticToAttackType(tactic: string): string {
    const tacticMap: Record<string, string> = {
      'TA0001': 'apt',      // Initial Access
      'TA0002': 'apt',      // Execution  
      'TA0040': 'ransomware', // Impact
      'TA0010': 'apt',      // Exfiltration
    };
    return tacticMap[tactic] || 'apt';
  }

  private getPlatformRequiredFields(platform: string): string[] {
    const platformFields: Record<string, string[]> = {
      'splunk': ['sourcetype', 'index', 'host'],
      'sentinelone': ['EventType', 'SrcProcName', 'TgtProcName'],
      'google-secops': ['metadata.event_timestamp', 'security_result.action'],
      'all': []
    };
    return platformFields[platform] || [];
  }
}

export const smartNarrativeGenerator = new SmartNarrativeGenerator();