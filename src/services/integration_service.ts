/**
 * Integration Service
 * 
 * Manages Fleet integration packages for detection rules and alerts.
 * Provides realistic integration data based on rule characteristics.
 */

import { faker } from '@faker-js/faker';

export interface ElasticIntegration {
  package: string;
  version: string;
  integration?: string;
  description: string;
  categories: string[];
  dataStreams: string[];
}

export interface RuleContext {
  ruleType: string;
  query?: string;
  category?: string;
  severity?: string;
  riskScore?: number;
}

/**
 * Comprehensive list of realistic Elastic integrations for security use cases
 */
export const ELASTIC_INTEGRATIONS: ElasticIntegration[] = [
  // Endpoint Security
  {
    package: 'endpoint',
    version: '8.7.0',
    integration: 'endpoint',
    description: 'Elastic Defend - Advanced endpoint protection and detection',
    categories: ['security', 'endpoint'],
    dataStreams: ['logs-endpoint.events.process', 'logs-endpoint.events.file', 'logs-endpoint.events.network'],
  },
  
  // Windows Security
  {
    package: 'windows',
    version: '1.19.0',
    description: 'Windows Event Logs and security monitoring',
    categories: ['security', 'os'],
    dataStreams: ['logs-windows.sysmon_operational', 'logs-windows.powershell', 'logs-windows.forwarded'],
  },
  
  // System Integration
  {
    package: 'system',
    version: '1.17.0',
    description: 'System logs and metrics for Linux/Unix systems',
    categories: ['security', 'os'],
    dataStreams: ['logs-system.auth', 'logs-system.syslog', 'logs-system.sudo'],
  },
  
  // AWS Cloud Security
  {
    package: 'aws',
    version: '2.7.0',
    integration: 'cloudtrail',
    description: 'AWS CloudTrail - API monitoring and governance',
    categories: ['cloud', 'security'],
    dataStreams: ['logs-aws.cloudtrail'],
  },
  {
    package: 'aws',
    version: '2.7.0',
    integration: 'vpc_flow',
    description: 'AWS VPC Flow Logs - Network traffic analysis',
    categories: ['cloud', 'network'],
    dataStreams: ['logs-aws.vpcflow'],
  },
  {
    package: 'aws',
    version: '2.7.0',
    integration: 'guardduty',
    description: 'AWS GuardDuty - Threat detection service',
    categories: ['cloud', 'security'],
    dataStreams: ['logs-aws.guardduty'],
  },
  
  // Azure Cloud Security
  {
    package: 'azure',
    version: '1.5.0',
    integration: 'activitylogs',
    description: 'Azure Activity Logs - Resource management monitoring',
    categories: ['cloud', 'security'],
    dataStreams: ['logs-azure.activitylogs'],
  },
  {
    package: 'azure',
    version: '1.5.0',
    integration: 'auditlogs',
    description: 'Azure AD Audit Logs - Identity and access monitoring',
    categories: ['cloud', 'security', 'authentication'],
    dataStreams: ['logs-azure.auditlogs'],
  },
  {
    package: 'azure',
    version: '1.5.0',
    integration: 'signinlogs',
    description: 'Azure AD Sign-in Logs - Authentication monitoring',
    categories: ['cloud', 'security', 'authentication'],
    dataStreams: ['logs-azure.signinlogs'],
  },
  
  // Google Cloud Security
  {
    package: 'gcp',
    version: '2.5.0',
    integration: 'audit',
    description: 'Google Cloud Audit Logs - API activity monitoring',
    categories: ['cloud', 'security'],
    dataStreams: ['logs-gcp.audit'],
  },
  {
    package: 'gcp',
    version: '2.5.0',
    integration: 'vpc_flow',
    description: 'Google Cloud VPC Flow Logs - Network monitoring',
    categories: ['cloud', 'network'],
    dataStreams: ['logs-gcp.vpcflow'],
  },
  
  // Network Security
  {
    package: 'suricata',
    version: '1.4.0',
    description: 'Suricata IDS/IPS - Network intrusion detection',
    categories: ['security', 'network'],
    dataStreams: ['logs-suricata.eve'],
  },
  {
    package: 'zeek',
    version: '1.7.0',
    description: 'Zeek Network Security Monitor',
    categories: ['security', 'network'],
    dataStreams: ['logs-zeek.conn', 'logs-zeek.dns', 'logs-zeek.http'],
  },
  {
    package: 'cisco',
    version: '2.1.0',
    integration: 'asa',
    description: 'Cisco ASA Firewall logs',
    categories: ['security', 'network', 'firewall'],
    dataStreams: ['logs-cisco.asa'],
  },
  {
    package: 'paloalto',
    version: '1.9.0',
    integration: 'panos',
    description: 'Palo Alto Networks PAN-OS firewall',
    categories: ['security', 'network', 'firewall'],
    dataStreams: ['logs-paloalto.panos'],
  },
  
  // Authentication & Identity
  {
    package: 'okta',
    version: '2.2.0',
    description: 'Okta Identity and Access Management',
    categories: ['security', 'authentication'],
    dataStreams: ['logs-okta.system'],
  },
  {
    package: 'auth0',
    version: '1.1.0',
    description: 'Auth0 Identity Platform logs',
    categories: ['security', 'authentication'],
    dataStreams: ['logs-auth0.events'],
  },
  
  // Security Tools
  {
    package: 'crowdstrike',
    version: '1.2.0',
    description: 'CrowdStrike Falcon - Endpoint detection and response',
    categories: ['security', 'endpoint'],
    dataStreams: ['logs-crowdstrike.falcon'],
  },
  {
    package: 'sentinel_one',
    version: '1.3.0',
    description: 'SentinelOne - Autonomous endpoint protection',
    categories: ['security', 'endpoint'],
    dataStreams: ['logs-sentinel_one.activity'],
  },
  {
    package: 'microsoft_defender',
    version: '2.0.0',
    description: 'Microsoft Defender for Endpoint',
    categories: ['security', 'endpoint'],
    dataStreams: ['logs-microsoft_defender.incident'],
  },
  
  // Threat Intelligence
  {
    package: 'threat_intel',
    version: '1.0.0',
    description: 'Threat Intelligence indicators and IOCs',
    categories: ['security', 'threat_intel'],
    dataStreams: ['threat-*'],
  },
  {
    package: 'misp',
    version: '1.2.0',
    description: 'MISP Threat Intelligence Platform',
    categories: ['security', 'threat_intel'],
    dataStreams: ['logs-misp.threat'],
  },
  
  // Web Application Security
  {
    package: 'nginx',
    version: '1.14.0',
    description: 'Nginx web server access and error logs',
    categories: ['security', 'web'],
    dataStreams: ['logs-nginx.access', 'logs-nginx.error'],
  },
  {
    package: 'apache',
    version: '1.12.0',
    description: 'Apache HTTP Server logs',
    categories: ['security', 'web'],
    dataStreams: ['logs-apache.access', 'logs-apache.error'],
  },
  {
    package: 'cloudflare',
    version: '1.8.0',
    description: 'Cloudflare security and performance logs',
    categories: ['security', 'web', 'cdn'],
    dataStreams: ['logs-cloudflare.logpush'],
  },
  
  // Database Security
  {
    package: 'mysql',
    version: '1.11.0',
    description: 'MySQL database logs and metrics',
    categories: ['security', 'database'],
    dataStreams: ['logs-mysql.error', 'logs-mysql.slowlog'],
  },
  {
    package: 'postgresql',
    version: '1.9.0',
    description: 'PostgreSQL database logs',
    categories: ['security', 'database'],
    dataStreams: ['logs-postgresql.log'],
  },
  
  // Container Security
  {
    package: 'kubernetes',
    version: '1.29.0',
    description: 'Kubernetes cluster monitoring and security',
    categories: ['security', 'container'],
    dataStreams: ['logs-kubernetes.audit', 'logs-kubernetes.container_logs'],
  },
  {
    package: 'docker',
    version: '1.5.0',
    description: 'Docker container logs and metrics',
    categories: ['security', 'container'],
    dataStreams: ['logs-docker.container_logs'],
  },
  
  // Email Security
  {
    package: 'o365',
    version: '1.8.0',
    integration: 'audit',
    description: 'Microsoft Office 365 audit logs',
    categories: ['security', 'email', 'cloud'],
    dataStreams: ['logs-o365.audit'],
  },
  {
    package: 'gsuite',
    version: '2.3.0',
    description: 'Google Workspace (G Suite) admin and security logs',
    categories: ['security', 'email', 'cloud'],
    dataStreams: ['logs-gsuite.admin', 'logs-gsuite.login'],
  },
  
  // SIEM/Security Platforms
  {
    package: 'splunk',
    version: '1.0.0',
    description: 'Splunk platform data ingestion',
    categories: ['security', 'siem'],
    dataStreams: ['logs-splunk.*'],
  },
  {
    package: 'qradar',
    version: '1.1.0',
    description: 'IBM QRadar SIEM platform',
    categories: ['security', 'siem'],
    dataStreams: ['logs-qradar.offense'],
  },
  
  // DNS Security
  {
    package: 'dns',
    version: '1.2.0',
    description: 'DNS query logs and security monitoring',
    categories: ['security', 'network', 'dns'],
    dataStreams: ['logs-dns.log'],
  },
  
  // VPN Security
  {
    package: 'fortinet',
    version: '1.6.0',
    integration: 'fortigate',
    description: 'Fortinet FortiGate firewall and VPN logs',
    categories: ['security', 'network', 'vpn'],
    dataStreams: ['logs-fortinet.fortigate'],
  },
  
  // Mobile Device Management
  {
    package: 'jamf',
    version: '1.0.0',
    description: 'Jamf Pro mobile device management',
    categories: ['security', 'mdm'],
    dataStreams: ['logs-jamf.compliance'],
  },
];

/**
 * Integration Service Class
 */
export class IntegrationService {
  private integrations: ElasticIntegration[];
  
  constructor() {
    this.integrations = ELASTIC_INTEGRATIONS;
  }

  /**
   * Select appropriate integrations based on rule context
   */
  selectIntegrationsForRule(context: RuleContext): ElasticIntegration[] {
    const selectedIntegrations: ElasticIntegration[] = [];
    const query = context.query?.toLowerCase() || '';
    const category = context.category?.toLowerCase() || '';
    
    // Select based on rule type and query content
    switch (context.ruleType) {
      case 'query':
      case 'threshold':
      case 'eql':
        selectedIntegrations.push(...this.selectByQuery(query));
        break;
        
      case 'machine_learning':
        selectedIntegrations.push(...this.selectByMLContext(query));
        break;
        
      case 'threat_match':
        selectedIntegrations.push(...this.selectByThreatContext());
        break;
        
      case 'new_terms':
        selectedIntegrations.push(...this.selectByNewTermsContext(query));
        break;
        
      case 'esql':
        selectedIntegrations.push(...this.selectByESQLContext(query));
        break;
    }

    // Add category-based selections
    if (category) {
      selectedIntegrations.push(...this.selectByCategory(category));
    }

    // Remove duplicates and limit to 1-3 integrations for realism
    const uniqueIntegrations = this.removeDuplicates(selectedIntegrations);
    const maxIntegrations = faker.number.int({ min: 1, max: 3 });
    
    return faker.helpers.arrayElements(uniqueIntegrations, { min: 1, max: maxIntegrations });
  }

  /**
   * Select integrations based on query content
   */
  private selectByQuery(query: string): ElasticIntegration[] {
    const integrations: ElasticIntegration[] = [];
    
    // Process detection
    if (query.includes('process') || query.includes('cmd.exe') || query.includes('powershell')) {
      this.safelyAddIntegrations(integrations,
        { package: 'endpoint' },
        { package: 'windows' },
        { package: 'system' }
      );
    }
    
    // Authentication
    if (query.includes('authentication') || query.includes('login') || query.includes('auth')) {
      this.safelyAddIntegrations(integrations,
        { package: 'okta' },
        { package: 'azure', integration: 'auditlogs' },
        { package: 'windows' }
      );
    }
    
    // Network activity
    if (query.includes('network') || query.includes('destination.port') || query.includes('source.ip')) {
      this.safelyAddIntegrations(integrations,
        { package: 'suricata' },
        { package: 'zeek' },
        { package: 'aws', integration: 'vpc_flow' }
      );
    }
    
    // File operations
    if (query.includes('file') || query.includes('file.extension')) {
      this.safelyAddIntegrations(integrations,
        { package: 'endpoint' },
        { package: 'windows' },
        { package: 'system' }
      );
    }
    
    // Cloud activity
    if (query.includes('cloud') || query.includes('aws') || query.includes('azure') || query.includes('gcp')) {
      this.safelyAddIntegrations(integrations,
        { package: 'aws', integration: 'cloudtrail' },
        { package: 'azure', integration: 'activitylogs' },
        { package: 'gcp', integration: 'audit' }
      );
    }
    
    // Web activity
    if (query.includes('http') || query.includes('url') || query.includes('web')) {
      this.safelyAddIntegrations(integrations,
        { package: 'nginx' },
        { package: 'apache' },
        { package: 'cloudflare' }
      );
    }

    return integrations.filter((integration): integration is ElasticIntegration => integration !== null);
  }

  /**
   * Select integrations for ML rules
   */
  private selectByMLContext(query: string): ElasticIntegration[] {
    const integrations: ElasticIntegration[] = [];
    
    if (query.includes('auth') || query.includes('authentication')) {
      this.safelyAddIntegrations(integrations,
        { package: 'okta' },
        { package: 'azure', integration: 'signinlogs' },
        { package: 'auth0' }
      );
    }
    
    if (query.includes('windows') || query.includes('process')) {
      this.safelyAddIntegrations(integrations,
        { package: 'windows' },
        { package: 'endpoint' },
        { package: 'microsoft_defender' }
      );
    }
    
    if (query.includes('linux') || query.includes('system')) {
      this.safelyAddIntegrations(integrations,
        { package: 'system' },
        { package: 'endpoint' }
      );
    }
    
    if (query.includes('network') || query.includes('cloudtrail')) {
      this.safelyAddIntegrations(integrations,
        { package: 'aws', integration: 'cloudtrail' },
        { package: 'suricata' },
        { package: 'zeek' }
      );
    }

    return integrations;
  }

  /**
   * Select integrations for threat match rules
   */
  private selectByThreatContext(): ElasticIntegration[] {
    const integrations: ElasticIntegration[] = [];
    this.safelyAddIntegrations(integrations,
      { package: 'threat_intel' },
      { package: 'misp' },
      { package: 'crowdstrike' },
      { package: 'aws', integration: 'guardduty' }
    );
    return integrations;
  }

  /**
   * Select integrations for new terms rules
   */
  private selectByNewTermsContext(query: string): ElasticIntegration[] {
    // New terms rules often look for baseline deviations
    const integrations: ElasticIntegration[] = [];
    this.safelyAddIntegrations(integrations,
      { package: 'endpoint' },
      { package: 'system' },
      { package: 'windows' },
      { package: 'okta' }
    );
    return integrations;
  }

  /**
   * Select integrations for ESQL rules
   */
  private selectByESQLContext(query: string): ElasticIntegration[] {
    const integrations: ElasticIntegration[] = [];
    
    if (query.includes('process')) {
      this.safelyAddIntegrations(integrations, { package: 'endpoint' });
    }
    
    if (query.includes('authentication')) {
      this.safelyAddIntegrations(integrations, { package: 'okta' });
    }
    
    if (query.includes('network')) {
      this.safelyAddIntegrations(integrations, { package: 'suricata' });
    }

    return integrations;
  }

  /**
   * Select integrations by category
   */
  private selectByCategory(category: string): ElasticIntegration[] {
    const integrations: ElasticIntegration[] = [];
    
    switch (category) {
      case 'process':
        this.safelyAddIntegrations(integrations, 
          { package: 'endpoint' }, 
          { package: 'windows' }
        );
        break;
      case 'authentication':
        this.safelyAddIntegrations(integrations, 
          { package: 'okta' }, 
          { package: 'azure', integration: 'auditlogs' }
        );
        break;
      case 'network':
        this.safelyAddIntegrations(integrations, 
          { package: 'suricata' }, 
          { package: 'zeek' }
        );
        break;
      case 'file':
        this.safelyAddIntegrations(integrations, 
          { package: 'endpoint' }, 
          { package: 'system' }
        );
        break;
      case 'web':
        this.safelyAddIntegrations(integrations, 
          { package: 'nginx' }, 
          { package: 'apache' }
        );
        break;
    }

    return integrations;
  }

  /**
   * Get integration by package name and optional integration name
   */
  private getIntegration(packageName: string, integrationName?: string): ElasticIntegration | null {
    return this.integrations.find(integration => 
      integration.package === packageName && 
      (integrationName ? integration.integration === integrationName : true)
    ) || null;
  }

  /**
   * Helper method to safely add integrations to an array
   */
  private safelyAddIntegrations(
    integrations: ElasticIntegration[], 
    ...integrationRequests: Array<{ package: string; integration?: string }>
  ): void {
    for (const request of integrationRequests) {
      const integration = this.getIntegration(request.package, request.integration);
      if (integration) {
        integrations.push(integration);
      }
    }
  }

  /**
   * Remove duplicate integrations
   */
  private removeDuplicates(integrations: ElasticIntegration[]): ElasticIntegration[] {
    const seen = new Set<string>();
    return integrations.filter(integration => {
      const key = `${integration.package}-${integration.integration || ''}`;
      if (seen.has(key)) {
        return false;
      }
      seen.add(key);
      return true;
    });
  }

  /**
   * Convert integrations to the related_integrations format
   */
  formatForRule(integrations: ElasticIntegration[]): Array<{package: string; version: string; integration?: string}> {
    return integrations.map(integration => ({
      package: integration.package,
      version: integration.version,
      ...(integration.integration && { integration: integration.integration })
    }));
  }

  /**
   * Get all available integrations
   */
  getAllIntegrations(): ElasticIntegration[] {
    return [...this.integrations];
  }

  /**
   * Get integrations by category
   */
  getIntegrationsByCategory(category: string): ElasticIntegration[] {
    return this.integrations.filter(integration => 
      integration.categories.includes(category)
    );
  }
}

// Export singleton instance
export const integrationService = new IntegrationService();