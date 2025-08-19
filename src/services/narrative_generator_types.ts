/**
 * Types for the Two-Stage Architecture: Narrative Generation + Template Execution
 * 
 * This module defines the interfaces for the new efficient approach where AI generates
 * attack narratives/storylines (~200 tokens) instead of complete JSON (~2000 tokens)
 */

export interface AttackStageNarrative {
  timestamp_offset: string; // e.g., "10:00 AM", "+2 minutes"
  stage_name: string; // e.g., "Initial Access", "Persistence"
  description: string; // Human readable description
  mitre_technique?: string; // T1566.001
  technical_indicators: {
    processes?: string[]; // e.g., ["powershell.exe -enc <base64>"]
    files?: string[]; // e.g., ["Invoice_Q4.pdf.exe"]
    network?: string[]; // e.g., ["beacon.malicious-domain.com:443"] 
    registry?: string[]; // e.g., ["HKLM\\Software\\Microsoft\\Windows\\CurrentVersion\\Run"]
  };
  severity_impact: number; // 1-10 scale
}

export interface AttackChain {
  chain_id: string;
  progression: AttackStageNarrative[];
  overall_severity: 'low' | 'medium' | 'high' | 'critical';
}

export interface ThemeContext {
  theme_name: string;
  character_pool: string[]; // e.g., ["tony.stark", "peter.parker"]
  asset_naming: string[]; // e.g., ["stark-industries-web-01", "shield-sql-02"]
  organization_context: string; // e.g., "Stark Industries"
}

export interface PlatformContext {
  ai4soc_platform: 'splunk' | 'sentinelone' | 'google-secops' | 'all';
  platform_specific_indicators: Record<string, any>;
  required_fields: string[]; // Platform-specific required fields
}

export interface VisualAnalyzerContext {
  process_hierarchies: ProcessHierarchy[];
  correlation_ids: string[];
  entity_tracking: EntityTracking[];
}

export interface ProcessHierarchy {
  parent_pid: number;
  child_processes: Array<{
    name: string;
    command_line: string;
    pid: number;
  }>;
}

export interface EntityTracking {
  entity_id: string;
  process_name: string;
  correlation_events: string[]; // Related event types
}

export interface SessionViewContext {
  terminal_sessions: TerminalSession[];
  command_sequences: CommandSequence[];
}

export interface TerminalSession {
  session_id: string;
  user: string;
  commands: string[];
  working_directory: string;
}

export interface CommandSequence {
  sequence_id: string;
  commands: Array<{
    command: string;
    timestamp_offset: string;
    exit_code: number;
  }>;
}

/**
 * Enhanced Attack Narrative - Core data structure for Stage 1
 */
export interface EnhancedAttackNarrative {
  // Core narrative
  attack_id: string;
  attack_type: 'apt' | 'ransomware' | 'insider' | 'supply_chain' | 'general';
  timeline: AttackStageNarrative[];
  
  // CLI-driven context
  mitre_context?: {
    techniques: string[];
    sub_techniques?: string[];
    attack_chains?: AttackChain[];
    focused_tactic?: string;
  };
  
  theme_context?: ThemeContext;
  platform_context?: PlatformContext;
  
  // Technical artifacts extracted from narrative
  technical_artifacts: {
    processes: string[];
    files: string[];
    network_destinations: string[];
    registry_modifications: string[];
    user_activities: string[];
  };
  
  // Integration requirements
  visual_analyzer?: VisualAnalyzerContext;
  session_view?: SessionViewContext;
  
  // Metadata
  generation_context: {
    realistic_mode: boolean;
    detection_rate: number;
    false_positive_rate: number;
    environments?: number;
  };
}

/**
 * CLI Options interface - matches existing CLI structure
 */
export interface CLIOptions {
  // Basic options
  count?: number;
  hosts?: number;
  users?: number;
  space?: string;
  namespace?: string;
  environments?: number;
  
  // AI options
  claude?: boolean;
  
  // MITRE options
  mitre?: boolean;
  subTechniques?: boolean;
  attackChains?: boolean;
  focusTactic?: string;
  
  // Multi-field options (leverage existing system)
  multiField?: boolean;
  fieldCount?: number;
  fieldCategories?: string;
  fieldPerformanceMode?: boolean;
  
  // Theme options (leverage existing system)
  theme?: string;
  
  // Platform options (leverage existing system)
  ai4soc?: boolean;
  platform?: 'splunk' | 'sentinelone' | 'google-secops' | 'all';
  
  // Integration options
  visualAnalyzer?: boolean;
  sessionView?: boolean;
  integrations?: boolean;
  
  // Campaign options
  realistic?: boolean;
  detectionRate?: number;
  falsePositiveRate?: number;
  
  // Performance options
  largeScale?: boolean;
  
  // Time options
  startDate?: string;
  endDate?: string;
  timePattern?: string;
}

/**
 * Template execution result
 */
export interface TemplateExecutionResult {
  base_alert: Record<string, any>;
  narrative_fields: Record<string, any>;
  multi_fields?: Record<string, any>;
  theme_fields?: Record<string, any>;
  platform_fields?: Record<string, any>;
  integration_fields?: Record<string, any>;
  performance_metadata: {
    generation_time_ms: number;
    field_count: number;
    template_sources: string[];
  };
}

/**
 * Narrative generation prompt context
 */
export interface NarrativePromptContext {
  attack_type?: string;
  mitre_techniques?: string[];
  theme?: string;
  platform?: string;
  realistic_mode?: boolean;
  complexity_level?: 'basic' | 'intermediate' | 'expert';
  target_environment?: string;
}