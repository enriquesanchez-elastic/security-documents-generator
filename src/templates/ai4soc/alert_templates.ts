/**
 * AI4SOC Alert Templates
 * 
 * Pre-defined alert templates for each supported platform
 */

export interface AlertTemplate {
  id: string;
  name: string;
  platform: 'splunk' | 'sentinelone' | 'google-secops';
  eventType: 'file_access' | 'process_creation' | 'network_access';
  severity: 'high' | 'critical' | 'medium';
  description: string;
  mitreMapping: {
    technique_id: string;
    technique_name: string;
    tactic: string;
  };
  fieldOverrides?: Record<string, any>;
}

export const SPLUNK_TEMPLATES: AlertTemplate[] = [
  {
    id: 'splunk_file_access_high',
    name: 'Suspicious File Access',
    platform: 'splunk',
    eventType: 'file_access',
    severity: 'high',
    description: 'Detected unauthorized access to sensitive system files',
    mitreMapping: {
      technique_id: 'T1005',
      technique_name: 'Data from Local System',
      tactic: 'Collection'
    },
    fieldOverrides: {
      file_path: 'C:\\Temp\\data.zip',
      severity_score: 73,
      access_type: 'read',
      process_name: 'cmd.exe'
    }
  },
  {
    id: 'splunk_process_creation_critical',
    name: 'Malicious Process Execution',
    platform: 'splunk',
    eventType: 'process_creation',
    severity: 'critical',
    description: 'Critical process creation indicating potential malware execution',
    mitreMapping: {
      technique_id: 'T1059',
      technique_name: 'Command and Scripting Interpreter',
      tactic: 'Execution'
    },
    fieldOverrides: {
      process_command: 'powershell.exe -enc IABpAGYAKAAkAFAAUwBWAGUAcgBzAGkA',
      severity_score: 95,
      parent_process: 'winlogon.exe'
    }
  }
];

export const SENTINELONE_TEMPLATES: AlertTemplate[] = [
  {
    id: 'sentinelone_privilege_escalation',
    name: 'Privilege Escalation Attempt',
    platform: 'sentinelone',
    eventType: 'process_creation',
    severity: 'critical',
    description: 'Detected privilege escalation attempt through sudo command',
    mitreMapping: {
      technique_id: 'T1548',
      technique_name: 'Abuse Elevation Control Mechanism',
      tactic: 'Privilege Escalation'
    },
    fieldOverrides: {
      processDisplayName: 'sudo su',
      processName: 'sudo',
      processIntegrityLevel: 'High',
      commandline: 'sudo su -',
      parentProcessName: 'bash'
    }
  },
  {
    id: 'sentinelone_file_tampering',
    name: 'System File Tampering',
    platform: 'sentinelone',
    eventType: 'file_access',
    severity: 'high',
    description: 'Suspicious access to critical system configuration files',
    mitreMapping: {
      technique_id: 'T1070',
      technique_name: 'Indicator Removal on Host',
      tactic: 'Defense Evasion'
    },
    fieldOverrides: {
      filePath: '/etc/shadow',
      processDisplayName: 'cat',
      classification: 'Suspicious'
    }
  }
];

export const GOOGLE_SECOPS_TEMPLATES: AlertTemplate[] = [
  {
    id: 'google_secops_file_access',
    name: 'Suspicious File Access',
    platform: 'google-secops',
    eventType: 'file_access',
    severity: 'high',
    description: 'High-severity file access event with network context',
    mitreMapping: {
      technique_id: 'T1005',
      technique_name: 'Data from Local System',
      tactic: 'Collection'
    },
    fieldOverrides: {
      'src_file.path': 'C:\\Windows\\System32\\secret.txt',
      riskScore: 73,
      'alert.finding.verdict': 'SUSPICIOUS'
    }
  },
  {
    id: 'google_secops_process_creation',
    name: 'Malicious Process Creation',
    platform: 'google-secops',
    eventType: 'process_creation',
    severity: 'critical',
    description: 'Critical process creation with encoded command execution',
    mitreMapping: {
      technique_id: 'T1059',
      technique_name: 'Command and Scripting Interpreter',
      tactic: 'Execution'
    },
    fieldOverrides: {
      'process.command_line': 'powershell.exe -enc IABpAGYAKAAkAFAAUwBWAGUAcgBzAGkA',
      riskScore: 95,
      'alert.finding.verdict': 'MALICIOUS'
    }
  }
];

/**
 * Get all templates for a specific platform
 */
export function getTemplatesForPlatform(platform: 'splunk' | 'sentinelone' | 'google-secops'): AlertTemplate[] {
  switch (platform) {
    case 'splunk':
      return SPLUNK_TEMPLATES;
    case 'sentinelone':
      return SENTINELONE_TEMPLATES;
    case 'google-secops':
      return GOOGLE_SECOPS_TEMPLATES;
    default:
      return [];
  }
}

/**
 * Get template by ID
 */
export function getTemplateById(templateId: string): AlertTemplate | undefined {
  const allTemplates = [
    ...SPLUNK_TEMPLATES,
    ...SENTINELONE_TEMPLATES,
    ...GOOGLE_SECOPS_TEMPLATES
  ];
  
  return allTemplates.find(template => template.id === templateId);
}

/**
 * Get all available templates
 */
export function getAllTemplates(): AlertTemplate[] {
  return [
    ...SPLUNK_TEMPLATES,
    ...SENTINELONE_TEMPLATES,
    ...GOOGLE_SECOPS_TEMPLATES
  ];
}