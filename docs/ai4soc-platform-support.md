# AI4SOC Platform Support

## Overview

The AI4SOC platform support enables generation of realistic, platform-specific security alerts for major SIEM and security platforms. This feature is designed for AI4SOC product tier demonstrations and testing scenarios, providing authentic alert formats that match each platform's native structure.

## Supported Platforms

### 🔹 Splunk
- **Format**: Event-based raw data with structured fields
- **Index Pattern**: `ai4soc-splunk-*`
- **Key Features**: 
  - Severity scoring (0-100)
  - File access events with detailed paths
  - Process execution monitoring
  - Network traffic analysis
  - Raw event formatting (`_raw`, `_time`)

**Sample Field Structure:**
```json
{
  "_time": "2025-01-15T14:30:25.000Z",
  "_raw": "2025-01-15T14:30:25.000Z host-01 Suspicious file access detected",
  "event": {
    "title": "Suspicious File Access Activity",
    "severity": "high",
    "severity_score": 73
  },
  "file_path": "C:\\Temp\\data.zip",
  "user": {"name": "thor.odinson"},
  "mitre_technique": {
    "technique_id": "T1005",
    "technique_name": "Data from Local System"
  }
}
```

### 🔹 SentinelOne
- **Format**: Agent-centric threat detection with detailed process information
- **Index Pattern**: `ai4soc-sentinelone-*`
- **Key Features**:
  - Agent detection states and capabilities
  - Process creation monitoring
  - Threat classification (Malware, PUA, Suspicious)
  - Container and Kubernetes context
  - Endpoint response actions

**Sample Field Structure:**
```json
{
  "id": "alert-uuid",
  "alertInfo": {
    "eventType": "threats",
    "incidentStatus": "unresolved"
  },
  "agentDetectionInfo": {
    "name": "hawk-app-06",
    "agentOsName": "linux",
    "agentLastLoggedInUserName": "thor.odinson"
  },
  "threatInfo": {
    "classification": "Suspicious",
    "processDisplayName": "sudo su",
    "commandline": "sudo su -",
    "confidenceLevel": "suspicious"
  },
  "mitre": {
    "technique_id": "T1548",
    "technique_name": "Abuse Elevation Control Mechanism"
  }
}
```

### 🔹 Google SecOps
- **Format**: Finding-based with asset and entity context
- **Index Pattern**: `ai4soc-google-secops-*`
- **Key Features**:
  - Asset information and inventory
  - Finding classification and verdicts
  - Security marks and metadata
  - Network context and relationships
  - Timeline and correlation data

**Sample Field Structure:**
```json
{
  "alert": {
    "title": "Suspicious File Access Activity",
    "category": "SUSPICIOUS_ACTIVITY",
    "severity": "HIGH",
    "finding": {
      "verdict": "SUSPICIOUS",
      "confidence": "HIGH"
    }
  },
  "entity": {
    "hostname": "hawk-app-06",
    "user": {"userid": "thor.odinson"},
    "asset": {
      "platform": "LINUX",
      "ip": "192.168.1.100"
    }
  },
  "riskScore": 73,
  "mitre": {
    "technique_id": "T1005",
    "technique_name": "Data from Local System"
  }
}
```

## CLI Commands

### Basic Usage

```bash
# Generate alerts for specific platform
yarn start generate-alerts -n <count> --ai4soc --platform <platform>

# Available platforms: splunk, sentinelone, google-secops, all
yarn start generate-alerts -n 10 --ai4soc --platform splunk
yarn start generate-alerts -n 15 --ai4soc --platform sentinelone  
yarn start generate-alerts -n 20 --ai4soc --platform google-secops
yarn start generate-alerts -n 30 --ai4soc --platform all
```

### Advanced Options

```bash
# AI4SOC with MITRE ATT&CK integration
yarn start generate-alerts -n 10 --ai4soc --platform splunk --mitre

# AI4SOC with themed data
yarn start generate-alerts -n 15 --ai4soc --platform sentinelone --theme marvel

# AI4SOC with multi-field enrichment
yarn start generate-alerts -n 20 --ai4soc --platform google-secops --multi-field --field-count 500

# Complete integration: AI4SOC + MITRE + Theme + Visual Analyzer
yarn start generate-alerts -n 25 --ai4soc --platform all --mitre --theme starwars --visual-analyzer
```

### Platform Management

```bash
# Setup AI4SOC indices and templates (run once)
yarn start setup-ai4soc-mappings

# Check platform status and document counts
yarn start ai4soc-status

# Clean up AI4SOC indices and templates
yarn start delete-ai4soc-mappings
```

## Event Types

AI4SOC generates realistic security events across multiple categories:

### File Access Events
- **Splunk**: `event.type: file_access`, `file_path`, `access_type`
- **SentinelOne**: `threatInfo.filePath`, `threatInfo.processDisplayName`
- **Google SecOps**: `src_file.path`, `process.name`

**Common File Paths:**
- Windows: `C:\Temp\data.zip`, `C:\Windows\System32\secret.txt`
- Linux: `/etc/shadow`, `/tmp/credentials.txt`

### Process Creation Events
- **Splunk**: `process_command`, `parent_process`
- **SentinelOne**: `threatInfo.processDisplayName`, `threatInfo.commandline`
- **Google SecOps**: `process.command_line`, `parent_process.name`

**Common Commands:**
- Privilege escalation: `sudo su`, `pkexec /bin/bash`
- PowerShell: `powershell.exe -enc <base64>`
- Scripting: `python3 -c "import pty; pty.spawn('/bin/bash')"`

### Network Access Events
- **Splunk**: `network.src_ip`, `network.dest_port`
- **SentinelOne**: Container and Kubernetes network context
- **Google SecOps**: `network.sourceIp`, `network.protocol`

## Integration Features

### MITRE ATT&CK Mapping
All AI4SOC alerts include appropriate MITRE ATT&CK technique mappings:

```json
{
  "mitre_technique": {
    "technique_id": "T1005",
    "technique_name": "Data from Local System",
    "tactic": "Collection",
    "subtechnique": false
  }
}
```

### Theme Integration
AI4SOC works seamlessly with the theme system:

```bash
# Marvel-themed AI4SOC alerts
yarn start generate-alerts -n 10 --ai4soc --platform splunk --theme marvel
# Results: thor.odinson@asgard.com, iron-web-01, shield-db-02

# Star Wars-themed multi-platform alerts
yarn start generate-alerts -n 15 --ai4soc --platform all --theme starwars
# Results: luke.skywalker@rebels.org, jedi-api-01, death-star-srv-03
```

### Visual Event Analyzer
AI4SOC alerts can include correlated process events for enhanced analysis:

```bash
yarn start generate-alerts -n 10 --ai4soc --platform sentinelone --visual-analyzer
```

### Multi-Field Generation
Enhance AI4SOC alerts with additional contextual security fields:

```bash
yarn start generate-alerts -n 5 --ai4soc --platform google-secops --multi-field --field-count 1000
```

## Index Management

### Index Patterns
- **ai4soc-splunk-\***: Splunk event data
- **ai4soc-sentinelone-\***: SentinelOne agent and threat data
- **ai4soc-google-secops-\***: Google SecOps findings and assets
- **ai4soc-\*-\***: Cross-platform analysis (all platforms)

### Index Settings
Each platform uses optimized settings:
- **Shards**: 1 (single-node friendly)
- **Replicas**: 0 (development/testing)
- **Refresh**: 30s (balanced performance)
- **Max Result Window**: 50,000 (large result sets)

### Kibana Integration
AI4SOC indices are automatically configured for Kibana:

1. **Data Views**: Each platform gets its own data view
2. **Field Mappings**: Platform-specific field types and formats
3. **Index Patterns**: Optimized for cross-platform queries
4. **Visualizations**: Compatible with standard Kibana visualizations

## Use Cases

### SOC Training
```bash
# Multi-platform SOC analyst training
yarn start generate-alerts -n 50 --ai4soc --platform all --mitre --theme marvel

# Platform-specific investigation scenarios
yarn start generate-alerts -n 20 --ai4soc --platform splunk --visual-analyzer
yarn start generate-alerts -n 20 --ai4soc --platform sentinelone --multi-field
yarn start generate-alerts -n 20 --ai4soc --platform google-secops --theme nba
```

### Cross-Platform Correlation
```bash
# Generate correlated incidents across platforms
for platform in splunk sentinelone google-secops; do
  yarn start generate-alerts -n 10 --ai4soc --platform $platform --mitre --theme starwars
done
```

### Product Demonstrations
```bash
# AI4SOC product tier demo with complete integration
yarn start generate-alerts -n 30 --ai4soc --platform all --mitre --theme marvel --multi-field --visual-analyzer
```

### Detection Rule Testing
```bash
# Generate test data for detection rule validation
yarn start generate-alerts -n 100 --ai4soc --platform splunk --mitre --false-positive-rate 0.1
```

## Troubleshooting

### Common Issues

1. **Index Creation Errors**
   ```bash
   # Delete and recreate indices
   yarn start delete-ai4soc-mappings
   yarn start setup-ai4soc-mappings
   ```

2. **Document Not Indexing**
   ```bash
   # Check index status
   yarn start ai4soc-status
   
   # Manually refresh indices
   curl -X POST "localhost:9200/ai4soc-*/_refresh"
   ```

3. **Platform Validation Errors**
   - Ensure `--ai4soc` flag is used with `--platform`
   - Valid platforms: `splunk`, `sentinelone`, `google-secops`, `all`

### Verification Queries

```bash
# Check document counts per platform
curl "localhost:9200/ai4soc-*/_search?size=0&track_total_hits=true"

# View sample documents
curl "localhost:9200/ai4soc-splunk-*/_search?size=1&pretty"
curl "localhost:9200/ai4soc-sentinelone-*/_search?size=1&pretty"
curl "localhost:9200/ai4soc-google-secops-*/_search?size=1&pretty"
```

## Schema Reference

### Splunk Schema
- **File**: `src/schemas/ai4soc/splunk_alert_schema.json`
- **Key Fields**: `_time`, `_raw`, `event`, `user`, `host_info`, `network`, `mitre_technique`

### SentinelOne Schema  
- **File**: `src/schemas/ai4soc/sentinelone_alert_schema.json`
- **Key Fields**: `alertInfo`, `agentDetectionInfo`, `threatInfo`, `containerInfo`, `mitre`

### Google SecOps Schema
- **File**: `src/schemas/ai4soc/google_secops_alert_schema.json`
- **Key Fields**: `alert`, `entity`, `network`, `securityMarks`, `timeline`, `mitre`

## Best Practices

1. **Setup**: Always run `setup-ai4soc-mappings` before first use
2. **Testing**: Use smaller datasets first (`-n 5-10`)
3. **Themes**: Combine with themes for memorable test scenarios
4. **MITRE**: Include `--mitre` for realistic attack context
5. **Cleanup**: Use `delete-ai4soc-mappings` to clean test data

## API Integration

AI4SOC can be integrated programmatically:

```typescript
import { ai4socAlertGenerator } from './src/services/ai4soc_alert_generator';

const alerts = ai4socAlertGenerator.generateAlert({
  platform: 'splunk',
  userName: 'thor.odinson',
  hostName: 'asgard-web-01',
  eventType: 'file_access',
  severity: 'high'
});
```

This comprehensive platform support enables realistic multi-vendor security testing and demonstration scenarios for the AI4SOC product tier.