# 🎯 Overview

End-to-end test cases that verify the new two-stage architecture works correctly by running specific commands and validating the expected results 
in Kibana dashboards and indices.

---
⚡ Test Case 1: Basic Alert Generation with New Architecture

Duration: 10 minutesObjective: Verify basic alert generation shows performance improvements

Commands to Run:

# Clean previous data
yarn start delete-alerts

# Generate basic alerts with new architecture
yarn start generate-alerts -n 10 -s test-new-arch

# Generate MITRE alerts for comparison  
yarn start generate-alerts -n 10 --mitre -s test-new-arch-mitre

Expected Results in Kibana:

Security → Alerts:
- Index: .alerts-security.alerts-default  
- Expected Count: 20 alerts total
- Space Filter: test-new-arch and test-new-arch-mitre
- Key Fields to Verify:
  - @timestamp - Recent timestamps
  - kibana.alert.uuid - Unique UUIDs for all alerts
  - kibana.alert.rule.name - Realistic rule names
  - host.name & user.name - Consistent entity names
  - kibana.alert.severity - Values: low, medium, high, critical
  - _unified_generation_metadata.total_time_ms - Should be < 2000ms per alert
  - _unified_generation_metadata.cli_options_used - Should show ["basic"] or ["mitre"]

MITRE Alerts Should Also Have:
- threat.technique.id - Array with values like ["T1566.001"]  
- threat.technique.name - Corresponding technique names
- threat.tactic.id - Values like ["TA0001"]
- threat.tactic.name - Corresponding tactic names

KQL Queries to Test:
# All new architecture alerts
kibana.space_ids: "test-new-arch*"

# MITRE alerts specifically  
threat.technique.id: T* AND kibana.space_ids: "test-new-arch-mitre"

# Performance validation
_unified_generation_metadata.total_time_ms < 2000

---
🎭 Test Case 2: Themed Alert Generation

Duration: 15 minutesObjective: Verify theme integration works with new architecture

Commands to Run:

# Clean previous data
yarn start delete-alerts

# Generate Marvel themed alerts
yarn start generate-alerts -n 15 --theme marvel -s marvel-test

# Generate NBA themed alerts for comparison
yarn start generate-alerts -n 15 --theme nba -s nba-test

Expected Results in Kibana:

Security → Alerts:
- Expected Count: 30 alerts total
- Marvel Themed Alerts (space: marvel-test):
  - user.name - Should contain Marvel character names (e.g., "tony.stark", "peter.parker")
  - host.name - Should contain Marvel-themed hostnames (e.g., "stark-industries-web-01")
  - _theme_context.theme - Should be "marvel"
  - _theme_context.applied_entities - Should show themed entity data
- NBA Themed Alerts (space: nba-test):
  - user.name - Should contain NBA player names
  - host.name - Should contain NBA team-themed hostnames
  - _theme_context.theme - Should be "nba"

KQL Queries to Test:
# Marvel themed alerts
kibana.space_ids: "marvel-test" AND user.name: (*stark* OR *parker* OR *banner*)

# NBA themed alerts  
kibana.space_ids: "nba-test" AND user.name: (*lebron* OR *curry* OR *durant*)

# Theme metadata
_theme_context.theme: "marvel" OR _theme_context.theme: "nba"

---
🔬 Test Case 3: Multi-Field Generation Performance

Duration: 20 minutes
Objective: Verify 99% token reduction with multi-field generation

Commands to Run:

# Clean previous data
yarn start delete-alerts

# Generate alerts with extensive multi-field data
yarn start generate-alerts -n 5 --multi-field --field-count 500 -s multifield-test

# Generate with specific field categories
yarn start generate-alerts -n 5 --multi-field --field-count 300 --field-categories "behavioral_analytics,threat_intelligence,security_scores" -s multifield-categories

Expected Results in Kibana:

Security → Alerts:
- Expected Count: 10 alerts total
- Field Count: Each alert should have 500+ fields (first batch) and 300+ fields (second batch)
- Performance Indicators (✅ FIXED - Now Working):
  - _unified_generation_metadata.template_execution_time_ms - Should be < 100ms
  - _unified_generation_metadata.field_generation_method - Should be "template_based"
  - _unified_generation_metadata.token_usage_estimated - Should be < 500 tokens
  - _unified_generation_metadata.field_count_generated - Should match --field-count parameter
  - _unified_generation_metadata.cli_options_used - Should show ["multi_field"] or ["multi_field", "field_categories"]
  - _unified_generation_metadata.performance_mode - Should be false

Multi-Field Category Validation:
Since field selection uses weighted random sampling from 10,000+ available fields across 12 categories, 
verify that fields from the specified categories are present (not exact field names):

**For --field-categories "behavioral_analytics,threat_intelligence,security_scores":**
- Fields starting with "user_behavior.*", "host_behavior.*", or "entity_behavior.*" 
- Fields starting with "threat.*", "risk.*", or containing "intelligence"
- Fields starting with "security.score.*", "risk.assessment.*", or "security.controls.*"

**Sample Field Patterns to Check (use wildcards):**
- behavioral_analytics.*: * - Should find behavioral analytics fields
- threat.*: * - Should find threat intelligence fields  
- security.score.*: * - Should find security scoring fields
- performance.*: * - Should find performance metrics fields
- network.analytics.*: * - Should find network analytics fields

Elasticsearch Validation Commands:
```bash
# Check field count in alerts
curl -u "elastic:changeme" -s -X GET "localhost:9200/.alerts-security.alerts-multifield-test/_search?size=1" | 
  python3 -c "import sys,json; data=json.load(sys.stdin); print(f'Total fields: {len(data[\"hits\"][\"hits\"][0][\"_source\"].keys()) if data[\"hits\"][\"hits\"] else \"No data\"}')"

# Check performance metadata exists
curl -u "elastic:changeme" -s -X GET "localhost:9200/.alerts-security.alerts-multifield-test/_search?size=1&_source=_unified_generation_metadata" | 
  python3 -c "import sys,json; data=json.load(sys.stdin); print(json.dumps(data['hits']['hits'][0]['_source']['_unified_generation_metadata'], indent=2) if data['hits']['hits'] else 'No metadata found')"
```

KQL Queries to Test:
# Multi-field alerts with performance metadata
kibana.space_ids: "multifield*" AND _unified_generation_metadata.field_generation_method: "template_based"

# Performance validation - template execution time
_unified_generation_metadata.template_execution_time_ms: [0 TO 100] AND kibana.space_ids: "multifield*"

# Field count validation
_unified_generation_metadata.field_count_generated: [250 TO *] AND kibana.space_ids: "multifield*"

# Category-specific field validation (use wildcards since exact fields vary)
behavioral_analytics.*: * AND kibana.space_ids: "multifield-categories"
threat.*: * AND kibana.space_ids: "multifield-categories"  
security.score.*: * AND kibana.space_ids: "multifield-categories"

# Token efficiency validation  
_unified_generation_metadata.token_usage_estimated: [0 TO 500] AND kibana.space_ids: "multifield*"

---
👁️ Test Case 4: Visual Event Analyzer Integration

Duration: 25 minutes
Objective: Verify Visual Event Analyzer process correlation works

Commands to Run:

# Clean previous data
yarn start delete-alerts
yarn start delete-logs

# Generate alerts with Visual Event Analyzer
yarn start generate-alerts -n 10 --visual-analyzer -s visual-test

# Generate correlated process events  
yarn start generate-logs -n 50 --visual-analyzer --types endpoint -s visual-test

Expected Results in Kibana:

Security → Alerts:
- Expected Count: 10 alerts
- Visual Analyzer Fields:
  - agent.type - Should be "endpoint"
  - process.entity_id - Unique process entity IDs
  - event.correlation.id - Correlation IDs for linking
  - investigation.id - Investigation session IDs
  - process.hierarchy.level - Numeric values indicating depth
  - threat.assessment.score - Correlation-based threat scores

Discover → Process Events:
- Index Pattern: logs-endpoint.events.process-*
- Expected Count: 50+ process events  
- Process Hierarchy Fields:
  - process.parent.entity_id - Parent process references
  - process.entity_id - Current process IDs
  - process.command_line - Realistic command lines
  - process.name - Process names (e.g., powershell.exe, cmd.exe)

Visual Event Analyzer → Process View:
- Navigate to: Security → Explore → Visual Event Analyzer
- Search for any process.entity_id from alerts
- Expected: Multi-branch process tree visualization
- Process Chains: Should show parent → child relationships
- Event Correlation: Click on processes to see related network/file events

KQL Queries to Test:
# Alerts with Visual Analyzer data
agent.type: "endpoint" AND process.entity_id: * AND kibana.space_ids: "visual-test"

# Process events with correlation
data_stream.dataset: "endpoint.events.process" AND event.correlation.id: *

# Process hierarchy validation
process.hierarchy.level > 0 AND process.parent.entity_id: *

# Investigation sessions
investigation.id: * AND process.entity_id: *

---
🎯 Test Case 5: Detection Rules with Integration Coordination

Duration: 30 minutes
Objective: Verify rule generation coordinates with alert generation

Commands to Run:

# Clean previous data
yarn start delete-rules
yarn start delete-alerts

# Generate detection rules with integrations (✅ FIXED - Removed --visual-analyzer)
yarn start rules -r 10 --integrations -s rules-test

# Generate coordinated alerts that reference the rules
yarn start generate-alerts -n 20 --integrations --visual-analyzer -s rules-test

**Note**: Integration coordination requires Kibana connectivity. If you see warnings about "No coordinated rules available", this indicates:
- Rules generation completed but coordination failed (usually due to Kibana 404 errors)
- Alerts will still generate successfully with integrations and visual-analyzer features
- The underlying functionality is working; coordination requires proper Kibana API access

Expected Results in Kibana:

Security → Rules:
- Expected Count: 10 detection rules
- Rule Types: Mix of query, threshold, eql, machine_learning, etc.
- Integration Data:
  - related_integrations - Should contain Fleet package references
  - related_integrations[].package - Values like "endpoint", "windows", "system"
  - related_integrations[].version - Package versions
  - Rule names should be realistic and varied

Security → Alerts:
- Expected Count: 20 alerts  
- Rule Coordination:
  - kibana.alert.rule.uuid - Should match UUIDs of generated rules
  - kibana.alert.rule.name - Should match rule names exactly
  - kibana.alert.rule.type - Should match rule types
  - Integration context should be consistent between rule and alert

Navigate to a Specific Alert:
1. Go to Security → Alerts
2. Click on any alert from rules-test space
3. Expected Rule Reference Section:
  - Rule name should link to actual rule
  - Integration packages should be displayed
  - Rule type should be shown correctly

KQL Queries to Test:
# Alerts with rule coordination
kibana.alert.rule.uuid: * AND kibana.space_ids: "rules-test"

# Integration coordination validation  
related_integrations.package: * AND kibana.space_ids: "rules-test"

# Rule-alert consistency
kibana.alert.rule.type: ("query" OR "threshold" OR "eql") AND kibana.space_ids: "rules-test"

---
🏢 Test Case 6: AI4SOC Platform Integration

Duration: 20 minutes
Objective: Verify platform-specific alert generation

Commands to Run:

# Clean previous data  
yarn start delete-alerts

# Setup AI4SOC mappings
yarn start setup-ai4soc-mappings

# Generate Splunk-specific alerts
yarn start generate-alerts -n 8 --ai4soc --platform splunk -s splunk-test

# Generate SentinelOne-specific alerts
yarn start generate-alerts -n 8 --ai4soc --platform sentinelone -s sentinelone-test

# Check AI4SOC status
yarn start ai4soc-status

Expected Results in Kibana:

Index Management → AI4SOC Indices:
- Splunk Index: ai4soc-alerts-splunk-*
- SentinelOne Index: ai4soc-alerts-sentinelone-*
- Templates: AI4SOC index templates should exist

Discover → AI4SOC Alerts:
- Splunk Alerts (ai4soc-alerts-splunk-*):
  - _platform_context.platform - Should be "splunk"
  - _platform_context.template_id - Splunk template IDs
  - Platform-specific fields matching Splunk format
  - event.dataset - Splunk-compatible values
- SentinelOne Alerts (ai4soc-alerts-sentinelone-*):
  - _platform_context.platform - Should be "sentinelone"
  - SentinelOne-specific field mappings
  - Endpoint security focused data

AI4SOC Status Check:
- Command should show:
  - Index templates created
  - Indices exist with document counts
  - No mapping conflicts

KQL Queries to Test:
# Splunk platform alerts
_platform_context.platform: "splunk"

# SentinelOne platform alerts  
_platform_context.platform: "sentinelone"

# AI4SOC template validation
_platform_context.template_id: * AND _platform_context.platform: *

---
⚔️ Test Case 7: Attack Campaign Generation

Duration: 25 minutes
Objective: Verify sophisticated campaign generation works

Commands to Run:

# Clean previous data
yarn start delete-alerts  
yarn start delete-logs

# Generate APT campaign
yarn start generate-campaign apt --realistic --detection-rate 0.8 -s apt-campaign

# Generate ransomware campaign with Visual Analyzer
yarn start generate-campaign ransomware --visual-analyzer --realistic -s ransomware-campaign

Expected Results in Kibana:

Security → Alerts:
- APT Campaign (space: apt-campaign):
  - Expected Count: Multiple alerts (15-50)
  - Campaign Coordination:
  - campaign.id - Shared campaign identifier
- campaign.type - Should be "apt"
- campaign.stage - Values like "initial_access", "lateral_movement", "exfiltration"
- attack.progression.sequence - Numeric sequence indicators
  - Temporal Patterns: Timestamps should show realistic attack progression over time
  - Detection Rate: ~80% of events should be flagged as detected
- Ransomware Campaign (space: ransomware-campaign):
  - campaign.type - Should be "ransomware"  
  - Process Events: Should have corresponding process events with encryption activity
  - Visual Analyzer Fields: Process correlations for ransomware execution

Timeline Visualization:
1. Go to Security → Explore → Timeline
2. Filter by campaign spaces
3. Expected: Events should show chronological attack progression
4. Attack Stages: Should see clear phases of the attack

KQL Queries to Test:
# APT campaign alerts
campaign.type: "apt" AND kibana.space_ids: "apt-campaign"

# Campaign progression
campaign.stage: ("initial_access" OR "lateral_movement" OR "exfiltration") AND campaign.id: *

# Ransomware campaign with processes
campaign.type: "ransomware" AND process.entity_id: * AND kibana.space_ids: "ransomware-campaign"

# Detection rate validation
campaign.detected: true AND campaign.id: *

---
📊 Test Case 8: Performance Validation Dashboard

Duration: 15 minutes
Objective: Verify performance improvements are measurable

Commands to Run:

# Generate performance comparison data
yarn start generate-alerts -n 50 --mitre --multi-field --field-count 200 --theme marvel --visual-analyzer -s performance-test

# Check generation metadata
yarn start generate-alerts -n 10 -s metadata-test

Expected Results in Kibana:

Create Performance Dashboard:
1. Go to Analytics → Dashboard
2. Create new dashboard: "Two-Stage Architecture Performance"
3. Add visualizations for:

Visualization 1: Generation Time Distribution
- Type: Histogram
- Field: _unified_generation_metadata.total_time_ms
- Expected: Most alerts generated in < 2000ms (vs old 5000-8000ms)

Visualization 2: Token Usage Estimation  
- Type: Metric
- Field: _unified_generation_metadata.token_usage_estimated
- Expected: Average < 500 tokens per alert (vs old 2500+ tokens)

Visualization 3: Field Generation Method
- Type: Pie Chart  
- Field: _unified_generation_metadata.field_generation_method
- Expected: "template_based" should be majority

Visualization 4: CLI Options Usage
- Type: Tag Cloud
- Field: _unified_generation_metadata.cli_options_used
- Expected: Show various CLI options being used

Performance KQL Queries:
# Fast generation validation
_unified_generation_metadata.total_time_ms < 2000

# Token efficiency  
_unified_generation_metadata.token_usage_estimated < 500

# Template-based generation
_unified_generation_metadata.field_generation_method: "template_based"

# CLI options coverage
_unified_generation_metadata.cli_options_used: *

---
🚨 Test Case 9: Error Handling and Fallback

Duration: 10 minutes
Objective: Verify system handles errors gracefully

Commands to Run:

# Test with invalid configuration
yarn start generate-alerts -n 5 -s error-test --theme invalid-theme

# Test with large field counts
yarn start generate-alerts -n 3 --multi-field --field-count 10000 -s large-field-test

# Test without AI service (should still work with templates)  
yarn start generate-alerts -n 5 -s template-only-test

Expected Results in Kibana:

Error Handling Validation:
- Invalid Theme: Alerts should still generate with fallback to default naming
- Large Field Count: Should generate successfully with performance warnings logged
- Template-Only: Should generate alerts using faker-based templates without AI

Error Metadata:
- _error_handling.fallback_used - Should indicate when fallbacks were used
- _error_handling.warnings - Should contain warning messages
- All alerts should still have core required fields regardless of errors

KQL Queries to Test:
# Fallback usage tracking
_error_handling.fallback_used: true

# Warning message validation
_error_handling.warnings: *

# Core field completeness despite errors
kibana.alert.uuid: * AND @timestamp: * AND host.name: *

---
🔧 Test Case 10: Multi-Field Performance Metadata Validation

Duration: 10 minutes
Objective: Validate that performance metadata is correctly added to multi-field alerts

Commands to Run:

# Clean previous data
yarn start delete-alerts

# Test various multi-field configurations
yarn start generate-alerts -n 3 --multi-field --field-count 50 -s metadata-basic
yarn start generate-alerts -n 2 --multi-field --field-count 100 --field-categories "behavioral_analytics,security_scores" -s metadata-categories

Direct Elasticsearch Validation:

```bash
# Test basic multi-field metadata
curl -u "elastic:changeme" -s -X GET "localhost:9200/.alerts-security.alerts-metadata-basic/_search?size=1&_source=_unified_generation_metadata" | python3 -c "
import sys, json
data = json.load(sys.stdin)
if data.get('hits', {}).get('hits'):
    meta = data['hits']['hits'][0]['_source']['_unified_generation_metadata']
    print('✅ Performance Metadata Found:')
    print(f'  - template_execution_time_ms: {meta.get(\"template_execution_time_ms\", \"MISSING\")}')
    print(f'  - field_generation_method: {meta.get(\"field_generation_method\", \"MISSING\")}')
    print(f'  - token_usage_estimated: {meta.get(\"token_usage_estimated\", \"MISSING\")}')
    print(f'  - field_count_generated: {meta.get(\"field_count_generated\", \"MISSING\")}')
    print(f'  - cli_options_used: {meta.get(\"cli_options_used\", \"MISSING\")}')
    print(f'  - performance_mode: {meta.get(\"performance_mode\", \"MISSING\")}')
    
    # Validation checks
    issues = []
    if meta.get('field_generation_method') != 'template_based':
        issues.append('field_generation_method should be \"template_based\"')
    if not isinstance(meta.get('field_count_generated'), int) or meta.get('field_count_generated') < 40:
        issues.append('field_count_generated should be around 50')
    if not isinstance(meta.get('token_usage_estimated'), int):
        issues.append('token_usage_estimated should be numeric')
    if meta.get('performance_mode') != False:
        issues.append('performance_mode should be False')
        
    if issues:
        print('❌ Issues found:')
        for issue in issues:
            print(f'  - {issue}')
    else:
        print('✅ All metadata fields are valid!')
else:
    print('❌ No alerts found')
"

# Test field categories metadata
curl -u "elastic:changeme" -s -X GET "localhost:9200/.alerts-security.alerts-metadata-categories/_search?size=1&_source=_unified_generation_metadata" | python3 -c "
import sys, json
data = json.load(sys.stdin)
if data.get('hits', {}).get('hits'):
    meta = data['hits']['hits'][0]['_source']['_unified_generation_metadata']
    cli_options = meta.get('cli_options_used', [])
    print(f'CLI Options Used: {cli_options}')
    if 'multi_field' in cli_options and 'field_categories' in cli_options:
        print('✅ CLI options correctly track field categories usage')
    else:
        print('❌ CLI options should include both \"multi_field\" and \"field_categories\"')
else:
    print('❌ No alerts found')
"

# Count total fields to validate field generation
curl -u "elastic:changeme" -s -X GET "localhost:9200/.alerts-security.alerts-metadata-basic/_search?size=1" | python3 -c "
import sys, json
data = json.load(sys.stdin)
if data.get('hits', {}).get('hits'):
    source = data['hits']['hits'][0]['_source']
    total_fields = len(source.keys())
    meta_field_count = source.get('_unified_generation_metadata', {}).get('field_count_generated', 0)
    print(f'Total fields in document: {total_fields}')
    print(f'Metadata reported field count: {meta_field_count}')
    if total_fields >= 50:  # Base fields + multi-field additions
        print('✅ Field count matches expectations')
    else:
        print('❌ Field count lower than expected')
else:
    print('❌ No alerts found')
"
```

Expected Results:

✅ **Performance Metadata Fields Present:**
- `template_execution_time_ms`: Should be 0-100 (low because of caching)
- `field_generation_method`: Should be "template_based" 
- `token_usage_estimated`: Should be ~25 for 50 fields (0.5 tokens per field estimate)
- `field_count_generated`: Should match the --field-count parameter
- `cli_options_used`: Should include "multi_field" and "field_categories" when applicable
- `performance_mode`: Should be false

✅ **Field Count Validation:**
- Basic test: ~65+ total fields (15 base fields + 50 multi-fields)
- Categories test: ~115+ total fields (15 base fields + 100 multi-fields)

✅ **Performance Benchmarks:**
- Template execution should be < 100ms (cached template performance)
- Token usage should be < 0.5 tokens per generated field
- No AI calls should be made (template-based generation only)

KQL Queries for Kibana UI Testing:
```kql
# Validate performance metadata exists
_unified_generation_metadata.field_generation_method: "template_based" AND kibana.space_ids: "metadata*"

# Check field count accuracy  
_unified_generation_metadata.field_count_generated: [40 TO 120] AND kibana.space_ids: "metadata*"

# Validate CLI option tracking
_unified_generation_metadata.cli_options_used: "field_categories" AND kibana.space_ids: "metadata-categories"

# Performance threshold validation
_unified_generation_metadata.template_execution_time_ms: [0 TO 100] AND kibana.space_ids: "metadata*"
```

---
✅ Success Criteria Summary

Performance Metrics:

- Alert generation time: < 2000ms per alert (down from 5000-8000ms)
- Token usage: < 500 tokens per alert (down from 2500+ tokens)  
- Field generation: Template-based (0 token cost for multi-field)
- Memory usage: Stable with proper cleanup

Functionality Validation:

- All CLI commands work without errors
- Themed data appears correctly in Kibana
- Multi-field generation creates expected field counts
- Visual Event Analyzer shows process correlations
- Rule-alert coordination works correctly
- AI4SOC platform integration creates proper indices
- Campaign generation shows temporal progression
- Error handling maintains system stability

Data Quality:

- All required ECS fields present
- MITRE data structured correctly
- Process hierarchies display in Visual Event Analyzer
- Integration metadata properly formatted
- Performance metadata tracks architecture usage

Kibana Integration:

- Alerts appear in Security → Alerts
- Process events visible in Visual Event Analyzer  
- Detection rules coordinate with alerts
- Dashboard visualizations show performance gains
- All KQL queries return expected results

This E2E test plan provides concrete commands to run and specific results to verify in Kibana, ensuring the two-stage architecture migration was 
successful and provides the expected performance and functionality improvements.