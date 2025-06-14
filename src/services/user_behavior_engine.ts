/**
 * User Behavior Modeling Engine
 *
 * This service models realistic user behavior patterns, generates baseline
 * activities, and creates detectable anomalies for testing user behavior
 * analytics (UBA) and insider threat detection capabilities.
 */

import { faker } from '@faker-js/faker';
import { generateAIAlert } from '../utils/ai_service';
import { BaseCreateAlertsReturnType } from '../create_alerts';
import { TimestampConfig } from '../utils/timestamp_utils';

export interface UserBehaviorProfile {
  user_id: string;
  username: string;
  full_name: string;
  email: string;
  department: string;
  role: string;
  access_level: 'standard' | 'privileged' | 'admin';
  employment_status: 'active' | 'suspended' | 'terminated';
  hire_date: Date;
  manager: string;

  // Behavioral baselines
  work_schedule: {
    timezone: string;
    typical_hours: {
      start: number; // hour of day (0-23)
      end: number;
    };
    work_days: number[]; // 0=Sunday, 1=Monday, etc.
  };

  location_profile: {
    primary_office: string;
    typical_locations: string[];
    remote_work_frequency: number; // 0-1
  };

  access_patterns: {
    typical_systems: string[];
    typical_files: string[];
    data_sensitivity_levels: string[];
    average_session_duration: number; // minutes
  };

  communication_profile: {
    internal_contacts: string[];
    external_contacts: string[];
    email_volume_per_day: number;
    collaboration_tools: string[];
  };

  risk_indicators: {
    performance_issues: boolean;
    disciplinary_actions: number;
    financial_stress: boolean;
    job_dissatisfaction_score: number; // 0-10
    access_privilege_changes: Date[];
  };
}

export interface BehaviorBaseline {
  user_id: string;
  metric_type:
    | 'login_frequency'
    | 'file_access'
    | 'network_activity'
    | 'email_volume'
    | 'application_usage';
  time_period: 'hourly' | 'daily' | 'weekly' | 'monthly';
  baseline_value: number;
  variance: number;
  confidence_interval: [number, number];
  last_updated: Date;
}

export interface BehaviorAnomaly {
  id: string;
  user_id: string;
  anomaly_type:
    | 'temporal'
    | 'volumetric'
    | 'access_pattern'
    | 'geographic'
    | 'behavioral';
  description: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  risk_score: number; // 0-100
  detection_time: Date;
  related_events: string[];
  confidence: number; // 0-1

  // Context for anomaly
  baseline_value: number;
  observed_value: number;
  deviation_factor: number;

  // Attributes specific to anomaly type
  attributes: {
    [key: string]: any;
  };
}

export interface UserActivity {
  id: string;
  user_id: string;
  timestamp: Date;
  activity_type:
    | 'login'
    | 'logout'
    | 'file_access'
    | 'email_send'
    | 'application_access'
    | 'network_connection';
  source_ip: string;
  user_agent?: string;
  location?: string;
  resource_accessed?: string;
  success: boolean;
  risk_score: number;

  // Contextual data
  session_id?: string;
  duration?: number; // for login sessions
  data_volume?: number; // for file/network activities
  recipients?: string[]; // for email activities
}

export interface InsiderThreatScenario {
  id: string;
  name: string;
  threat_type: 'malicious' | 'negligent' | 'compromised';
  user_profile: UserBehaviorProfile;
  motivation: string;
  timeline: {
    start_date: Date;
    end_date: Date;
    key_milestones: ThreatMilestone[];
  };
  indicators: BehaviorAnomaly[];
  expected_impact: {
    data_at_risk: string[];
    financial_impact: number;
    reputation_damage: 'low' | 'medium' | 'high';
  };
}

export interface ThreatMilestone {
  date: Date;
  event: string;
  indicators: string[];
  escalation_level: number; // 1-5
}

/**
 * Main User Behavior Engine Class
 */
export class UserBehaviorEngine {
  private userProfiles: Map<string, UserBehaviorProfile>;
  private behaviorBaselines: Map<string, BehaviorBaseline[]>;
  private anomalyDetectionRules: AnomalyDetectionRule[];

  constructor() {
    this.userProfiles = new Map();
    this.behaviorBaselines = new Map();
    this.anomalyDetectionRules = this.initializeAnomalyRules();
  }

  /**
   * Generates a diverse set of user profiles for an organization
   */
  generateUserProfiles(count: number = 100): UserBehaviorProfile[] {
    const profiles: UserBehaviorProfile[] = [];
    const departments = [
      'IT',
      'Finance',
      'HR',
      'Marketing',
      'Sales',
      'Operations',
      'Legal',
    ];
    const roles = [
      'Analyst',
      'Manager',
      'Director',
      'Admin',
      'Developer',
      'Contractor',
    ];

    for (let i = 0; i < count; i++) {
      const department = faker.helpers.arrayElement(departments);
      const role = faker.helpers.arrayElement(roles);
      const username = faker.internet.userName().toLowerCase();

      const profile: UserBehaviorProfile = {
        user_id: faker.string.uuid(),
        username,
        full_name: faker.person.fullName(),
        email: `${username}@company.com`,
        department,
        role,
        access_level: this.determineAccessLevel(role),
        employment_status: faker.helpers.weightedArrayElement([
          { weight: 0.95, value: 'active' as const },
          { weight: 0.03, value: 'suspended' as const },
          { weight: 0.02, value: 'terminated' as const },
        ]),
        hire_date: faker.date.past({ years: 5 }),
        manager: faker.person.fullName(),

        work_schedule: {
          timezone: faker.helpers.arrayElement([
            'America/New_York',
            'America/Los_Angeles',
            'Europe/London',
          ]),
          typical_hours: {
            start: faker.number.int({ min: 7, max: 10 }),
            end: faker.number.int({ min: 16, max: 19 }),
          },
          work_days: [1, 2, 3, 4, 5], // Monday-Friday
        },

        location_profile: {
          primary_office: faker.helpers.arrayElement([
            'New York',
            'San Francisco',
            'London',
            'Remote',
          ]),
          typical_locations: [faker.location.city(), faker.location.city()],
          remote_work_frequency: faker.number.float({ min: 0, max: 1 }),
        },

        access_patterns: {
          typical_systems: this.generateTypicalSystems(department, role),
          typical_files: this.generateTypicalFiles(department),
          data_sensitivity_levels: this.generateDataSensitivity(role),
          average_session_duration: faker.number.int({ min: 60, max: 480 }),
        },

        communication_profile: {
          internal_contacts: Array.from(
            { length: faker.number.int({ min: 5, max: 20 }) },
            () => faker.internet.email(),
          ),
          external_contacts: Array.from(
            { length: faker.number.int({ min: 2, max: 10 }) },
            () => faker.internet.email(),
          ),
          email_volume_per_day: faker.number.int({ min: 10, max: 100 }),
          collaboration_tools: ['Slack', 'Teams', 'Zoom'],
        },

        risk_indicators: {
          performance_issues: faker.datatype.boolean(0.1),
          disciplinary_actions: faker.number.int({ min: 0, max: 3 }),
          financial_stress: faker.datatype.boolean(0.15),
          job_dissatisfaction_score: faker.number.int({ min: 0, max: 10 }),
          access_privilege_changes: [faker.date.past({ years: 1 })],
        },
      };

      profiles.push(profile);
      this.userProfiles.set(profile.user_id, profile);
    }

    return profiles;
  }

  /**
   * Generates realistic baseline behavior for a user
   */
  generateUserBaseline(
    user: UserBehaviorProfile,
    days: number = 90,
  ): BehaviorBaseline[] {
    const baselines: BehaviorBaseline[] = [];
    const baselineTypes = [
      'login_frequency',
      'file_access',
      'network_activity',
      'email_volume',
      'application_usage',
    ] as const;

    for (const metricType of baselineTypes) {
      const baseline = this.calculateBaselineForMetric(user, metricType, days);
      baselines.push(baseline);
    }

    this.behaviorBaselines.set(user.user_id, baselines);
    return baselines;
  }

  /**
   * Generates anomalous behavior patterns for testing detection capabilities
   */
  generateBehaviorAnomalies(
    user: UserBehaviorProfile,
    anomalyType: 'insider_threat' | 'compromised_account' | 'privilege_abuse',
    intensity: 'subtle' | 'moderate' | 'obvious' = 'moderate',
  ): BehaviorAnomaly[] {
    const anomalies: BehaviorAnomaly[] = [];

    switch (anomalyType) {
      case 'insider_threat':
        anomalies.push(...this.generateInsiderThreatAnomalies(user, intensity));
        break;
      case 'compromised_account':
        anomalies.push(
          ...this.generateCompromisedAccountAnomalies(user, intensity),
        );
        break;
      case 'privilege_abuse':
        anomalies.push(
          ...this.generatePrivilegeAbuseAnomalies(user, intensity),
        );
        break;
    }

    return anomalies;
  }

  /**
   * Creates security events based on user behavior anomalies
   */
  async generateAnomalyEvents(
    anomalies: BehaviorAnomaly[],
    targetHosts: string[],
    space: string = 'default',
  ): Promise<BaseCreateAlertsReturnType[]> {
    const events: BaseCreateAlertsReturnType[] = [];

    for (const anomaly of anomalies) {
      const user = this.userProfiles.get(anomaly.user_id);
      if (!user) continue;

      const hostname = faker.helpers.arrayElement(targetHosts);

      const timestampConfig: TimestampConfig = {
        startDate: '7d',
        pattern: 'random',
      };

      try {
        const alert = await generateAIAlert({
          userName: user.username,
          hostName: hostname,
          space,
          alertType: `uba_${anomaly.anomaly_type}_${anomaly.severity}`,
          timestampConfig,
        });

        // Enhance alert with UBA-specific fields
        (alert as any)['kibana.alert.rule.category'] =
          'User Behavior Analytics';
        (alert as any)['user.risk.static_level'] = anomaly.severity;
        (alert as any)['user.risk.calculated_score_norm'] = anomaly.risk_score;
        (alert as any)['user.risk.calculated_level'] = this.calculateRiskLevel(
          anomaly.risk_score,
        );

        events.push(alert);
      } catch (error) {
        console.warn(
          `Failed to generate UBA alert for anomaly ${anomaly.id}:`,
          error,
        );
      }
    }

    return events;
  }

  private determineAccessLevel(
    role: string,
  ): 'standard' | 'privileged' | 'admin' {
    const adminRoles = ['Director', 'Admin'];
    const privilegedRoles = ['Manager', 'Developer'];

    if (adminRoles.some((r) => role.includes(r))) return 'admin';
    if (privilegedRoles.some((r) => role.includes(r))) return 'privileged';
    return 'standard';
  }

  private generateTypicalSystems(department: string, role: string): string[] {
    const baseSystems = ['email', 'intranet', 'hr_portal'];
    const departmentSystems: Record<string, string[]> = {
      IT: ['jira', 'confluence', 'jenkins', 'aws_console'],
      Finance: ['sap', 'quickbooks', 'bloomberg'],
      HR: ['workday', 'bamboohr', 'adp'],
      Marketing: ['salesforce', 'hubspot', 'adobe_creative'],
      Sales: ['salesforce', 'crm', 'linkedin_sales'],
    };

    return [...baseSystems, ...(departmentSystems[department] || [])];
  }

  private generateTypicalFiles(department: string): string[] {
    const baseFiles = ['documents/', 'downloads/', 'desktop/'];
    const departmentFiles: Record<string, string[]> = {
      Finance: ['financial_reports/', 'budgets/', 'audit_files/'],
      HR: ['employee_records/', 'payroll/', 'benefits/'],
      IT: ['scripts/', 'configs/', 'logs/'],
      Legal: ['contracts/', 'legal_docs/', 'compliance/'],
    };

    return [...baseFiles, ...(departmentFiles[department] || [])];
  }

  private generateDataSensitivity(role: string): string[] {
    const baseLevels = ['public', 'internal'];
    const privilegedLevels = ['confidential'];
    const adminLevels = ['restricted', 'top_secret'];

    let levels = [...baseLevels];
    if (['Manager', 'Director', 'Admin'].some((r) => role.includes(r))) {
      levels.push(...privilegedLevels);
    }
    if (['Director', 'Admin'].some((r) => role.includes(r))) {
      levels.push(...adminLevels);
    }

    return levels;
  }

  private calculateBaselineForMetric(
    user: UserBehaviorProfile,
    metricType: BehaviorBaseline['metric_type'],
    days: number,
  ): BehaviorBaseline {
    const baselineValues: Record<
      BehaviorBaseline['metric_type'],
      { value: number; variance: number }
    > = {
      login_frequency: {
        value: faker.number.int({ min: 1, max: 5 }),
        variance: 0.3,
      },
      file_access: {
        value: faker.number.int({ min: 20, max: 200 }),
        variance: 0.4,
      },
      network_activity: {
        value: faker.number.int({ min: 100, max: 1000 }),
        variance: 0.5,
      },
      email_volume: {
        value: user.communication_profile.email_volume_per_day,
        variance: 0.2,
      },
      application_usage: {
        value: faker.number.int({ min: 3, max: 15 }),
        variance: 0.3,
      },
    };

    const { value, variance } = baselineValues[metricType];
    const confidenceInterval: [number, number] = [
      Math.max(0, value * (1 - variance)),
      value * (1 + variance),
    ];

    return {
      user_id: user.user_id,
      metric_type: metricType,
      time_period: 'daily',
      baseline_value: value,
      variance,
      confidence_interval: confidenceInterval,
      last_updated: new Date(),
    };
  }

  private generateInsiderThreatAnomalies(
    user: UserBehaviorProfile,
    intensity: 'subtle' | 'moderate' | 'obvious',
  ): BehaviorAnomaly[] {
    const baselines = this.behaviorBaselines.get(user.user_id) || [];
    const anomalies: BehaviorAnomaly[] = [];

    // After-hours access anomaly
    anomalies.push({
      id: faker.string.uuid(),
      user_id: user.user_id,
      anomaly_type: 'temporal',
      description: 'Unusual after-hours system access detected',
      severity:
        intensity === 'subtle'
          ? 'low'
          : intensity === 'moderate'
            ? 'medium'
            : 'high',
      risk_score:
        intensity === 'subtle' ? 30 : intensity === 'moderate' ? 60 : 85,
      detection_time: new Date(),
      related_events: [],
      confidence:
        intensity === 'subtle' ? 0.6 : intensity === 'moderate' ? 0.8 : 0.95,
      baseline_value: user.work_schedule.typical_hours.end,
      observed_value: 23, // 11 PM access
      deviation_factor: 2.5,
      attributes: {
        access_time: '23:00',
        typical_end_time: user.work_schedule.typical_hours.end,
        day_of_week: 'Saturday',
      },
    });

    // Excessive file access anomaly
    const fileAccessBaseline = baselines.find(
      (b) => b.metric_type === 'file_access',
    );
    if (fileAccessBaseline) {
      anomalies.push({
        id: faker.string.uuid(),
        user_id: user.user_id,
        anomaly_type: 'volumetric',
        description: 'Abnormally high file access volume detected',
        severity: intensity === 'obvious' ? 'critical' : 'medium',
        risk_score:
          intensity === 'subtle' ? 45 : intensity === 'moderate' ? 70 : 95,
        detection_time: new Date(),
        related_events: [],
        confidence: 0.85,
        baseline_value: fileAccessBaseline.baseline_value,
        observed_value:
          fileAccessBaseline.baseline_value *
          (intensity === 'subtle' ? 2 : intensity === 'moderate' ? 4 : 8),
        deviation_factor:
          intensity === 'subtle' ? 2 : intensity === 'moderate' ? 4 : 8,
        attributes: {
          file_types: ['pdf', 'docx', 'xlsx'],
          sensitive_files: true,
          bulk_download: intensity !== 'subtle',
        },
      });
    }

    return anomalies;
  }

  private generateCompromisedAccountAnomalies(
    user: UserBehaviorProfile,
    intensity: 'subtle' | 'moderate' | 'obvious',
  ): BehaviorAnomaly[] {
    const anomalies: BehaviorAnomaly[] = [];

    // Geographic anomaly
    anomalies.push({
      id: faker.string.uuid(),
      user_id: user.user_id,
      anomaly_type: 'geographic',
      description: 'Login from unusual geographic location',
      severity: intensity === 'subtle' ? 'medium' : 'high',
      risk_score:
        intensity === 'subtle' ? 50 : intensity === 'moderate' ? 75 : 90,
      detection_time: new Date(),
      related_events: [],
      confidence: 0.9,
      baseline_value: 0, // No previous logins from this location
      observed_value: 1,
      deviation_factor: Infinity,
      attributes: {
        login_location: faker.location.country(),
        previous_locations: user.location_profile.typical_locations,
        ip_reputation: intensity === 'obvious' ? 'malicious' : 'unknown',
        tor_exit_node: intensity === 'obvious',
      },
    });

    return anomalies;
  }

  private generatePrivilegeAbuseAnomalies(
    user: UserBehaviorProfile,
    intensity: 'subtle' | 'moderate' | 'obvious',
  ): BehaviorAnomaly[] {
    const anomalies: BehaviorAnomaly[] = [];

    // Privilege escalation attempt
    anomalies.push({
      id: faker.string.uuid(),
      user_id: user.user_id,
      anomaly_type: 'access_pattern',
      description: 'Attempt to access resources beyond typical privilege level',
      severity: intensity === 'obvious' ? 'critical' : 'high',
      risk_score:
        intensity === 'subtle' ? 65 : intensity === 'moderate' ? 80 : 95,
      detection_time: new Date(),
      related_events: [],
      confidence: 0.8,
      baseline_value: user.access_patterns.typical_systems.length,
      observed_value: user.access_patterns.typical_systems.length + 5,
      deviation_factor: 1.5,
      attributes: {
        attempted_systems: ['admin_panel', 'backup_system', 'security_console'],
        access_denied_count:
          intensity === 'subtle' ? 2 : intensity === 'moderate' ? 5 : 12,
        privilege_level_attempted: 'admin',
        current_privilege_level: user.access_level,
      },
    });

    return anomalies;
  }

  private calculateRiskLevel(riskScore: number): string {
    if (riskScore >= 80) return 'critical';
    if (riskScore >= 60) return 'high';
    if (riskScore >= 40) return 'medium';
    return 'low';
  }

  private initializeAnomalyRules(): AnomalyDetectionRule[] {
    return [
      {
        id: 'after_hours_access',
        name: 'After Hours System Access',
        thresholds: { low: 1.5, medium: 2.0, high: 3.0 },
        confidence_threshold: 0.7,
      },
      {
        id: 'geographic_anomaly',
        name: 'Unusual Geographic Access',
        thresholds: { low: 1.0, medium: 1.0, high: 1.0 },
        confidence_threshold: 0.8,
      },
    ];
  }
}

// Supporting interfaces
interface AnomalyDetectionRule {
  id: string;
  name: string;
  thresholds: {
    low: number;
    medium: number;
    high: number;
  };
  confidence_threshold: number;
}

export default UserBehaviorEngine;
